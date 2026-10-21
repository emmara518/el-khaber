import { formatArDate, formatArTime } from '../../../lib/api-format';

export const PREFERRED_APPOINTMENT_MAX_DAYS = 14;
export const PREFERRED_APPOINTMENT_DAY_COUNT = 14;

export type PreferredPeriodId = 'morning' | 'afternoon' | 'evening';

export interface PreferredPeriod {
  readonly id: PreferredPeriodId;
  readonly labelAr: string;
  readonly startHour: number;
}

export const PREFERRED_PERIODS: ReadonlyArray<PreferredPeriod> = [
  { id: 'morning', labelAr: 'صباحًا · ٩:٠٠ – ١٢:٠٠', startHour: 9 },
  { id: 'afternoon', labelAr: 'ظهرًا · ١٢:٠٠ – ٤:٠٠', startHour: 12 },
  { id: 'evening', labelAr: 'مساءً · ٤:٠٠ – ٨:٠٠', startHour: 16 },
];

export interface PreferredDayOption {
  readonly id: string;
  readonly relativeAr: string;
  readonly dateAr: string;
}

function pad(value: number): string {
  return value < 10 ? `0${value}` : String(value);
}

export function localDayId(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function formatWeekdayAr(date: Date): string {
  try {
    return new Intl.DateTimeFormat('ar-EG', { weekday: 'long' }).format(date);
  } catch {
    return '';
  }
}

export function preferredAppointmentDays(
  now: Date = new Date(),
  count: number = PREFERRED_APPOINTMENT_DAY_COUNT,
): ReadonlyArray<PreferredDayOption> {
  const days: PreferredDayOption[] = [];
  for (let index = 0; index < count; index += 1) {
    const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() + index);
    const weekday = formatWeekdayAr(date);
    days.push({
      id: localDayId(date),
      relativeAr: index === 0 ? 'اليوم' : index === 1 ? 'غدًا' : weekday,
      dateAr: formatArDate(date.toISOString()),
    });
  }
  return days;
}

export function composePreferredAtISO(dayId: string, periodId: PreferredPeriodId): string | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dayId);
  const period = PREFERRED_PERIODS.find((p) => p.id === periodId);
  if (match === null || period === undefined) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return null;
  const date = new Date(year, month - 1, day, period.startHour, 0, 0, 0);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export function preferredDayIdFromISO(iso: string | null): string | null {
  if (iso === null) return null;
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? null : localDayId(date);
}

export function preferredPeriodIdFromISO(iso: string | null): PreferredPeriodId | null {
  if (iso === null) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  const found = PREFERRED_PERIODS.find((p) => p.startHour === date.getHours());
  return found?.id ?? null;
}

export function formatPreferredAppointmentAr(iso: string): string {
  return `${formatArDate(iso)} · ${formatArTime(iso)}`;
}

export function preferredAppointmentError(
  iso: string | null,
  now: Date = new Date(),
): string | null {
  if (iso === null) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return 'الموعد المفضل غير صالح. اختر موعدًا آخر.';
  const at = date.getTime();
  if (at <= now.getTime()) return 'الوقت المحدد مضى. اختر موعدًا قادمًا.';
  const horizon = PREFERRED_APPOINTMENT_MAX_DAYS * 24 * 60 * 60 * 1000;
  if (at > now.getTime() + horizon) {
    return `يمكن اختيار موعد مفضل خلال ${PREFERRED_APPOINTMENT_MAX_DAYS} يومًا كحد أقصى.`;
  }
  return null;
}
