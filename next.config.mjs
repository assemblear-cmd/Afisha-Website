// Baseline security headers applied to every response. These are safe defaults
// that do not restrict scripts (so Next.js hydration and the inline theme-init
// script keep working); a full script-src CSP with nonces is a follow-up. The
// CSP here still blocks framing, plugin/object embedding and <base> hijacking.
const securityHeaders = [
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload',
  },
  {
    key: 'Permissions-Policy',
    // The web scanner uses the camera (same-origin); microphone/geolocation are
    // not used and are denied outright.
    value: 'camera=(self), microphone=(), geolocation=()',
  },
  {
    key: 'Content-Security-Policy',
    value: "frame-ancestors 'none'; object-src 'none'; base-uri 'self'",
  },
];

const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'picsum.photos' },
      { protocol: 'https', hostname: 'fastly.picsum.photos' },
    ],
  },
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }];
  },
};

export default nextConfig;
