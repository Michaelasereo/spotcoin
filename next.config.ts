import type { NextConfig } from "next";

const apiOrigin = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

const nextConfig: NextConfig = {
  async headers() {
    const csp = [
      "default-src 'self'",
      `connect-src 'self' ${apiOrigin}`,
      "img-src 'self' https://*.slack-edge.com https://*.slack.com data:",
      "style-src 'self' 'unsafe-inline'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "font-src 'self' data:",
      "frame-ancestors 'none'",
    ].join("; ");

    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Content-Security-Policy",
            value: csp,
          },
        ],
      },
    ];
  },
};

export default nextConfig;
