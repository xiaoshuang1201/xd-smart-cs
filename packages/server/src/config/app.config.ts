import { registerAs } from '@nestjs/config';

export const appConfig = registerAs('app', () => ({
  port: parseInt(process.env.APP_PORT || '3100', 10),
  globalPrefix: process.env.APP_GLOBAL_PREFIX || 'api',
  nodeEnv: process.env.NODE_ENV || 'development',
}));

export const databaseConfig = registerAs('database', () => ({
  url: process.env.DATABASE_URL || 'postgresql://xd_user:xd_pass@localhost:5432/xd_smart_cs',
}));

export const redisConfig = registerAs('redis', () => ({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
  password: process.env.REDIS_PASSWORD || '',
  db: parseInt(process.env.REDIS_DB || '0', 10),
}));

export const jwtConfig = registerAs('jwt', () => ({
  secret: process.env.JWT_SECRET || 'default-secret',
  expiresIn: process.env.JWT_EXPIRES_IN || '2h',
  refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
}));

export const difyConfig = registerAs('dify', () => ({
  apiUrl: process.env.DIFY_API_URL || 'http://localhost:5001/v1',
  apiKey: process.env.DIFY_API_KEY || '',
  timeout: parseInt(process.env.DIFY_TIMEOUT || '30000', 10),
}));

export const minioConfig = registerAs('minio', () => ({
  endpoint: process.env.MINIO_ENDPOINT || 'localhost',
  port: parseInt(process.env.MINIO_PORT || '9000', 10),
  accessKey: process.env.MINIO_ACCESS_KEY || 'minioadmin',
  secretKey: process.env.MINIO_SECRET_KEY || 'minioadmin',
  bucket: process.env.MINIO_BUCKET || 'knowledge-docs',
}));

export const deepseekConfig = registerAs('deepseek', () => ({
  apiKey: process.env.DEEPSEEK_API_KEY || '',
  apiUrl: process.env.DEEPSEEK_API_URL || 'https://api.deepseek.com/v1',
  model: process.env.DEEPSEEK_MODEL || 'deepseek-chat',
}));

export const embeddingConfig = registerAs('embedding', () => ({
  url: process.env.BGE_EMBEDDING_URL || 'http://localhost:8000',
  model: process.env.BGE_EMBEDDING_MODEL || 'BAAI/bge-large-zh-v1.5',
}));
