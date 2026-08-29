"use client";

import { useEffect, useRef, useState, type MouseEvent, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";

const NAVIGATION_DELAY = 280;
const ENTER_DURATION = 480;

export function PageTransition({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const enterTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasMountedRef = useRef(false);
  const [isNavigating, setIsNavigating] = useState(false);
  const [isEntering, setIsEntering] = useState(false);

  useEffect(() => {
    if (!hasMountedRef.current) {
      hasMountedRef.current = true;
      return;
    }

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setIsNavigating(false);
    setIsEntering(true);
    enterTimeoutRef.current = setTimeout(() => {
      setIsEntering(false);
      enterTimeoutRef.current = null;
    }, ENTER_DURATION);
  }, [pathname]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (enterTimeoutRef.current) {
        clearTimeout(enterTimeoutRef.current);
      }
    };
  }, []);

  function handleClick(event: MouseEvent<HTMLDivElement>) {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
      return;
    }

    const anchor = event.target instanceof Element
      ? event.target.closest("a[href]") as HTMLAnchorElement | null
      : null;

    if (!anchor || anchor.target === "_blank" || anchor.hasAttribute("download")) {
      return;
    }

    const destination = new URL(anchor.href, window.location.href);
    const current = new URL(window.location.href);

    if (destination.origin !== current.origin || (destination.pathname === current.pathname && destination.search === current.search)) {
      return;
    }

    event.preventDefault();
    setIsNavigating(true);
    setIsEntering(false);
    timeoutRef.current = setTimeout(() => {
      router.push(`${destination.pathname}${destination.search}${destination.hash}`);
    }, NAVIGATION_DELAY);
  }

  return (
    <div className={`transition-shell${isNavigating ? " is-navigating" : ""}${isEntering ? " is-entering" : ""}`} aria-busy={isNavigating} onClick={handleClick}>
      {children}
      <div className={`page-transition${isNavigating ? " is-visible" : ""}`} aria-hidden="true" />
    </div>
  );
}
