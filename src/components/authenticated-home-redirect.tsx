'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getAccessToken } from '@/lib/api';

export function AuthenticatedHomeRedirect() {
  const router = useRouter();

  useEffect(() => {
    if (!getAccessToken()) return;

    let destination = '/app/onboarding';
    try {
      const savedUser = window.localStorage.getItem('rmh.user');
      if (savedUser && JSON.parse(savedUser).onboardingCompleted === true) {
        destination = '/app';
      }
    } catch {
      window.localStorage.removeItem('rmh.user');
    }
    router.replace(destination);
  }, [router]);

  return null;
}
