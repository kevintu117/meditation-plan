import { registerAs } from '@nestjs/config';

export default registerAs('jwt', () => ({
  secret: process.env.JWT_SECRET || 'your-super-secret-jwt-key',
  signOptions: {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },
  refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
}));