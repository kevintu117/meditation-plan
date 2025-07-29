import { registerAs } from '@nestjs/config';

export default registerAs('rateLimit', () => ({
  ttl: parseInt(process.env.RATE_LIMIT_TTL, 10) || 60,
  limit: parseInt(process.env.RATE_LIMIT_MAX, 10) || 100,
}));