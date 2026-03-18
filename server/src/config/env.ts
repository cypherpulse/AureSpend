import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(4000),
  MONGODB_URI: z.string().min(1),
  CORS_ORIGIN: z.string().default("http://localhost:8080"),
  REDIS_URL: z.string().default("redis://127.0.0.1:6379"),
  QUEUE_PREFIX: z.string().default("aurespend"),

  SERVER_STACKS_ADDRESS: z.string().min(1),
  KES_PER_USDCX: z.coerce.number().positive().default(129.5),

  ENABLE_STACKS_MOCK: z
    .string()
    .optional()
    .transform((val) => val !== "false"),
  STACKS_NETWORK: z.enum(["mainnet", "testnet"]).default("testnet"),
  STACKS_NODE_URL: z.string().url().default("https://api.testnet.hiro.so"),
  STACKS_VAULT_CONTRACT: z.string().min(1),
  STACKS_USDCX_TOKEN: z.string().min(1),
  STACKS_OPERATOR_PRIVATE_KEY: z.string().optional(),

  ENABLE_DARAJA_MOCK: z
    .string()
    .optional()
    .transform((val) => val !== "false"),
  DARAJA_CONSUMER_KEY: z.string().optional(),
  DARAJA_CONSUMER_SECRET: z.string().optional(),
  DARAJA_SHORTCODE: z.string().optional(),
  DARAJA_PASSKEY: z.string().optional(),
  DARAJA_CALLBACK_URL: z.string().url().optional(),
  DARAJA_INITIATOR_NAME: z.string().optional(),
  DARAJA_SECURITY_CREDENTIAL: z.string().optional(),
  DARAJA_B2C_RESULT_URL: z.string().url().optional(),
  DARAJA_B2C_TIMEOUT_URL: z.string().url().optional(),
  DARAJA_BASE_URL: z
    .enum(["sandbox", "production"])
    .default("sandbox")
    .transform((v) =>
      v === "sandbox"
        ? "https://sandbox.safaricom.co.ke"
        : "https://api.safaricom.co.ke"
    ),

  INTERNAL_WEBHOOK_TOKEN: z.string().min(6).default("change-me")
});

export const env = envSchema.parse(process.env);
