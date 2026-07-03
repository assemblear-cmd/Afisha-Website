import { z } from 'zod';

export const EVENT_COVER_UPLOAD_PREFIX = '/uploads/events/';

const LOCAL_EVENT_COVER_RE = /^\/uploads\/events\/[A-Za-z0-9._-]+\.(?:jpg|jpeg|png|webp|gif)$/i;

function isHttpImageUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

export function isEventCoverPath(value: string): boolean {
  return LOCAL_EVENT_COVER_RE.test(value);
}

export const coverImageSchema = z
  .string()
  .trim()
  .refine(
    (value) => value === '' || isHttpImageUrl(value) || isEventCoverPath(value),
    'Enter a valid image URL or upload a poster image.'
  )
  .optional();
