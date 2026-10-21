'use client';

/**
 * Admin login page. Separate admin JWT authority — the user
 * (customer/technician/merchant) auth surface is never used here.
 */

import { color, radius, spacing, typography } from '@khabir/ui-tokens';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { IconAlert, IconClipboard, IconShieldCheck, IconUsers } from '@/components/icon';
import { btnBase } from '@/components/ui';
import { AdminApi, AdminApiError } from '@/lib/admin-api';


export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const submit = () => {
    if (submitting) return;
    if (email.trim().length === 0 || password.length === 0) {
      setError('أدخل البريد الإلكتروني وكلمة المرور');
      return;
    }
    setSubmitting(true);
    setError(null);
    void AdminApi.login(email.trim(), password)
      .then(() => {
        router.push('/dashboard');
      })
      .catch((err: unknown) => {
        if (err instanceof AdminApiError) setError(err.messageAr);
        else setError(AdminApi.LOGIN_FALLBACK_AR);
        setSubmitting(false);
      });
  };

  return (
    <main
      dir="rtl"
      className="login-page"
      style={{
        minHeight: '100svh',
        boxSizing: 'border-box',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: color.surface.subtle,
        padding: `clamp(${spacing[4]}px, 4vw, ${spacing[12]}px)`,
      }}
    >
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: spacing[12], width: '100%', maxWidth: 1080 }}>
      <section
        className="login-context"
        aria-labelledby="login-context-title"
        style={{ flex: '1 1 380px', minWidth: 0, color: color.brand.navy }}
      >
        <p style={{ margin: `0 0 ${spacing[5]}px`, fontSize: typography.size.h3, fontWeight: Number(typography.weight.bold) }}>
          الخبير / إدارة العمليات
        </p>
        <span aria-hidden="true" style={{ display: 'block', width: spacing[12], height: spacing[1], backgroundColor: color.brand.gold, borderRadius: radius.pill }} />
        <h2 id="login-context-title" style={{ margin: `${spacing[5]}px 0 ${spacing[3]}px`, fontSize: `clamp(${typography.size.h2}px, 3vw, ${typography.size.display}px)`, lineHeight: 1.5, fontWeight: Number(typography.weight.bold) }}>
          رؤية أوضح،<br />وقرارات بثقة.
        </h2>
        <p style={{ margin: 0, maxWidth: 440, fontSize: typography.size.body, lineHeight: 1.9, color: color.text.secondary }}>
          مساحة عمل موحّدة لمتابعة الطلبات، مراجعة الحسابات، وإدارة تفاصيل الخدمة اليومية.
        </p>
        <ul style={{ listStyle: 'none', padding: 0, margin: `${spacing[8]}px 0 0`, display: 'grid', gap: spacing[5] }}>
          {[
            { Icon: IconClipboard, title: 'متابعة سير العمل', description: 'الطلبات والخدمات في مكان واحد.' },
            { Icon: IconUsers, title: 'إدارة الحسابات', description: 'مراجعة العملاء والفنيين والتجار.' },
            { Icon: IconShieldCheck, title: 'وصول مخصص للإدارة', description: 'استخدم حساب الإدارة المصرّح لك به.' },
          ].map(({ Icon, title, description }) => (
            <li key={title} style={{ display: 'flex', alignItems: 'center', gap: spacing[3] }}>
              <span aria-hidden="true" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: spacing[12], height: spacing[12], flexShrink: 0, backgroundColor: color.surface.base, border: `1px solid ${color.border.default}`, borderRadius: radius.md }}>
                <Icon size={22} />
              </span>
              <div>
                <div style={{ fontWeight: Number(typography.weight.semibold), lineHeight: 1.7 }}>{title}</div>
                <p style={{ margin: 0, fontSize: typography.size.caption, color: color.text.secondary, lineHeight: 1.7 }}>{description}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>
      <section
        className="login-card card-enter"
        aria-labelledby="login-title"
        style={{
          backgroundColor: color.surface.base,
          borderRadius: radius.lg,
          padding: `clamp(${spacing[5]}px, 4vw, ${spacing[10]}px)`,
          flex: '1 1 360px',
          minWidth: 0,
          boxSizing: 'border-box',
          maxWidth: '100%',
          border: `1px solid ${color.border.default}`,
          boxShadow: `0 4px 24px rgba(11, 31, 58, 0.1)`,
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: spacing[3],
            marginBottom: spacing[2],
          }}
        >
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 52,
              height: 52,
              borderRadius: radius.md,
              backgroundColor: color.brand.navy,
              color: color.brand.gold,
            }}
          >
            <IconShieldCheck size={28} />
          </span>
          <div style={{ textAlign: 'center' }}>
            <h1
              id="login-title"
              style={{
                fontSize: 22,
                margin: 0,
                color: color.text.primary,
                fontWeight: Number(typography.weight.semibold) as 600,
              }}
            >
              الخبير — لوحة الإدارة
            </h1>
            <p style={{ color: color.text.secondary, fontSize: 13.5, margin: `${spacing[1]}px 0 0` }}>
              سجّل الدخول بحساب الإدارة
            </p>
          </div>
        </div>
        <form
          noValidate
          aria-labelledby="login-title"
          aria-busy={submitting}
          onSubmit={(event) => {
            event.preventDefault();
            submit();
          }}
          style={{ marginTop: spacing[5] }}
        >
          <label htmlFor="admin-email" style={labelStyle}>
            البريد الإلكتروني
          </label>
          <input
            id="admin-email"
            type="email"
            dir="ltr"
            autoComplete="username"
            required
            aria-required="true"
            aria-invalid={error !== null || undefined}
            aria-describedby={error !== null ? 'admin-login-error' : undefined}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={inputStyle}
          />
          <label htmlFor="admin-password" style={labelStyle}>
            كلمة المرور
          </label>
          <input
            id="admin-password"
            type="password"
            dir="ltr"
            autoComplete="current-password"
            required
            aria-required="true"
            aria-invalid={error !== null || undefined}
            aria-describedby={error !== null ? 'admin-login-error' : undefined}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={inputStyle}
          />
          {error !== null ? (
            <div
              id="admin-login-error"
              role="alert"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: spacing[2],
                color: color.error.DEFAULT,
                fontSize: 13,
                marginTop: spacing[3],
                backgroundColor: color.error.soft,
                border: `1px solid #F3C4C4`,
                borderRadius: radius.sm,
                padding: `8px ${spacing[3]}`,
              }}
            >
              <IconAlert size={15} />
              {error}
            </div>
          ) : null}
          <button
            type="submit"
            className="solid-btn"
            disabled={submitting}
            aria-busy={submitting}
            style={{
              ...btnBase,
              width: '100%',
              marginTop: spacing[4],
              padding: '12px 0',
              backgroundColor: color.brand.navy,
              color: '#fff',
              border: 'none',
              borderRadius: radius.sm,
              fontSize: 15,
              fontWeight: Number(typography.weight.medium) as 500,
              fontFamily: 'inherit',
              cursor: submitting ? 'not-allowed' : 'pointer',
              opacity: submitting ? 0.6 : 1,
              transition: 'opacity 0.15s ease',
            }}
          >
            {submitting ? 'جارٍ الدخول…' : 'تسجيل الدخول'}
          </button>
        </form>
      </section>
      </div>
    </main>
  );
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 13,
  color: color.text.primary,
  marginBottom: 4,
  marginTop: spacing[3],
  fontWeight: 500,
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  boxSizing: 'border-box',
  padding: '10px 12px',
  border: `1px solid ${color.border.default}`,
  borderRadius: radius.sm,
  fontSize: 14,
  fontFamily: 'inherit',
  backgroundColor: color.surface.base,
  transition: 'border-color 0.15s ease',
};
