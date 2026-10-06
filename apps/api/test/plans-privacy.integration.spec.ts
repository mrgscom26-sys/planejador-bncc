import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import cookieParser from 'cookie-parser';
import { AppModule } from '../src/app.module';
import { env } from '../src/config/env.config';

describe('Plans Privacy & Tenant Isolation Integration (T026 / US5)', () => {
  let app: INestApplication;
  let anaToken: string;
  let marcosToken: string;
  let anaPlanId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.use(cookieParser(env.COOKIE_SECRET));
    await app.init();

    // 1. Login com Professora Ana Souza
    const loginAna = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'ana@demo.bncc.br', password: 'demo123' })
      .expect(200);

    anaToken = loginAna.body.accessToken;

    // 2. Login com Professor Marcos Lima
    const loginMarcos = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'marcos@demo.bncc.br', password: 'demo123' })
      .expect(200);

    marcosToken = loginMarcos.body.accessToken;

    // 3. Obter habilidades da BNCC
    const skillsRes = await request(app.getHttpServer())
      .get('/api/bncc/skills')
      .set('Authorization', `Bearer ${anaToken}`)
      .expect(200);

    const skillId = skillsRes.body[0].id;

    // 4. Ana cria um plano de aula privado
    const createRes = await request(app.getHttpServer())
      .post('/api/plans/generate')
      .set('Authorization', `Bearer ${anaToken}`)
      .send({
        skillIds: [skillId],
        title: 'Plano Privado da Professora Ana',
        instructionalGoal: 'Objetivo pedagógico exclusivo da turma da Ana.',
        durationMinutes: 50,
        useDigitalResources: false,
      })
      .expect(201);

    anaPlanId = createRes.body.id;
    expect(anaPlanId).toBeDefined();
  });

  afterAll(async () => {
    await app.close();
  });

  it('deve permitir que Ana liste seu próprio plano', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/plans')
      .set('Authorization', `Bearer ${anaToken}`)
      .expect(200);

    expect(Array.isArray(res.body)).toBe(true);
    const found = res.body.find((p: any) => p.id === anaPlanId);
    expect(found).toBeDefined();
    expect(found.title).toBe('Plano Privado da Professora Ana');
  });

  it('deve permitir que Ana consulte os detalhes e edite seu próprio plano', async () => {
    // Consulta
    const getRes = await request(app.getHttpServer())
      .get(`/api/plans/${anaPlanId}`)
      .set('Authorization', `Bearer ${anaToken}`)
      .expect(200);

    expect(getRes.body.id).toBe(anaPlanId);
    expect(getRes.body.title).toBe('Plano Privado da Professora Ana');

    // Edição
    const updateRes = await request(app.getHttpServer())
      .put(`/api/plans/${anaPlanId}`)
      .set('Authorization', `Bearer ${anaToken}`)
      .send({
        title: 'Plano da Professora Ana (Título Atualizado)',
        markdownContent: '# Novo Conteúdo Formatado\n\nInstrução atualizada pela docente.',
      })
      .expect(200);

    expect(updateRes.body.title).toBe('Plano da Professora Ana (Título Atualizado)');
    expect(updateRes.body.markdownContent).toContain('# Novo Conteúdo Formatado');
  });

  it('deve isolar a listagem de Marcos, não exibindo o plano da Ana', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/plans')
      .set('Authorization', `Bearer ${marcosToken}`)
      .expect(200);

    expect(Array.isArray(res.body)).toBe(true);
    const foundAnaPlan = res.body.find((p: any) => p.id === anaPlanId);
    expect(foundAnaPlan).toBeUndefined();
  });

  it('deve retornar HTTP 404 quando Marcos tenta visualizar o plano da Ana (sem enumeração)', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/plans/${anaPlanId}`)
      .set('Authorization', `Bearer ${marcosToken}`)
      .expect(404);

    expect(res.body.message).toMatch(/não encontrado/i);
  });

  it('deve retornar HTTP 404 quando Marcos tenta editar o plano da Ana', async () => {
    const res = await request(app.getHttpServer())
      .put(`/api/plans/${anaPlanId}`)
      .set('Authorization', `Bearer ${marcosToken}`)
      .send({
        title: 'Tentativa de alteração não autorizada',
        markdownContent: 'Hackeando conteúdo...',
      })
      .expect(404);

    expect(res.body.message).toMatch(/não encontrado/i);
  });

  it('deve retornar HTTP 404 para ID inexistente, garantindo comportamento idêntico', async () => {
    await request(app.getHttpServer())
      .get('/api/plans/non-existent-plan-cuid')
      .set('Authorization', `Bearer ${marcosToken}`)
      .expect(404);
  });

  it('deve exigir autenticação em todas as rotas de planos (HTTP 401 sem Bearer)', async () => {
    await request(app.getHttpServer()).get('/api/plans').expect(401);
    await request(app.getHttpServer()).get(`/api/plans/${anaPlanId}`).expect(401);
    await request(app.getHttpServer())
      .put(`/api/plans/${anaPlanId}`)
      .set('x-requested-with', 'XMLHttpRequest')
      .expect(401);
    await request(app.getHttpServer())
      .post('/api/plans/generate')
      .set('x-requested-with', 'XMLHttpRequest')
      .expect(401);
  });
});
