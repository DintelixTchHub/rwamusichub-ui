import Link from 'next/link';
import { AudioLines } from 'lucide-react';

export function Brand({ light = false }: { light?: boolean }) {
  return (
    <Link href="/" className="flex items-center gap-3">
      <span className="grid h-10 w-10 place-items-center rounded-2xl bg-lime text-forest">
        <AudioLines size={22} strokeWidth={2.5} />
      </span>
      <span className={`text-sm font-extrabold leading-tight ${light ? 'text-white' : 'text-ink'}`}>
        RWANDA<br />MUSIC HUB
      </span>
    </Link>
  );
}
