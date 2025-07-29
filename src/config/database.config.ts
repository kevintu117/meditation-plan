import { registerAs } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';

export default registerAs(
  'database',
  (): TypeOrmModuleOptions => ({
    type: 'mysql',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT, 10) || 3306,
    username: process.env.DB_USERNAME || 'meditation_user',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_DATABASE || 'meditation_db',
    charset: process.env.DB_CHARSET || 'utf8mb4',
    timezone: process.env.DB_TIMEZONE || '+08:00',
    synchronize: process.env.NODE_ENV === 'development', // 只在開發環境自動同步
    logging: process.env.NODE_ENV === 'development',
    entities: [__dirname + '/../**/*.entity{.ts,.js}'],
    migrations: [__dirname + '/../migrations/*{.ts,.js}'],
    migrationsRun: false,
    migrationsTableName: 'migrations',
    retryAttempts: 3,
    retryDelay: 3000,
    maxQueryExecutionTime: 10000,
  }),
);