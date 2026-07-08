'use client';

import { useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import clsx from 'clsx';

type LikeButtonProps = {
  /** Like target in mobile wire-id form: "event_<id>" | "show_<id>". */
  targetKey: string;
  initialLiked: boolean;
  signedIn: boolean;
  /** "overlay" renders a white heart for use over images; "ink" for plain backgrounds. */
  tone?: 'overlay' | 'ink';
  /** Positioning only — the heart color is controlled by `tone`/liked state. */
  className?: string;
  iconSize?: number;
};

// Instagram-style heart: transparent outline that fills red once liked.
// Likes are account-scoped, so anonymous visitors are sent to /login and
// bounced back to the page they were on.
export function LikeButton({
  targetKey,
  initialLiked,
  signedIn,
  tone = 'overlay',
  className,
  iconSize = 22,
}: LikeButtonProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [liked, setLiked] = useState(initialLiked);
  const [busy, setBusy] = useState(false);

  async function toggle(event: React.MouseEvent<HTMLButtonElement>) {
    // Cards render the heart on top of a link — the click must not navigate.
    event.preventDefault();
    event.stopPropagation();

    if (!signedIn) {
      router.push(`/login?redirect=${encodeURIComponent(pathname)}`);
      return;
    }
    if (busy) return;

    const next = !liked;
    setLiked(next);
    setBusy(true);
    try {
      const res = await fetch('/api/v1/me/likes', {
        method: next ? 'POST' : 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: targetKey }),
      });
      if (!res.ok) throw new Error(`Like toggle failed: ${res.status}`);
      // Keep server-rendered liked state (e.g. the Saved list) in sync.
      router.refresh();
    } catch {
      setLiked(!next);
    } finally {
      setBusy(false);
    }
  }

  const label = liked ? 'Remove from saved' : 'Save';

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={liked}
      aria-label={label}
      title={label}
      className={clsx(
        'inline-flex items-center justify-center rounded-full p-1.5 transition hover:scale-110',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-coral',
        liked ? 'text-red-500' : tone === 'overlay' ? 'text-white' : 'text-ink dark:text-white',
        className
      )}
    >
      <svg
        width={iconSize}
        height={iconSize}
        viewBox="0 0 24 24"
        fill={liked ? 'currentColor' : 'none'}
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
        className={clsx(tone === 'overlay' && !liked && 'drop-shadow')}
      >
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
      </svg>
    </button>
  );
}
