import { PlatformShell } from '@/components/platform-shell';
import type { ReactNode } from 'react';

export default function AppLayout({ children }: Readonly<{ children: ReactNode }>) {
  return <PlatformShell>{children}</PlatformShell>;
}
