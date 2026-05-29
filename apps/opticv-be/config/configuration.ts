export const configuration = () => ({
  nodeEnv: process.env.NODE_ENV,
  port: parseInt(process.env.PORT || '3000', 10),
  supabase: {
    url: process.env.SUPABASE_URL,
    publishableKey: process.env.SUPABASE_PUBLISHABLE_KEY,
    webhookSecret: process.env.SUPABASE_WEBHOOK_SECRET,
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  },
  r2: {
    accountId: process.env.R2_ACCOUNT_ID,
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    bucketName: process.env.R2_BUCKET_NAME,
    publicUrl: process.env.R2_PUBLIC_URL,
  },
  openai: {
    apiKey: process.env.OPENAI_API_KEY,
  },
  redis: {
    host: process.env.REDIS_HOST,
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD,
    tls: process.env.REDIS_TLS === 'true',
  },
  bullmq: {
    concurrency: parseInt(process.env.BULLMQ_CONCURRENCY || '5', 10),
  },
  frontendUrl: process.env.FRONTEND_URL,
  throttler: {
    apiIpTtl: parseInt(process.env.THROTTLER_API_IP_TTL || '900', 10),
    apiIpLimit: parseInt(process.env.THROTTLER_API_IP_LIMIT || '300', 10),
    apiUserTtl: parseInt(process.env.THROTTLER_API_USER_TTL || '900', 10),
    apiUserLimit: parseInt(process.env.THROTTLER_API_USER_LIMIT || '100', 10),
    aiIpTtl: parseInt(process.env.THROTTLER_AI_IP_TTL || '3600', 10),
    aiIpLimit: parseInt(process.env.THROTTLER_AI_IP_LIMIT || '50', 10),
    aiUserTtl: parseInt(process.env.THROTTLER_AI_USER_TTL || '3600', 10),
    aiUserLimit: parseInt(process.env.THROTTLER_AI_USER_LIMIT || '10', 10),
  },
});
