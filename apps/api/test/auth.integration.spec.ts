import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import cookieParser from 'cookie-parser';
import { AppModule } from '../src/app.module';
import { env } from '../src/config/env.config';

describe('Auth Integration (US1)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.use(cookieParser(env.COOKIE_SECRET));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('deve realizar login com sucesso, retornando access token e cookie HttpOnly SameSite=Strict', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'ana@demo.bncc.br', password: 'demo123' })
      .expect(200);

    expect(res.body).toHaveProperty('accessToken');
    expect(res.body.user).toEqual({
      id: expect.any(String),
      email: 'ana@demo.bncc.br',
      name: 'Profª Ana Souza',
      role: 'DOCENTE',
    });

    const cookies = res.headers['set-cookie'];
    expect(cookies).toBeDefined();
    const refreshCookie = Array.isArray(cookies)
      ? cookies.find((c: string) => c.startsWith('bncc_refresh_token='))
      : cookies;

    expect(refreshCookie).toBeDefined();
    expect(refreshCookie).toContain('HttpOnly');
    expect(refreshCookie?.toLowerCase()).toContain('samesite=strict');
  });

  it('deve rejeitar credenciais inválidas com HTTP 401', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'ana@demo.bncc.br', password: 'senha-incorreta' })
      .expect(401);

    expect(res.body.message).toMatch(/Credenciais inválidas/i);
  });

  it('deve realizar rotação de refresh token e invalidar o token anterior', async () => {
    // 1. Login inicial
    const loginRes = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'ana@demo.bncc.br', password: 'demo123' })
      .expect(200);

    const cookies = loginRes.headers['set-cookie'];
    const initialCookie = Array.isArray(cookies)
      ? cookies.find((c: string) => c.startsWith('bncc_refresh_token='))
      : cookies;

    // 2. Renovar token via refresh
    const refreshRes = await request(app.getHttpServer())
      .post('/api/auth/refresh')
      .set('Cookie', [initialCookie])
      .set('x-requested-with', 'XMLHttpRequest')
      .expect(200);

    expect(refreshRes.body).toHaveProperty('accessToken');
    const newCookies = refreshRes.headers['set-cookie'];
    const newCookie = Array.isArray(newCookies)
      ? newCookies.find((c: string) => c.startsWith('bncc_refresh_token='))
      : newCookies;

    expect(newCookie).toBeDefined();

    // 3. Tentar usar novamente o token antigo (deve falhar por rotação/revogação)
    await request(app.getHttpServer())
      .post('/api/auth/refresh')
      .set('Cookie', [initialCookie])
      .set('x-requested-with', 'XMLHttpRequest')
      .expect(401);
  });

  it('deve realizar logout, limpando o cookie e revogando a sessão', async () => {
    // 1. Login
    const loginRes = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'marcos@demo.bncc.br', password: 'demo123' })
      .expect(200);

    const cookies = loginRes.headers['set-cookie'];
    const refreshCookie = Array.isArray(cookies)
      ? cookies.find((c: string) => c.startsWith('bncc_refresh_token='))
      : cookies;

    // 2. Logout
    const logoutRes = await request(app.getHttpServer())
      .post('/api/auth/logout')
      .set('Cookie', [refreshCookie])
      .set('x-requested-with', 'XMLHttpRequest')
      .expect(200);

    expect(logoutRes.body).toEqual({ success: true });

    // 3. Tentar renovar após logout deve retornar 401
    await request(app.getHttpServer())
      .post('/api/auth/refresh')
      .set('Cookie', [refreshCookie])
      .set('x-requested-with', 'XMLHttpRequest')
      .expect(401);
  });

  it('deve proteger rota /api/auth/me exigindo Bearer token', async () => {
    // Sem token
    await request(app.getHttpServer())
      .get('/api/auth/me')
      .expect(401);

    // Com token
    const loginRes = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'ana@demo.bncc.br', password: 'demo123' })
      .expect(200);

    const token = loginRes.body.accessToken;

    const meRes = await request(app.getHttpServer())
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(meRes.body.email).toBe('ana@demo.bncc.br');
  });
});
