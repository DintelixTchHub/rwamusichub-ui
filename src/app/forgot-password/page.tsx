'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useState } from 'react';
import { ArrowLeft, ArrowRight, MailCheck } from 'lucide-react';
import { Brand } from '@/components/brand';
import { Notice } from '@/components/notice';
import { api } from '@/lib/api';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setEmail(new URLSearchParams(window.location.search).get('email') ?? '');
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError('');
    setSent(false);
    try {
      await api('/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email }),
      });
      setSent(true);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to request a password reset.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="page-shell flex min-h-screen flex-col px-6 py-7 md:px-12">
      <Brand />
      <section className="card mx-auto my-auto w-full max-w-md p-8 md:p-10">
        <Link href="/login" className="mb-8 inline-flex items-center gap-2 text-sm font-semibold text-muted">
          <ArrowLeft size={16} /> Back to sign in
        </Link>
        <span className="grid h-14 w-14 place-items-center rounded-2xl bg-[#edf4eb] text-forest">
          <MailCheck size={26} />
        </span>
        <p className="eyebrow mt-6">Account recovery</p>
        <h1 className="mt-2 text-3xl font-black tracking-tight">Forgot your password?</h1>
        <p className="mt-2 text-sm leading-6 text-muted">Enter the email address on your account. If it is registered, we’ll send a reset link.</p>
        <form onSubmit={submit} className="mt-7 space-y-4">
          {error && <Notice>{error}</Notice>}
          {sent && <Notice kind="success">If an account exists for this address, a password reset link is on its way. Check your inbox.</Notice>}
          <label className="block text-sm font-bold">
            Email address
            <input required type="email" autoComplete="email" className="field mt-2" placeholder="you@example.com" value={email} onChange={(event) => setEmail(event.target.value)} />
          </label>
          <button disabled={busy} className="btn-primary w-full py-3">
            {busy ? 'Sending…' : 'Send reset link'} <ArrowRight size={16} />
          </button>
        </form>
      </section>
      <p className="text-center text-xs text-muted">© Rwanda Music Hub · Powered by DCINTELIX</p>
    </main>
  );
}
