import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import cookieParser from 'cookie-parser';
import { AppModule } from '../src/app.module';
import { env } from '../src/config/env.config';

describe('BNCC Catalog Integration (US2)', () => {
  let app: INestApplication;
  let authToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.use(cookieParser(env.COOKIE_SECRET));
    await app.init();

    // Login com Ana Souza para obter token
    const loginRes = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'ana@demo.bncc.br', password: 'demo123' })
      .expect(200);

    authToken = loginRes.body.accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  it('deve exigir autenticação para consultar o catálogo BNCC (retorna 401 sem token)', async () => {
    await request(app.getHttpServer())
      .get('/api/bncc/skills')
      .expect(401);
  });

  it('deve listar todas as habilidades cadastradas com token válido', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/bncc/skills')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBe(5);

    const codigos = res.body.map((s: any) => s.codigo);
    expect(codigos).toContain('EF01CO01');
    expect(codigos).toContain('EF01CO02');
    expect(codigos).toContain('EF02CO02');
    expect(codigos).toContain('EF02CO04');
    expect(codigos).toContain('EF02CO06');
  });

  it('deve filtrar habilidades por ano escolar (ex: ano=1)', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/bncc/skills?ano=1')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    expect(res.body.length).toBe(2);
    res.body.forEach((skill: any) => {
      expect(skill.ano).toBe(1);
    });
  });

  it('deve filtrar habilidades por ano escolar (ex: ano=2)', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/bncc/skills?ano=2')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    expect(res.body.length).toBe(3);
    res.body.forEach((skill: any) => {
      expect(skill.ano).toBe(2);
    });
  });

  it('deve buscar habilidades por texto (q=algoritmo)', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/bncc/skills?q=algoritmo')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    expect(res.body.length).toBeGreaterThan(0);
    const hasSearchTerm = res.body.some(
      (s: any) =>
        s.codigo.toLowerCase().includes('algoritmo') ||
        s.descricao.toLowerCase().includes('algoritmo'),
    );
    expect(hasSearchTerm).toBe(true);
  });

  it('deve garantir que o catálogo é somente leitura (mutação POST não existe -> 404)', async () => {
    await request(app.getHttpServer())
      .post('/api/bncc/skills')
      .set('Authorization', `Bearer ${authToken}`)
      .set('x-requested-with', 'XMLHttpRequest')
      .send({ codigo: 'FAKE01' })
      .expect(404);
  });
});
