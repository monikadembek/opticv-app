import * as Joi from 'joi';

export const validationSchema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'production'),
  PORT: Joi.number().default(3000),
  SUPABASE_URL: Joi.string().uri().required(),
  SUPABASE_PUBLISHABLE_KEY: Joi.string().required(),
  SUPABASE_WEBHOOK_SECRET: Joi.string().required(),
  R2_ACCOUNT_ID: Joi.string().required(),
  R2_ACCESS_KEY_ID: Joi.string().required(),
  R2_SECRET_ACCESS_KEY: Joi.string().required(),
  R2_BUCKET_NAME: Joi.string().required(),
  R2_PUBLIC_URL: Joi.string().uri().required(),
});
