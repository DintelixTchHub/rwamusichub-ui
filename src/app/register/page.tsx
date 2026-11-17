'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormEvent, useState } from 'react';
import { ArrowLeft, ArrowRight, Check } from 'lucide-react';
import { Brand } from '@/components/brand';
import { Notice } from '@/components/notice';
import { api } from '@/lib/api';

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({ fullName: '', username: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      await api('/auth/register', { method: 'POST', body: JSON.stringify(form) });
      router.push(`/verify-email?email=${encodeURIComponent(form.email.trim())}`);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to create your account.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="page-shell grid min-h-screen lg:grid-cols-[0.9fr_1.1fr]">
      <aside className="relative hidden flex-col justify-between overflow-hidden bg-[#173b30] p-12 text-white lg:flex">
        <div className="absolute -left-28 bottom-5 h-96 w-96 rounded-full bg-lime/15 blur-3xl" />
        <Brand light />
        <div className="relative max-w-lg"><p className="eyebrow !text-lime">Your journey, your sound</p><h1 className="mt-5 text-5xl font-black leading-tight tracking-tight">There&apos;s a place for your talent here.</h1><p className="mt-5 text-lg leading-8 text-white/70">Join a growing network built around Rwanda&apos;s artists, music businesses and the people who bring it all to life.</p></div>
        <div className="relative space-y-3 text-sm text-white/75"><p className="flex items-center gap-3"><Check size={17} className="text-lime" /> Create a profile that showcases your work</p><p className="flex items-center gap-3"><Check size={17} className="text-lime" /> Connect with Rwanda&apos;s music community</p><p className="flex items-center gap-3"><Check size={17} className="text-lime" /> Find your next gig or collaborator</p></div>
      </aside>
      <section className="flex flex-col px-6 py-7 md:px-12">
        <div className="lg:hidden"><Brand /></div>
        <div className="mx-auto my-auto w-full max-w-md py-12">
          <Link href="/" className="mb-8 inline-flex items-center gap-2 text-sm font-semibold text-muted"><ArrowLeft size={16} /> Back to home</Link>
          <p className="eyebrow">Join the hub</p><h2 className="mt-2 text-3xl font-black tracking-tight">Create your account</h2><p className="mt-2 text-sm text-muted">Start building the connections behind your music career.</p>
          <form onSubmit={submit} className="mt-7 space-y-4">
            {error && <Notice>{error}</Notice>}
            {error && form.email && <Link href={`/verify-email?email=${encodeURIComponent(form.email.trim())}`} className="block text-sm font-bold text-forest underline">Already registered? Enter or request a verification code</Link>}
            <label className="block text-sm font-bold">Full name<input required autoComplete="name" className="field mt-2" placeholder="Your name" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} /></label>
            <label className="block text-sm font-bold">Username<input required minLength={3} autoComplete="username" className="field mt-2" placeholder="yourartistname" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} /></label>
            <label className="block text-sm font-bold">Email address<input required type="email" autoComplete="email" className="field mt-2" placeholder="you@example.com" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></label>
            <label className="block text-sm font-bold">Password<input required minLength={8} type="password" autoComplete="new-password" className="field mt-2" placeholder="At least 8 characters" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></label>
            <button disabled={busy} className="btn-primary w-full py-3">{busy ? 'Creating account…' : 'Create my account'} <ArrowRight size={16} /></button>
          </form>
          <p className="mt-6 text-center text-sm text-muted">Already have an account? <Link href="/login" className="font-bold text-forest">Sign in</Link></p>
          <p className="mt-6 text-center text-[11px] leading-5 text-muted">By joining, you agree to use the hub respectfully and professionally.</p>
        </div>
      </section>
    </main>
  );
}
