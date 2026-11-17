'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { Brand } from '@/components/brand';
import { Notice } from '@/components/notice';
import { api, persistUser, saveSession } from '@/lib/api';

type LoginResponse = { accessToken: string; refreshToken: string; user: { id: string; fullName: string; username: string; email: string; onboardingCompleted: boolean } };

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [emailVerified, setEmailVerified] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setEmailVerified(new URLSearchParams(window.location.search).get('verified') === '1');
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const result = await api<LoginResponse>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      saveSession(result.accessToken, result.refreshToken);
      persistUser(result.user);
      router.replace(result.user.onboardingCompleted ? '/app' : '/app/onboarding');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to sign in.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="page-shell grid min-h-screen lg:grid-cols-[1fr_0.9fr]">
      <section className="flex flex-col px-6 py-7 md:px-12">
        <Brand />
        <div className="mx-auto my-auto w-full max-w-md py-14">
          <Link href="/" className="mb-8 inline-flex items-center gap-2 text-sm font-semibold text-muted"><ArrowLeft size={16} /> Back to home</Link>
          <p className="eyebrow">Welcome back</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight">Your music community is waiting.</h1>
          <p className="mt-2 text-sm text-muted">Sign in to pick up where you left off.</p>
          <form onSubmit={submit} className="mt-8 space-y-4">
            {emailVerified && <Notice kind="success">Email verified. Sign in to continue to onboarding.</Notice>}
            {error && <Notice>{error}</Notice>}
            <label className="block text-sm font-bold">Email address<input required type="email" autoComplete="email" className="field mt-2" placeholder="you@example.com" value={email} onChange={(event) => setEmail(event.target.value)} /></label>
            <label className="block text-sm font-bold">Password<input required type="password" autoComplete="current-password" className="field mt-2" placeholder="Your password" value={password} onChange={(event) => setPassword(event.target.value)} /></label>
            <div className="text-right text-sm"><Link href={`/forgot-password${email ? `?email=${encodeURIComponent(email)}` : ''}`} className="font-bold text-forest">Forgot password?</Link></div>
            <button disabled={busy} className="btn-primary w-full py-3">{busy ? 'Signing in…' : 'Sign in'} <ArrowRight size={16} /></button>
          </form>
          <p className="mt-6 text-center text-sm text-muted">New to the hub? <Link href="/register" className="font-bold text-forest">Create an account</Link></p>
        </div>
        <p className="text-xs text-muted">©  · Powered by DCINTELIX</p>
      </section>
      <aside className="relative hidden overflow-hidden bg-forest p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="absolute -right-24 -top-24 h-96 w-96 rounded-full bg-lime/15 blur-3xl" />
        <div className="relative max-w-lg pt-16"><p className="eyebrow !text-lime">Connect · Create · Grow</p><h2 className="mt-5 text-5xl font-black leading-tight tracking-tight">Make your next move in music.</h2><p className="mt-5 text-lg leading-8 text-white/70">Find the people, projects and paid work that help you take your career further.</p></div>
        <div className="relative rounded-3xl border border-white/15 bg-white/10 p-6 backdrop-blur"><p className="text-lg font-bold">“The right collaboration can change everything.”</p><p className="mt-2 text-sm text-white/60">Your next connection could be one conversation away.</p></div>
      </aside>
    </main>
  );
}
