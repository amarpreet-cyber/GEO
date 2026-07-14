/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // Bundle the pipeline data (read at runtime via fs) into every serverless
    // function so the dashboard has its data on Vercel. (Top-level in Next 15;
    // under `experimental` in Next 14.)
    outputFileTracingIncludes: {
      "/**": ["./data/**/*"],
    },
  },
  // Never let the CDN (Firebase Hosting / Fastly) cache app HTML — otherwise a
  // deploy's new UI is masked by a stale cached page (Next's default is
  // s-maxage=1yr on static routes), and cached responses also strip Set-Cookie.
  // Content-hashed assets under _next/static keep their immutable caching.
  async headers() {
    return [
      {
        source: "/((?!_next/static|_next/image).*)",
        headers: [{ key: "Cache-Control", value: "no-store, must-revalidate" }],
      },
    ];
  },
};

export default nextConfig;
