export const configuration = () => ({
  nodeEnv: process.env.NODE_ENV,
  port: parseInt(process.env.PORT || '3000', 10),
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
