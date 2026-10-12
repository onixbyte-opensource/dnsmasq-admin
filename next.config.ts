import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // The root route only ever forwards to /records, so it is handled at the routing layer
  // instead of by a page component that calls redirect() during render. Rendering first used
  // to make Next try to validate the redirect target during prerender and report a stray
  // NEXT_REDIRECT error, even though the 307 itself was served correctly.
  async redirects() {
    return [{ source: "/", destination: "/records", permanent: false }]
  },
  experimental: {
    agentFeedback: true,
  },
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
