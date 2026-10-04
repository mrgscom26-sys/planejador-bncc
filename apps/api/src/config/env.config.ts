import { z } from 'zod';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load .env file if available
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const envSchema = z.object({
  PORT: z.coerce.number().default(3001),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must have at least 32 characters'),
  COOKIE_SECRET: z.string().min(16, 'COOKIE_SECRET must have at least 16 characters'),
  REFRESH_TOKEN_EXPIRES_IN_HOURS: z.coerce.number().default(8),
  ACCESS_TOKEN_EXPIRES_IN_MINUTES: z.coerce.number().default(15),
  COOKIE_SECURE: z.preprocess((val) => val === 'true' || val === true, z.boolean().default(false)),
  N8N_WEBHOOK_URL: z.string().default('http://localhost:5678/webhook/planejador-bncc'),
  N8N_API_KEY: z.string().default('chave-api-local-n8n'),
  N8N_TIMEOUT_MS: z.coerce.number().default(45000),
  N8N_MOCK_ENABLED: z.preprocess((val) => val === 'true' || val === true, z.boolean().default(true)),
  DEMO_PASSWORD_ANA: z.string().default('demo123'),
  DEMO_PASSWORD_MARCOS: z.string().default('demo123'),
});

export type EnvConfig = z.infer<typeof envSchema>;

let parsedEnv: EnvConfig;

export function getEnv(): EnvConfig {
  if (!parsedEnv) {
    const result = envSchema.safeParse(process.env);
    if (!result.success) {
      const issues = result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join(', ');
      throw new Error(`Environment validation error: ${issues}`);
    }
    parsedEnv = result.data;
  }
  return parsedEnv;
}

export const env = getEnv();
