'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useState } from 'react';
import { ArrowLeft, ArrowRight, KeyRound } from 'lucide-react';
import { Brand } from '@/components/brand';
import { Notice } from '@/components/notice';
import { api } from '@/lib/api';

export default function ResetPasswordPage() {
  const [token, setToken] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setToken(new URLSearchParams(window.location.search).get('token') ?? '');
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setBusy(true);
    try {
      await api('/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({ token, password }),
      });
      setSuccess(true);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to reset your password.');
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
          <KeyRound size={26} />
        </span>
        <p className="eyebrow mt-6">Account recovery</p>
        <h1 className="mt-2 text-3xl font-black tracking-tight">{success ? 'Password updated' : 'Choose a new password'}</h1>
        <p className="mt-2 text-sm leading-6 text-muted">
          {success ? 'Your password has been changed. Sign in with your new password.' : 'Choose a strong password with at least 8 characters.'}
        </p>
        {success ? (
          <Link href="/login" className="btn-primary mt-7 w-full py-3">Go to sign in <ArrowRight size={16} /></Link>
        ) : token ? (
          <form onSubmit={submit} className="mt-7 space-y-4">
            {error && <Notice>{error}</Notice>}
            <label className="block text-sm font-bold">
              New password
              <input required minLength={8} type="password" autoComplete="new-password" className="field mt-2" value={password} onChange={(event) => setPassword(event.target.value)} />
            </label>
            <label className="block text-sm font-bold">
              Confirm new password
              <input required minLength={8} type="password" autoComplete="new-password" className="field mt-2" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} />
            </label>
            <button disabled={busy} className="btn-primary w-full py-3">
              {busy ? 'Updating password…' : 'Reset password'} <ArrowRight size={16} />
            </button>
          </form>
        ) : (
          <div className="mt-7 space-y-4">
            <Notice>The password reset link is missing or invalid. Request a new one to continue.</Notice>
            <Link href="/forgot-password" className="btn-primary w-full py-3">Request a reset link <ArrowRight size={16} /></Link>
          </div>
        )}
      </section>
      <p className="text-center text-xs text-muted">© Rwanda Music Hub · Powered by DCINTELIX</p>
    </main>
  );
}
