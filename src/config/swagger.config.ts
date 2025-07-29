import { registerAs } from '@nestjs/config';

export default registerAs('swagger', () => ({
  enabled: process.env.SWAGGER_ENABLED === 'true',
  title: process.env.SWAGGER_TITLE || 'Meditation Platform API',
  description: process.env.SWAGGER_DESCRIPTION || 'API documentation for Meditation Platform',
  version: process.env.SWAGGER_VERSION || '1.0.0',
  path: 'docs',
}));