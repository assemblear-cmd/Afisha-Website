import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  InstagramApiError,
  isInstagramConfigured,
  postInstagramStory,
  readInstagramConfig,
  type InstagramConfig,
} from '@/lib/promotion/instagram';

const CONFIG: InstagramConfig = {
  accessToken: 'tok-123',
  businessAccountId: '17841400000000000',
  version: 'v21.0',
};

function jsonResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: () => Promise.resolve(JSON.stringify(body)),
  } as Response;
}

afterEach(() => {
  vi.unstubAllGlobals();
  delete process.env.INSTAGRAM_ACCESS_TOKEN;
  delete process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID;
});

describe('readInstagramConfig / isInstagramConfigured', () => {
  it('returns null when env is missing', () => {
    expect(readInstagramConfig()).toBeNull();
    expect(isInstagramConfigured()).toBe(false);
  });

  it('reads token, account id, and default version', () => {
    process.env.INSTAGRAM_ACCESS_TOKEN = 'abc';
    process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID = '999';
    expect(readInstagramConfig()).toEqual({ accessToken: 'abc', businessAccountId: '999', version: 'v21.0' });
    expect(isInstagramConfigured()).toBe(true);
  });
});

describe('postInstagramStory', () => {
  it('creates a STORIES container then publishes it, returning the media id', async () => {
    const calls: { url: string; body: Record<string, string> }[] = [];
    const fetchImpl = vi.fn(async (url: string, init?: RequestInit) => {
      const body = Object.fromEntries((init?.body as URLSearchParams | undefined) ?? new URLSearchParams());
      calls.push({ url: String(url), body });
      if (String(url).includes('/media_publish')) return jsonResponse({ id: 'media-999' });
      if (String(url).includes('/media')) return jsonResponse({ id: 'container-123' });
      // status poll
      return jsonResponse({ status_code: 'FINISHED' });
    }) as unknown as typeof fetch;

    const result = await postInstagramStory('https://dondego.cl/img.png', CONFIG, fetchImpl);
    expect(result.mediaId).toBe('media-999');
    expect(result.containerId).toBe('container-123');

    const create = calls.find((c) => c.url.endsWith('/media'));
    expect(create?.url).toBe('https://graph.facebook.com/v21.0/17841400000000000/media');
    expect(create?.body).toMatchObject({
      media_type: 'STORIES',
      image_url: 'https://dondego.cl/img.png',
      access_token: 'tok-123',
    });

    const publish = calls.find((c) => c.url.includes('/media_publish'));
    expect(publish?.body).toMatchObject({ creation_id: 'container-123', access_token: 'tok-123' });
  });

  it('throws InstagramApiError with the Graph error message on failure', async () => {
    const fetchImpl = vi.fn(async () =>
      jsonResponse({ error: { message: 'Invalid OAuth access token' } }, 400)
    ) as unknown as typeof fetch;

    await expect(postInstagramStory('https://dondego.cl/img.png', CONFIG, fetchImpl)).rejects.toMatchObject({
      name: 'InstagramApiError',
      status: 400,
      message: 'Invalid OAuth access token',
    });
  });

  it('surfaces a container ERROR status before publishing', async () => {
    const fetchImpl = vi.fn(async (url: string) => {
      if (String(url).includes('status_code')) return jsonResponse({ status_code: 'ERROR' });
      return jsonResponse({ id: 'container-123' });
    }) as unknown as typeof fetch;

    await expect(postInstagramStory('https://dondego.cl/img.png', CONFIG, fetchImpl)).rejects.toBeInstanceOf(
      InstagramApiError
    );
  });
});
