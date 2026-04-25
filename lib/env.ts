import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  DIRECT_URL: z.string().optional(),
  NEXTAUTH_SECRET: z.string().min(1),
  NEXTAUTH_URL: z.string().url(),
  SLACK_SIGNING_SECRET: z.string().min(1),
  SLACK_STATE_SECRET: z.string().min(1),
  ENCRYPTION_KEY: z.string().min(32),
  NEXT_PUBLIC_APP_URL: z.string().url(),
  SLACK_CLIENT_ID: z.string().optional(),
  SLACK_CLIENT_SECRET: z.string().optional(),
  RESEND_API_KEY: z.string().optional(),
  REDIS_URL: z.string().optional(),
});

const result = envSchema.safeParse(process.env);

if (!result.success) {
  const message = result.error.issues
    .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
    .join("\n");
  throw new Error(`Invalid environment variables:\n${message}`);
}

export const env = result.data;
