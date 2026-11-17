import Link from 'next/link';
import Image from 'next/image';

export function Brand({ light = false, href = '/' }: { light?: boolean; href?: string }) {
  return (
    <Link href={href} aria-label="Rwanda Music Hub home" className="flex shrink-0 items-center">
      <Image
        src="/rwanda-music-hub-logo.png"
        alt="Rwanda Music Hub Connect, Collaborate, Grow"
        width={1077}
        height={398}
        unoptimized
        className={`h-12 w-auto sm:h-14 ${light ? 'brightness-0 invert' : ''}`}
      />
    </Link>
  );
}
