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
};

export default nextConfig;
