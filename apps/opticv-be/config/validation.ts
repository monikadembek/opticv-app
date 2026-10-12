import * as Joi from 'joi';

export const validationSchema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'staging', 'production'),
  PORT: Joi.number().default(3000),
  DATABASE_URL: Joi.string().uri().required(),
  DIRECT_URL: Joi.string().uri().required(),
  SUPABASE_URL: Joi.string().uri().required(),
  SUPABASE_PUBLISHABLE_KEY: Joi.string().required(),
  SUPABASE_WEBHOOK_SECRET: Joi.string().required(),
  SUPABASE_SERVICE_ROLE_KEY: Joi.string().required(),
  R2_ACCOUNT_ID: Joi.string().required(),
  R2_ACCESS_KEY_ID: Joi.string().required(),
  R2_SECRET_ACCESS_KEY: Joi.string().required(),
  R2_BUCKET_NAME: Joi.string().required(),
  R2_PUBLIC_URL: Joi.string().uri().required(),
  OPENAI_API_KEY: Joi.string().required(),
  REDIS_HOST: Joi.string().required(),
  REDIS_PORT: Joi.number().default(6379),
  REDIS_PASSWORD: Joi.string().optional(),
  REDIS_TLS: Joi.boolean().default(false),
  BULLMQ_CONCURRENCY: Joi.number().default(5),
  BULLMQ_STALLED_INTERVAL: Joi.number().integer().positive().default(300000),
  BULLMQ_DRAIN_DELAY: Joi.number().integer().positive().default(60),
  BULLMQ_REMOVE_ON_COMPLETE_AGE: Joi.number()
    .integer()
    .positive()
    .default(3600),
  BULLMQ_REMOVE_ON_COMPLETE_COUNT: Joi.number()
    .integer()
    .positive()
    .default(100),
  BULLMQ_REMOVE_ON_FAIL_AGE: Joi.number().integer().positive().default(604800),
  FRONTEND_URL: Joi.string().uri().required(),
  STRIPE_SECRET_KEY: Joi.string().required(),
  STRIPE_WEBHOOK_SECRET: Joi.string().required(),
  STRIPE_PRICE_BASIC: Joi.string().required(),
  STRIPE_PRICE_PRO: Joi.string().required(),
  THROTTLER_API_IP_TTL: Joi.number().default(900),
  THROTTLER_API_IP_LIMIT: Joi.number().default(300),
  THROTTLER_API_USER_TTL: Joi.number().default(900),
  THROTTLER_API_USER_LIMIT: Joi.number().default(100),
  THROTTLER_AI_IP_TTL: Joi.number().default(3600),
  THROTTLER_AI_IP_LIMIT: Joi.number().default(50),
  THROTTLER_AI_USER_TTL: Joi.number().default(3600),
  THROTTLER_AI_USER_LIMIT: Joi.number().default(10),
  THROTTLER_STORAGE: Joi.string().valid('memory', 'redis').default('memory'),
});
