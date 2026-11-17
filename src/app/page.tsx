import Link from 'next/link';
import { ArrowDownRight, ArrowRight, AudioLines, Guitar, Mic2, Sparkles, UsersRound } from 'lucide-react';
import { Brand } from '@/components/brand';

const pillars = [
  { icon: UsersRound, title: 'Find your people', copy: 'Meet artists, bands and industry professionals who understand your sound.' },
  { icon: Mic2, title: 'Get discovered', copy: 'Build a portfolio that puts your skills and work in front of the right audience.' },
  { icon: Guitar, title: 'Find your next gig', copy: 'Explore auditions, bookings and paid opportunities across Rwanda.' },
];

export default function LandingPage() {
  return (
    <main className="page-shell overflow-hidden">
      <header className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-5 sm:py-5 md:px-10">
        <Brand />
        <nav className="hidden items-center gap-8 text-sm font-semibold text-muted lg:flex">
          <a href="#how-it-works" className="hover:text-forest">How it works</a>
          <a href="#community" className="hover:text-forest">Our community</a>
          <a href="#opportunities" className="hover:text-forest">Opportunities</a>
        </nav>
        <div className="flex items-center gap-2">
          <Link href="/login" className="inline-flex whitespace-nowrap rounded-xl px-2 py-2 text-xs font-bold text-forest sm:px-4 sm:py-2.5 sm:text-sm">Log in</Link>
          <Link href="/register" className="btn-primary whitespace-nowrap px-3 py-2 text-xs sm:px-4 sm:py-3 sm:text-sm">Join the hub <ArrowRight size={15} /></Link>
        </div>
      </header>

      <section className="mx-auto grid max-w-7xl items-center gap-9 px-4 pb-14 pt-7 sm:gap-12 sm:px-5 sm:pb-20 sm:pt-10 md:grid-cols-[1.05fr_0.95fr] md:px-10 md:pb-28 md:pt-20">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-[#dce7d7] bg-white/80 px-3 py-2 text-xs font-bold text-forest">
            <span className="h-2 w-2 rounded-full bg-[#7bb568]" /> RWANDA&apos;S MUSIC NETWORK
          </div>
          <h1 className="mt-5 max-w-3xl text-[clamp(2rem,8vw,3rem)] font-black leading-[1.06] tracking-[-0.055em] text-ink sm:mt-7 sm:text-5xl lg:text-[4.5rem]">
            Your sound.<br />
            <span className="text-forest">Your people.</span><br />
            Your next big thing.
          </h1>
          <p className="mt-4 max-w-xl text-base leading-7 text-muted sm:mt-6 sm:text-lg sm:leading-8">
            The professional home for Rwanda&apos;s music community. Find collaborators, get booked, and turn your talent into opportunity.
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:mt-8 sm:flex-row sm:flex-wrap">
            <Link href="/register" className="btn-primary w-full px-4 py-3 text-sm sm:w-auto sm:px-6 sm:py-3.5">Create your free profile <ArrowRight size={17} /></Link>
            <Link href="/login" className="btn-secondary w-full px-4 py-3 text-sm sm:w-auto sm:px-6 sm:py-3.5">Explore the hub <ArrowDownRight size={17} /></Link>
          </div>
          <div className="mt-7 flex items-center gap-3 sm:mt-10 sm:gap-4">
            <div className="flex -space-x-2">
              {['bg-[#e6bca5]', 'bg-[#c6d9aa]', 'bg-[#d6c6e8]', 'bg-[#e7d28f]'].map((color, i) => <span key={color} className={`grid h-9 w-9 place-items-center rounded-full border-2 border-canvas ${color} text-xs font-bold text-ink`}>{['A', 'J', 'M', 'K'][i]}</span>)}
            </div>
            <p className="text-sm text-muted"><strong className="text-ink">Made for every role</strong><br />artists · bands · studios · organizers</p>
          </div>
        </div>

        <div className="relative mx-auto w-full max-w-[540px]">
          <div className="absolute -right-4 -top-5 h-32 w-32 rounded-full bg-lime/50 blur-3xl sm:-right-7 sm:-top-10 sm:h-48 sm:w-48" />
          <div className="relative rounded-[1.5rem] bg-forest p-3.5 shadow-soft sm:rounded-[2rem] sm:p-5 md:p-7">
            <div className="absolute right-5 top-5 grid h-11 w-11 place-items-center rounded-xl bg-lime text-forest sm:right-8 sm:top-8 sm:h-14 sm:w-14 sm:rounded-2xl"><AudioLines size={24} /></div>
            <div className="min-h-[350px] overflow-hidden rounded-[1.15rem] bg-[#dbe7db] p-4 sm:min-h-[400px] sm:rounded-[1.4rem] sm:p-5 md:min-h-[470px] md:p-7">
              <div className="flex items-start justify-between">
                <div><p className="eyebrow">Artist spotlight</p><p className="mt-2 text-sm text-muted">Kigali · Producer & keys</p></div>
                <span className="rounded-full bg-white px-3 py-1 text-[11px] font-bold text-forest">AVAILABLE</span>
              </div>
              <div className="mt-7 flex h-40 items-end overflow-hidden rounded-[1.2rem] bg-gradient-to-br from-[#a2b998] via-[#d4c199] to-[#e6a783] p-4 sm:mt-10 sm:h-48 sm:p-5">
                <div className="h-40 w-32 rounded-t-full bg-[#31443a]/75" />
                <div className="ml-[-12px] h-52 w-40 rounded-t-full bg-[#50614a]/80" />
                <div className="ml-auto self-start rounded-xl bg-white/80 p-2 text-xs font-bold text-forest">Featured musician ↗</div>
              </div>
              <h2 className="mt-4 text-xl font-black tracking-tight sm:mt-5 sm:text-2xl">Create your next<br />collaboration.</h2>
              <p className="mt-2 max-w-xs text-sm leading-6 text-muted">A space for local talent to connect, grow and find meaningful work.</p>
              <div className="mt-6 flex items-center justify-between border-t border-[#c7d4c8] pt-4">
                <div className="flex gap-5 text-xs font-bold text-muted"><span>♫ 12 skills</span><span>◉ Kigali</span></div>
                <span className="grid h-9 w-9 place-items-center rounded-full bg-white text-forest"><ArrowRight size={17} /></span>
              </div>
            </div>
          </div>
          <div className="absolute -bottom-5 -left-7 hidden rounded-2xl border border-line bg-white p-4 shadow-soft sm:block">
            <p className="text-xs font-bold text-muted">COMMUNITY FIRST</p><p className="mt-1 text-sm font-extrabold">Powered by local talent ✦</p>
          </div>
        </div>
      </section>

      <section id="how-it-works" className="mx-auto max-w-7xl px-4 pb-14 sm:px-5 sm:pb-20 md:px-10 md:pb-28">
        <div className="mb-7 flex flex-wrap items-end justify-between gap-4 sm:mb-9 sm:gap-5">
          <div><p className="eyebrow">Made for the music industry</p><h2 className="mt-3 text-[clamp(1.55rem,6vw,2rem)] font-black tracking-tight sm:text-3xl lg:text-4xl">More than a profile.<br className="sm:hidden" /> A platform to move you forward.</h2></div>
          <p className="max-w-sm text-sm leading-6 text-muted">From your first collaboration to your next booking, find the tools and people to make it happen.</p>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {pillars.map(({ icon: Icon, title, copy }, index) => (
            <article key={title} className="card p-5 sm:p-6 md:p-7">
              <span className={`grid h-11 w-11 place-items-center rounded-2xl ${index === 1 ? 'bg-lime text-forest' : 'bg-[#edf4eb] text-forest'}`}><Icon size={21} /></span>
              <p className="mt-7 text-xs font-bold text-[#88a195]">0{index + 1}</p>
              <h3 className="mt-2 text-xl font-extrabold">{title}</h3>
              <p className="mt-2 text-sm leading-6 text-muted">{copy}</p>
            </article>
          ))}
        </div>
      </section>
      <section id="community" className="mx-4 mb-8 overflow-hidden rounded-[1.5rem] bg-forest px-5 py-8 text-white sm:mx-5 sm:mb-10 sm:rounded-[2rem] sm:px-6 sm:py-12 md:mx-auto md:max-w-7xl md:px-12 md:py-16">
        <div className="grid items-center gap-6 sm:gap-8 md:grid-cols-[1fr_auto]">
          <div><div className="flex items-center gap-2 text-lime"><Sparkles size={16} /><span className="eyebrow !text-lime">The next chapter starts here</span></div><h2 className="mt-4 max-w-2xl text-[clamp(1.55rem,6vw,2rem)] font-black tracking-tight sm:text-3xl lg:text-4xl">Build your music career with a community behind you.</h2><p className="mt-3 max-w-xl text-sm leading-6 text-white/70">A platform created for the people shaping Rwanda&apos;s sound.</p></div>
          <Link href="/register" className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-lime px-5 py-3 text-sm font-extrabold text-forest sm:w-auto">Join Rwanda Music Hub <ArrowRight size={17} /></Link>
        </div>
      </section>
      <footer className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-3 px-4 py-6 text-xs text-muted sm:flex-row sm:flex-wrap sm:items-center sm:px-5 sm:py-7 md:px-10"><Brand /><p>© 2026 Rwanda Music Hub · Powered by DCINTELIX</p><a id="opportunities" href="/register" className="font-bold text-forest">Find an opportunity →</a></footer>
    </main>
  );
}
