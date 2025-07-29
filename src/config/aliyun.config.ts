import { registerAs } from '@nestjs/config';

export default registerAs('aliyun', () => ({
  oss: {
    region: process.env.ALIYUN_OSS_REGION || 'oss-cn-hangzhou',
    accessKeyId: process.env.ALIYUN_ACCESS_KEY_ID || '',
    accessKeySecret: process.env.ALIYUN_ACCESS_KEY_SECRET || '',
    bucket: process.env.ALIYUN_OSS_BUCKET || 'meditation-videos',
    endpoint: process.env.ALIYUN_OSS_ENDPOINT || 'https://oss-cn-hangzhou.aliyuncs.com',
    internalEndpoint: process.env.ALIYUN_OSS_INTERNAL_ENDPOINT || 'https://oss-cn-hangzhou-internal.aliyuncs.com',
    cdnUrl: process.env.ALIYUN_OSS_CDN_URL || 'https://videos.meditation.com',
  },
  sts: {
    roleArn: process.env.ALIYUN_STS_ROLE_ARN || 'acs:ram::1234567890:role/meditation-oss-role',
    roleSessionName: process.env.ALIYUN_STS_ROLE_SESSION_NAME || 'meditation-api',
    durationSeconds: parseInt(process.env.ALIYUN_STS_DURATION_SECONDS, 10) || 3600,
  },
}));