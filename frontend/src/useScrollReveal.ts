/**
 * useScrollReveal — Intersection Observer hook
 * Adds .is-visible to elements with .scroll-reveal / .scroll-reveal-left / etc.
 * when they enter the viewport.
 */
import { useEffect, useRef } from 'react';

interface UseScrollRevealOptions {
  threshold?: number;
  rootMargin?: string;
  once?: boolean;
}

export function useScrollReveal(options: UseScrollRevealOptions = {}) {
  const { threshold = 0.12, rootMargin = '0px 0px -40px 0px', once = true } = options;
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    const targets = document.querySelectorAll<HTMLElement>(
      '.scroll-reveal, .scroll-reveal-left, .scroll-reveal-right, .scroll-reveal-scale',
    );

    if (!targets.length) return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            if (once) observerRef.current?.unobserve(entry.target);
          } else if (!once) {
            entry.target.classList.remove('is-visible');
          }
        });
      },
      { threshold, rootMargin },
    );

    targets.forEach((el) => observerRef.current?.observe(el));

    return () => observerRef.current?.disconnect();
  });
}
