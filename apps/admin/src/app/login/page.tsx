'use client';

/**
 * Admin login page (Task 10K). Separate admin JWT authority — the user
 * (customer/technician/merchant) auth surface is never used here.
 */

import { useRouter } from 'next/navigation';
import { useState } from 'react';

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
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f4f6f9',
      }}
    >
      <div
        style={{
          backgroundColor: '#fff',
          borderRadius: 12,
          padding: 32,
          width: 380,
          boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
        }}
      >
        <h1 style={{ fontSize: 22, margin: 0, color: '#12284a' }}>الخبير — لوحة الإدارة</h1>
        <p style={{ color: '#667', fontSize: 14, marginTop: 4 }}>سجّل الدخول بحساب الإدارة</p>
        <div style={{ marginTop: 20 }}>
          <label htmlFor="admin-email" style={labelStyle}>
            البريد الإلكتروني
          </label>
          <input
            id="admin-email"
            type="email"
            dir="ltr"
            autoComplete="username"
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
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') submit();
            }}
            style={inputStyle}
          />
          {error !== null ? (
            <div role="alert" style={{ color: '#c0392b', fontSize: 13, marginTop: 8 }}>
              {error}
            </div>
          ) : null}
          <button
            type="button"
            onClick={submit}
            disabled={submitting}
            style={{
              ...buttonStyle,
              opacity: submitting ? 0.6 : 1,
            }}
          >
            {submitting ? '...جارٍ الدخول' : 'تسجيل الدخول'}
          </button>
        </div>
      </div>
    </main>
  );
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 13,
  color: '#334',
  marginBottom: 4,
  marginTop: 14,
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  boxSizing: 'border-box',
  padding: '10px 12px',
  border: '1px solid #ccd3dd',
  borderRadius: 8,
  fontSize: 14,
};

const buttonStyle: React.CSSProperties = {
  width: '100%',
  marginTop: 18,
  padding: '12px 0',
  backgroundColor: '#12284a',
  color: '#fff',
  border: 'none',
  borderRadius: 8,
  fontSize: 15,
  cursor: 'pointer',
};
