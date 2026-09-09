import { z } from "zod";

const bool = z
  .enum(["true", "false"])
  .default("false")
  .transform((v) => v === "true");

const schema = z.object({
  DATABASE_URL: z.string().min(1),
  APP_URL: z.string().url().default("http://localhost:3000"),
  SESSION_SECRET: z.string().min(32),
  JOB_TOKEN: z.string().min(1),

  SALESFORCE_ENABLED: bool,
  SALESFORCE_LOGIN_URL: z.string().url().default("https://login.salesforce.com"),
  SALESFORCE_CLIENT_ID: z.string().default(""),
  SALESFORCE_CLIENT_SECRET: z.string().default(""),
  SALESFORCE_API_VERSION: z.string().default("v62.0"),

  WISE_ENABLED: bool,
  WISE_API_URL: z.string().url().default("https://api.sandbox.transferwise.tech"),
  WISE_API_TOKEN: z.string().default(""),
  WISE_PROFILE_ID: z.string().default(""),
  WISE_SCA_PRIVATE_KEY: z.string().default(""),
  WISE_WEBHOOK_PUBLIC_KEY: z.string().default(""),

  SPEAKEASY_ENABLED: bool,
  SPEAKEASY_API_URL: z.string().url().default("https://api.speakeasygo.com"),
  SPEAKEASY_API_KEY: z.string().default(""),
  SPEAKEASY_VENUE_ID: z.string().default(""),
  SPEAKEASY_WEBHOOK_SECRET: z.string().default(""),

  RESEND_API_KEY: z.string().default(""),
  EMAIL_FROM: z.string().default("Off Grid <info@offgridrace.com>"),
});

export type Env = z.infer<typeof schema>;

let cached: Env | null = null;

export function env(): Env {
  if (cached) return cached;
  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `${i.path.join(".")}: ${i.message}`)
      .join("; ");
    throw new Error(`Invalid environment configuration — ${issues}`);
  }
  cached = parsed.data;
  return cached;
}

/** Test helper: drop the memoised environment so process.env changes take effect. */
export function resetEnvCache(): void {
  cached = null;
}
