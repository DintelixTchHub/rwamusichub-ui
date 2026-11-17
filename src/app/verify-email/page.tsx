'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useState } from 'react';
import { ArrowRight, CheckCircle2, MailCheck } from 'lucide-react';
import { Brand } from '@/components/brand';
import { Notice } from '@/components/notice';
import { api } from '@/lib/api';

export default function VerifyEmailPage() {
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [busy, setBusy] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendSeconds, setResendSeconds] = useState(60);
  const [notice, setNotice] = useState<{ message: string; success: boolean } | null>(null);

  useEffect(() => {
    setEmail(new URLSearchParams(window.location.search).get('email') ?? '');
  }, []);

  useEffect(() => {
    if (resendSeconds === 0) return;

    const timer = window.setTimeout(() => {
      setResendSeconds((seconds) => Math.max(0, seconds - 1));
    }, 1000);

    return () => window.clearTimeout(timer);
  }, [resendSeconds]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError('');
    setNotice(null);
    try {
      await api('/auth/verify-email', {
        method: 'POST',
        body: JSON.stringify({ email, otp }),
      });
      setSuccess(true);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'We could not verify this email address.');
    } finally {
      setBusy(false);
    }
  }

  async function resendCode() {
    setResending(true);
    setError('');
    setNotice(null);
    try {
      await api('/auth/resend-verification', {
        method: 'POST',
        body: JSON.stringify({ email }),
      });
      setOtp('');
      setResendSeconds(60);
      setNotice({ message: 'A new verification code has been sent to your registered email address.', success: true });
    } catch (reason) {
      setNotice({
        message: reason instanceof Error ? reason.message : 'We could not send a new verification code.',
        success: false,
      });
    } finally {
      setResending(false);
    }
  }

  return (
    <main className="page-shell flex min-h-screen flex-col px-6 py-7 md:px-12">
      <Brand />
      <section className="card mx-auto my-auto w-full max-w-lg p-8 text-center md:p-10">
        <span className={`mx-auto grid h-16 w-16 place-items-center rounded-2xl ${success ? 'bg-emerald-50 text-emerald-700' : 'bg-[#edf4eb] text-forest'}`}>
          {success ? <CheckCircle2 size={30} /> : <MailCheck size={28} />}
        </span>
        <p className="eyebrow mt-6">Account verification</p>
        <h1 className="mt-2 text-2xl font-black">{success ? 'You’re all set' : 'Verify your email'}</h1>
        <p className="mt-3 text-sm leading-6 text-muted">
          {success
            ? 'Your email is verified. You can now sign in and get started.'
            : 'Enter the six-digit code we sent to your email. It expires in 5 minutes. You can request a new code after 1 minute.'}
        </p>
        {!success && (
          <form onSubmit={submit} className="mt-7 space-y-4 text-left">
            {error && <Notice>{error}</Notice>}
            {notice && <Notice kind={notice.success ? 'success' : 'error'}>{notice.message}</Notice>}
            <label className="block text-sm font-bold">
              Email address
              <input required type="email" autoComplete="email" className="field mt-2" value={email} onChange={(event) => setEmail(event.target.value)} />
            </label>
            <label className="block text-sm font-bold">
              Verification code
              <input
                required
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="[0-9]{6}"
                maxLength={6}
                className="field mt-2 text-center text-2xl font-black tracking-[0.5em]"
                placeholder="000000"
                value={otp}
                onChange={(event) => setOtp(event.target.value.replace(/\D/g, '').slice(0, 6))}
              />
            </label>
            <button disabled={busy || email.length === 0 || otp.length !== 6} className="btn-primary w-full py-3">
              {busy ? 'Verifying…' : 'Verify email'} <ArrowRight size={16} />
            </button>
            <button type="button" disabled={resending || busy || !email || resendSeconds > 0} onClick={resendCode} className="btn-secondary w-full py-3">
              {resending
                ? 'Sending code…'
                : resendSeconds > 0
                  ? `Resend code in 0:${String(resendSeconds).padStart(2, '0')}`
                  : 'Resend code'}
            </button>
          </form>
        )}
        {success && <Link href="/login" className="btn-primary mt-6">Go to sign in <ArrowRight size={16} /></Link>}
        {!success && <Link href="/register" className="mt-5 inline-block text-sm font-bold text-forest">Return to registration</Link>}
      </section>
      <p className="text-center text-xs text-muted">© Rwanda Music Hub · Powered by DCINTELIX</p>
    </main>
  );
}
