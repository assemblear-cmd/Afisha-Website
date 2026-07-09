// Instagram Graph API client for Story content-publishing. This is the
// sanctioned server-side path (Business/Creator account) — no browser
// automation, no ToS-evading "human simulation".
//
// Flow (image stories):
//   1. POST /{ig-user-id}/media   media_type=STORIES, image_url=<public url>
//        → returns a media container id
//   2. (poll) GET /{container-id}?fields=status_code until FINISHED
//   3. POST /{ig-user-id}/media_publish   creation_id=<container id>
//        → returns the published media id
//
// The image_url MUST be publicly reachable — Instagram fetches it server-side
// (that is why the story image is a public route, not an upload).
//
// Config (env; never commit real values):
//   INSTAGRAM_ACCESS_TOKEN         long-lived token with instagram_content_publish
//   INSTAGRAM_BUSINESS_ACCOUNT_ID  the IG user id (Business/Creator account)
//   INSTAGRAM_GRAPH_VERSION        optional, default v21.0

const GRAPH_HOST = 'https://graph.facebook.com';

export type InstagramConfig = {
  accessToken: string;
  businessAccountId: string;
  version: string;
};

export function readInstagramConfig(): InstagramConfig | null {
  const accessToken = process.env.INSTAGRAM_ACCESS_TOKEN;
  const businessAccountId = process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID;
  if (!accessToken || !businessAccountId) return null;
  return {
    accessToken,
    businessAccountId,
    version: process.env.INSTAGRAM_GRAPH_VERSION || 'v21.0',
  };
}

export function isInstagramConfigured(): boolean {
  return readInstagramConfig() !== null;
}

export class InstagramApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly detail?: unknown
  ) {
    super(message);
    this.name = 'InstagramApiError';
  }
}

type GraphFetch = typeof fetch;

async function graphRequest(
  config: InstagramConfig,
  pathAndQuery: string,
  init: { method: 'GET' | 'POST'; body?: Record<string, string> },
  fetchImpl: GraphFetch
): Promise<any> {
  const url = `${GRAPH_HOST}/${config.version}/${pathAndQuery}`;
  const res = await fetchImpl(url, {
    method: init.method,
    body: init.body ? new URLSearchParams(init.body) : undefined,
    signal: AbortSignal.timeout(20000),
  });
  const text = await res.text();
  let json: any = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { raw: text };
  }
  if (!res.ok) {
    const message = json?.error?.message ?? `Graph API HTTP ${res.status}`;
    throw new InstagramApiError(message, res.status, json?.error ?? json);
  }
  return json;
}

async function createStoryContainer(
  config: InstagramConfig,
  imageUrl: string,
  fetchImpl: GraphFetch
): Promise<string> {
  const json = await graphRequest(
    config,
    `${config.businessAccountId}/media`,
    { method: 'POST', body: { media_type: 'STORIES', image_url: imageUrl, access_token: config.accessToken } },
    fetchImpl
  );
  if (!json?.id) throw new InstagramApiError('media container response had no id', 502, json);
  return String(json.id);
}

// Containers are usually FINISHED immediately for images, but the API may
// report IN_PROGRESS briefly; publishing an unfinished container errors, so
// poll a few times before giving up.
async function waitForContainerReady(
  config: InstagramConfig,
  containerId: string,
  fetchImpl: GraphFetch,
  attempts = 5,
  delayMs = 2000
): Promise<void> {
  for (let i = 0; i < attempts; i++) {
    const json = await graphRequest(
      config,
      `${containerId}?fields=status_code&access_token=${encodeURIComponent(config.accessToken)}`,
      { method: 'GET' },
      fetchImpl
    );
    const status = json?.status_code;
    if (status === 'FINISHED') return;
    if (status === 'ERROR' || status === 'EXPIRED') {
      throw new InstagramApiError(`media container ${status}`, 502, json);
    }
    if (i < attempts - 1) await new Promise((r) => setTimeout(r, delayMs));
  }
  // Best-effort: fall through to publish even if still IN_PROGRESS — publish
  // will surface a clear error if the container really is not ready.
}

async function publishContainer(
  config: InstagramConfig,
  containerId: string,
  fetchImpl: GraphFetch
): Promise<string> {
  const json = await graphRequest(
    config,
    `${config.businessAccountId}/media_publish`,
    { method: 'POST', body: { creation_id: containerId, access_token: config.accessToken } },
    fetchImpl
  );
  if (!json?.id) throw new InstagramApiError('media_publish response had no id', 502, json);
  return String(json.id);
}

/**
 * Publishes an image Story and returns the published media id. `fetchImpl` is
 * injectable for tests; production uses global fetch.
 */
export async function postInstagramStory(
  imageUrl: string,
  config: InstagramConfig,
  fetchImpl: GraphFetch = fetch
): Promise<{ mediaId: string; containerId: string }> {
  const containerId = await createStoryContainer(config, imageUrl, fetchImpl);
  await waitForContainerReady(config, containerId, fetchImpl);
  const mediaId = await publishContainer(config, containerId, fetchImpl);
  return { mediaId, containerId };
}
