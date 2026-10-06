import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import cookieParser from 'cookie-parser';
import { AppModule } from '../src/app.module';
import { env } from '../src/config/env.config';
import { PrismaService } from '../src/common/prisma/prisma.service';

describe('AI Generation & Atomicity Integration (T025 / US3)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let authToken: string;
  let skillIds: string[];

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.use(cookieParser(env.COOKIE_SECRET));
    await app.init();

    prisma = app.get(PrismaService);

    // Login com Ana Souza para obter token autenticado
    const loginRes = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'ana@demo.bncc.br', password: 'demo123' })
      .expect(200);

    authToken = loginRes.body.accessToken;

    // Buscar IDs das habilidades disponíveis no seed
    const skillsRes = await request(app.getHttpServer())
      .get('/api/bncc/skills')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    skillIds = skillsRes.body.map((s: any) => s.id);
    expect(skillIds.length).toBeGreaterThanOrEqual(2);
  });

  afterAll(async () => {
    await app.close();
  });

  it('deve gerar plano com sucesso, vinculando AiRun SUCCEEDED e status RASCUNHO de forma atômica', async () => {
    const selectedSkills = [skillIds[0], skillIds[1]];

    const res = await request(app.getHttpServer())
      .post('/api/plans/generate')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        skillIds: selectedSkills,
        title: 'Água e vida no território',
        instructionalGoal: 'Propor investigação do uso da água na escola.',
        durationMinutes: 50,
        useDigitalResources: true,
      })
      .expect(201);

    expect(res.body).toHaveProperty('id');
    expect(res.body.title).toBe('Água e vida no território');
    expect(res.body.status).toBe('RASCUNHO');
    expect(res.body.aiAssisted).toBe(true);
    expect(res.body.durationMinutes).toBe(50);
    expect(res.body.useDigitalResources).toBe(true);
    expect(res.body.markdownContent).toContain('# Plano de Aula');
    expect(res.body.skills.length).toBe(2);

    // Validar integridade e atomicidade no banco de dados
    const planInDb = await prisma.plan.findUnique({
      where: { id: res.body.id },
      include: { aiRun: true, skills: true },
    });

    expect(planInDb).toBeDefined();
    expect(planInDb?.status).toBe('RASCUNHO');
    expect(planInDb?.skills.length).toBe(2);
    expect(planInDb?.aiRun).toBeDefined();
    expect(planInDb?.aiRun?.status).toBe('SUCCEEDED');
    expect(planInDb?.aiRun?.rawResponse).toBeDefined();
  });

  it('deve falhar atomicamente em caso de erro da IA (HTTP 502), marcando AiRun como FAILED e não criando Plan', async () => {
    const plansBeforeCount = await prisma.plan.count();

    const res = await request(app.getHttpServer())
      .post('/api/plans/generate')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        skillIds: [skillIds[0]],
        title: 'Plano com Falha Simulada',
        instructionalGoal: 'Instrução com erro [MOCK_ERROR] na IA.',
        durationMinutes: 45,
        useDigitalResources: false,
      })
      .expect(502);

    expect(res.body.message).toMatch(/falha simulada/i);

    // Nenhum registro deve ter sido adicionado à tabela plans
    const plansAfterCount = await prisma.plan.count();
    expect(plansAfterCount).toBe(plansBeforeCount);

    // AiRun mais recente deve ter status FAILED
    const latestRun = await prisma.aiRun.findFirst({
      orderBy: { createdAt: 'desc' },
    });

    expect(latestRun).toBeDefined();
    expect(latestRun?.status).toBe('FAILED');
    expect(latestRun?.errorMessage).toContain('MOCK_ERROR');
  });

  it('deve falhar atomicamente em caso de timeout de 45s (HTTP 504), marcando AiRun como FAILED e não criando Plan', async () => {
    const plansBeforeCount = await prisma.plan.count();

    const res = await request(app.getHttpServer())
      .post('/api/plans/generate')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        skillIds: [skillIds[0]],
        title: 'Plano com Timeout Simulado',
        instructionalGoal: 'Instrução que estoura o tempo [MOCK_TIMEOUT] estrito.',
        durationMinutes: 50,
        useDigitalResources: true,
      })
      .expect(504);

    expect(res.body.message).toMatch(/tempo de execução da ia excedeu|tempo limite/i);

    // Nenhum registro deve ter sido adicionado à tabela plans
    const plansAfterCount = await prisma.plan.count();
    expect(plansAfterCount).toBe(plansBeforeCount);

    // AiRun mais recente deve ter status FAILED
    const latestRun = await prisma.aiRun.findFirst({
      orderBy: { createdAt: 'desc' },
    });

    expect(latestRun).toBeDefined();
    expect(latestRun?.status).toBe('FAILED');
    expect(latestRun?.errorMessage).toMatch(/timeout|tempo de execução/i);
  });

  it('deve rejeitar requisição com mais de 3 habilidades com HTTP 400', async () => {
    // Tentativa com 4 habilidades
    await request(app.getHttpServer())
      .post('/api/plans/generate')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        skillIds: [skillIds[0], skillIds[1], skillIds[0], skillIds[1]],
        title: 'Plano inválido com 4 habilidades',
        instructionalGoal: 'Instrução pedagógica válida.',
        durationMinutes: 50,
        useDigitalResources: false,
      })
      .expect(400);
  });
});
