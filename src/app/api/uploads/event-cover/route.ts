import { randomUUID } from 'crypto';
import { mkdir, writeFile } from 'fs/promises';
import path from 'path';
import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { EVENT_COVER_UPLOAD_PREFIX } from '@/lib/cover-image';
import { consumeRateLimit, tooManyRequests } from '@/lib/rate-limit';

export const runtime = 'nodejs';

const MAX_FILE_BYTES = 5 * 1024 * 1024;
const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads', 'events');
const MIME_EXTENSIONS: Record<string, string> = {
  'image/gif': '.gif',
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
};

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
  }
  // Any logged-in user can upload a cover for an event they are creating.

  // Each accepted upload writes up to 5 MB to disk — cap the rate per user.
  const limit = consumeRateLimit('upload_user', user.id);
  if (!limit.ok) return tooManyRequests(limit);

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: 'Invalid upload request.' }, { status: 400 });
  }

  const upload = formData.get('file');
  if (!upload || typeof upload === 'string') {
    return NextResponse.json({ error: 'Choose an image file to upload.' }, { status: 400 });
  }

  const file = upload;
  const extension = MIME_EXTENSIONS[file.type];
  if (!extension) {
    return NextResponse.json({ error: 'Upload a JPG, PNG, WebP, or GIF image.' }, { status: 400 });
  }
  if (file.size <= 0) {
    return NextResponse.json({ error: 'The selected image is empty.' }, { status: 400 });
  }
  if (file.size > MAX_FILE_BYTES) {
    return NextResponse.json({ error: 'Poster image must be 5 MB or smaller.' }, { status: 400 });
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  const filename = `${Date.now()}-${randomUUID()}${extension}`;

  await mkdir(UPLOAD_DIR, { recursive: true });
  await writeFile(path.join(UPLOAD_DIR, filename), bytes);

  return NextResponse.json({ url: `${EVENT_COVER_UPLOAD_PREFIX}${filename}` }, { status: 201 });
}
