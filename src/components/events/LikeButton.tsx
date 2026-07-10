'use client';

import { useState } from 'react';
import clsx from 'clsx';

type LikeButtonProps = {
  /** Mobile wire-id: `event_<id>` for native events, `show_<id>` for scraped shows. */
  targetKey: string;
  initialLiked: boolean;
  likeLabel: string;
  unlikeLabel: string;
  // `plain` sits inline in a list row; `overlay` is a translucent chip that
  // stays legible on top of a cover image.
  variant?: 'plain' | 'overlay';
  className?: string;
};

function HeartIcon({ filled }: { filled: boolean }) {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M12 20.5s-7.5-4.6-7.5-10a4.5 4.5 0 0 1 8.1-2.7l-.6.7.6-.7A4.5 4.5 0 0 1 19.5 10.5c0 5.4-7.5 10-7.5 10Z" />
    </svg>
  );
}

// Desktop like/save control. Signed-out users never see it (callers only
// render it when authenticated), so a click always maps to a real toggle
// against /api/v1/me/likes with optimistic UI and rollback on failure.
export function LikeButton({
  targetKey,
  initialLiked,
  likeLabel,
  unlikeLabel,
  variant = 'plain',
  className,
}: LikeButtonProps) {
  const [liked, setLiked] = useState(initialLiked);
  const [pending, setPending] = useState(false);

  async function toggle(event: React.MouseEvent) {
    // The surrounding card/row is a stretched link; keep the click on the button.
    event.preventDefault();
    event.stopPropagation();
    if (pending) return;

    const next = !liked;
    setLiked(next);
    setPending(true);
    try {
      const res = await fetch('/api/v1/me/likes', {
        method: next ? 'POST' : 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: targetKey }),
      });
      if (!res.ok) throw new Error('like request failed');
    } catch {
      setLiked(!next);
    } finally {
      setPending(false);
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={liked}
      aria-label={liked ? unlikeLabel : likeLabel}
      title={liked ? unlikeLabel : likeLabel}
      className={clsx(
        'z-20 grid h-9 w-9 shrink-0 place-items-center rounded-full transition',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-coral focus-visible:ring-offset-2',
        'dark:focus-visible:ring-offset-neutral-950',
        variant === 'overlay'
          ? clsx(
              'absolute bg-white/85 shadow-sm backdrop-blur-sm hover:bg-white dark:bg-black/45 dark:hover:bg-black/65',
              liked ? 'text-coral' : 'text-[#1E0A3C] hover:text-coral dark:text-white'
            )
          : clsx(
              'relative',
              liked
                ? 'text-coral hover:bg-coral/10'
                : 'text-muted hover:bg-ink/5 hover:text-coral dark:hover:bg-white/10'
            ),
        pending && 'opacity-60',
        className
      )}
    >
      <HeartIcon filled={liked} />
    </button>
  );
}
