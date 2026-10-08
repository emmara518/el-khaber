/**
 * EL-KHABIR — Password Reset Delivery Worker (entrypoint).
 *
 * A private backend relay implementing the application's existing
 * PASSWORD_RESET_DELIVERY contract and routing ONE message per request:
 *   email present  -> Resend transactional email
 *   else phone     -> Twilio Programmable Messaging (SMS)
 *   else           -> generic failure (never reveals account existence)
 *
 * It never logs or persists the raw reset token, the reset link, full email,
 * full phone number, or provider credentials. Failures return a generic
 * non-2xx with no provider detail.
 */

import {
  bearerFrom,
  buildResetLink,
  MAX_BODY_BYTES,
  parseDeliveryRequest,
  routeContact,
  safeEqual,
} from './contract';

export interface Env {
  /** Shared secret required on every request. */
  WORKER_AUTH_TOKEN: string;
  /** Fixed, server-side web origin for reset links (no open redirect). */
  RESET_WEB_ORIGIN?: string;

  /** Resend (email). */
  RESEND_API_KEY?: string;
  RESEND_FROM_EMAIL?: string;

  /** Twilio (SMS). */
  TWILIO_ACCOUNT_SID?: string;
  TWILIO_API_KEY_SID?: string;
  TWILIO_API_KEY_SECRET?: string;
  TWILIO_MESSAGING_SERVICE_SID?: string;
  TWILIO_FROM?: string;
}

const DEFAULT_WEB_ORIGIN = 'https://el-khabir-uat.vercel.app';

// --- Best-effort, per-isolate abuse guard -----------------------------------
// Durable rate limiting requires a KV/DO namespace (new infrastructure) which
// is intentionally NOT added here. This only blunts bursts within one isolate.
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 60;
let windowStart = 0;
let windowCount = 0;

function overBudget(now: number): boolean {
  if (now - windowStart > WINDOW_MS) {
    windowStart = now;
    windowCount = 0;
  }
  windowCount += 1;
  return windowCount > MAX_PER_WINDOW;
}

// --- Response helpers -------------------------------------------------------
const GENERIC_FAIL = { error: 'delivery_failed' } as const;

function json(status: number, body: unknown = GENERIC_FAIL): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

// --- Provider calls ---------------------------------------------------------

function emailHtml(resetLink: string): string {
  return [
    '<div dir="rtl" style="font-family: Arial, sans-serif; text-align: right;">',
    '<h2>الخبير</h2>',
    '<p>لإعادة تعيين كلمة المرور، اضغط الرابط التالي:</p>',
    `<p><a href="${resetLink}">إعادة تعيين كلمة المرور</a></p>`,
    '<p>الرابط صالح لفترة محدودة (٣٠ دقيقة) ويُستخدم مرة واحدة فقط.</p>',
    '<p>إذا لم تطلب إعادة تعيين كلمة المرور، تجاهل هذه الرسالة.</p>',
    '</div>',
  ].join('');
}

function smsBody(resetLink: string): string {
  return (
    'الخبير: لإعادة تعيين كلمة المرور استخدم الرابط التالي: ' +
    resetLink +
    ' الرابط صالح لفترة محدودة. إذا لم تطلب إعادة التعيين فتجاهل الرسالة.'
  );
}

async function sendEmail(env: Env, to: string, resetLink: string): Promise<boolean> {
  if (!env.RESEND_API_KEY || !env.RESEND_FROM_EMAIL) return false;
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${env.RESEND_API_KEY}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      from: env.RESEND_FROM_EMAIL,
      to: [to],
      subject: 'إعادة تعيين كلمة المرور — الخبير',
      html: emailHtml(resetLink),
    }),
  });
  return res.ok; // 2xx only; response body never read/logged
}

async function sendSms(env: Env, to: string, resetLink: string): Promise<boolean> {
  const { TWILIO_ACCOUNT_SID, TWILIO_API_KEY_SID, TWILIO_API_KEY_SECRET } = env;
  if (!TWILIO_ACCOUNT_SID || !TWILIO_API_KEY_SID || !TWILIO_API_KEY_SECRET) return false;

  const params = new URLSearchParams();
  params.set('To', to);
  params.set('Body', smsBody(resetLink));
  if (env.TWILIO_MESSAGING_SERVICE_SID) {
    params.set('MessagingServiceSid', env.TWILIO_MESSAGING_SERVICE_SID);
  } else if (env.TWILIO_FROM) {
    params.set('From', env.TWILIO_FROM);
  } else {
    return false; // no approved sender configured
  }

  const res = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(TWILIO_ACCOUNT_SID)}/Messages.json`,
    {
      method: 'POST',
      headers: {
        authorization: `Basic ${btoa(`${TWILIO_API_KEY_SID}:${TWILIO_API_KEY_SECRET}`)}`,
        'content-type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    },
  );
  return res.status === 201 || (res.status >= 200 && res.status < 300);
}

// --- Entrypoint -------------------------------------------------------------

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname !== '/' && url.pathname !== '') {
      return json(404);
    }
    if (request.method !== 'POST') {
      return json(405);
    }

    const declared = Number(request.headers.get('content-length') ?? '0');
    if (Number.isFinite(declared) && declared > MAX_BODY_BYTES) {
      return json(413);
    }

    const provided = bearerFrom(request.headers.get('authorization'));
    const expected = env.WORKER_AUTH_TOKEN ?? '';
    if (expected.length === 0 || provided === null || !safeEqual(provided, expected)) {
      return json(401);
    }

    if (overBudget(Date.now())) {
      return json(429);
    }

    const raw = await request.text();
    const parsed = parseDeliveryRequest(raw);
    if (!parsed.ok) {
      return json(400);
    }

    const channel = routeContact(parsed.value.contact);
    if (channel === null) {
      // Generic: callback callers never learn why (enumeration-safe upstream).
      return json(400);
    }

    const webOrigin = env.RESET_WEB_ORIGIN ?? DEFAULT_WEB_ORIGIN;
    const resetLink = buildResetLink(webOrigin, parsed.value.token);

    try {
      const delivered =
        channel === 'email'
          ? await sendEmail(env, parsed.value.contact.email as string, resetLink)
          : await sendSms(env, parsed.value.contact.phone as string, resetLink);

      // Sanitized, PII-free, token-free log line.
      console.log(JSON.stringify({ event: 'password_reset_delivery', channel, ok: delivered }));

      return delivered ? json(200, { status: 'accepted' }) : json(502);
    } catch {
      console.log(JSON.stringify({ event: 'password_reset_delivery', channel, ok: false }));
      return json(502);
    }
  },
};
