import { NestFactory } from '@nestjs/core';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { env } from './config/env.config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api');

  app.use(cookieParser(env.COOKIE_SECRET));

  app.enableCors({
    origin: ['http://localhost:3000'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-requested-with', 'x-request-id', 'x-api-key'],
  });

  const port = env.PORT || 3001;
  await app.listen(port);
  console.log(`API Planejador BNCC rodando em http://localhost:${port}/api`);
}

bootstrap();
