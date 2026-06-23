/** @type {import('next').NextConfig} */
const nextConfig = {
  // Bundle the pipeline data (read at runtime via fs) into every serverless function
  // so the dashboard has its data on Vercel.
  outputFileTracingIncludes: {
    "/**": ["./data/**/*"],
  },
};

export default nextConfig;
