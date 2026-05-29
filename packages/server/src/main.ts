// 必须在最前面加载 .env，确保 DEPLOY_MODE 等变量在模块导入前就位
import { config } from 'dotenv';
config({ path: ['.env', '.env.local'] });

import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import compression from 'compression';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const globalPrefix = process.env.APP_GLOBAL_PREFIX || 'api/v1';
  app.setGlobalPrefix(globalPrefix);

  app.use(helmet());
  app.use(compression());

  app.enableCors({
    origin: [
      'http://localhost:3000',
      'http://localhost:3001',
      process.env.CORS_ORIGIN || '',
    ].filter(Boolean),
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  const config = new DocumentBuilder()
    .setTitle('新鼎电炉智能客服系统 API')
    .setDescription('XD-Agent-RAG-2026 接口文档')
    .setVersion('1.0')
    .addBearerAuth()
    .addApiKey({ type: 'apiKey', name: 'X-Session-Token', in: 'header' }, 'session-token')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  app.enableShutdownHooks();

  const port = process.env.APP_PORT || 3100;
  await app.listen(port);
  console.log(`[XD-Server] Running on http://localhost:${port}/${globalPrefix}`);
  console.log(`[XD-Server] Swagger docs: http://localhost:${port}/api/docs`);
}

bootstrap();
