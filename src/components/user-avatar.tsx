import Image from 'next/image';

export function UserAvatar({
  src,
  name,
  size = 40,
  className = '',
}: {
  src?: string | null;
  name?: string | null;
  size?: number;
  className?: string;
}) {
  const initials = name?.trim().slice(0, 1).toUpperCase() || 'M';
  return (
    <span
      className={`relative inline-grid shrink-0 place-items-center overflow-hidden rounded-full bg-lime font-bold text-forest ${className}`}
      style={{ width: size, height: size }}
      role="img"
      aria-label={name ?? 'User'}
    >
      {src
        ? <Image src={src} alt="" fill sizes={`${size}px`} unoptimized className="object-cover" />
        : initials}
    </span>
  );
}
