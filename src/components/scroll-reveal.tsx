'use client';

import { ReactNode, useEffect, useRef } from 'react';

const REVEAL_TARGETS = 'main > section, main > aside, main > div > section, main > div > aside, .card, article, [data-scroll-reveal]';

export function ScrollReveal({ children }: { children: ReactNode }) {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    if (!('IntersectionObserver' in window)) return;

    let directionIndex = 0;
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        (entry.target as HTMLElement).dataset.scrollState = 'visible';
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -24px 0px' });

    const observeTargets = () => {
      root.querySelectorAll<HTMLElement>(REVEAL_TARGETS).forEach((element) => {
        if (element.dataset.scrollState) return;
        element.dataset.scrollDirection = directionIndex % 2 === 0 ? 'left' : 'right';
        directionIndex += 1;
        element.dataset.scrollState = 'pending';
        observer.observe(element);
      });
    };

    observeTargets();
    const mutations = new MutationObserver(observeTargets);
    mutations.observe(root, { childList: true, subtree: true });

    return () => {
      mutations.disconnect();
      observer.disconnect();
    };
  }, []);

  return <div ref={rootRef} className="scroll-reveal-root">{children}</div>;
}
