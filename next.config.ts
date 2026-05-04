import type { NextConfig } from "next";

const apiOrigin = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

const nextConfig: NextConfig = {
  // Prisma ships platform-specific `.node` query engines under `.prisma/client`. Next file tracing
  // often omits them from the serverless bundle, so Lambda only sees darwin-arm64 → runtime error on Netlify.
  //
  // Do not list @prisma/client in serverExternalPackages here: marking it external can prevent the
  // Netlify/Next serverless zip from copying `.prisma/client` next to the runtime, even with tracing includes.
  outputFileTracingIncludes: {
    "/": ["./node_modules/.prisma/client/**/*"],
    "/*": ["./node_modules/.prisma/client/**/*"],
    "/api/*": ["./node_modules/.prisma/client/**/*"],
    "/admin/*": ["./node_modules/.prisma/client/**/*"],
    "/dashboard/*": ["./node_modules/.prisma/client/**/*"],
  },
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
