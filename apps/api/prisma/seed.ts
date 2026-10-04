import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

async function main() {
  console.log('Iniciando seed do banco de dados...');

  // 1. Criar contas de demonstração
  const saltRounds = 10;
  const passwordAna = process.env.DEMO_PASSWORD_ANA || 'demo123';
  const passwordMarcos = process.env.DEMO_PASSWORD_MARCOS || 'demo123';

  const hashAna = await bcrypt.hash(passwordAna, saltRounds);
  const hashMarcos = await bcrypt.hash(passwordMarcos, saltRounds);

  const ana = await prisma.user.upsert({
    where: { email: 'ana@demo.bncc.br' },
    update: {
      name: 'Profª Ana Souza',
      passwordHash: hashAna,
      role: 'DOCENTE',
    },
    create: {
      email: 'ana@demo.bncc.br',
      name: 'Profª Ana Souza',
      passwordHash: hashAna,
      role: 'DOCENTE',
    },
  });

  const marcos = await prisma.user.upsert({
    where: { email: 'marcos@demo.bncc.br' },
    update: {
      name: 'Prof. Marcos Lima',
      passwordHash: hashMarcos,
      role: 'DOCENTE',
    },
    create: {
      email: 'marcos@demo.bncc.br',
      name: 'Prof. Marcos Lima',
      passwordHash: hashMarcos,
      role: 'DOCENTE',
    },
  });

  console.log(`Docentes criados/atualizados: ${ana.email}, ${marcos.email}`);

  // 2. Carregar catálogo BNCC
  const possiblePaths = [
    path.resolve(__dirname, '../../../docs/data/bncc-recorte.json'),
    path.resolve(process.cwd(), 'docs/data/bncc-recorte.json'),
    path.resolve(process.cwd(), '../../docs/data/bncc-recorte.json'),
    path.resolve(__dirname, '../../../data/bncc-recorte.json'),
    path.resolve(process.cwd(), 'data/bncc-recorte.json'),
  ];

  let rawData = '';
  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      rawData = fs.readFileSync(p, 'utf-8');
      console.log(`Catálogo BNCC encontrado em: ${p}`);
      break;
    }
  }

  if (!rawData) {
    throw new Error('Arquivo bncc-recorte.json não encontrado nas localizações esperadas.');
  }

  interface BnccRawSkill {
    nivel: string;
    ano: number | null;
    eixo: string;
    codigo: string;
    descricao: string;
    explicacao: string;
    exemplos: string;
  }

  const skills: BnccRawSkill[] = JSON.parse(rawData);

  for (const skill of skills) {
    await prisma.bnccSkill.upsert({
      where: { codigo: skill.codigo },
      update: {
        nivel: skill.nivel,
        ano: skill.ano,
        eixo: skill.eixo,
        descricao: skill.descricao,
        explicacao: skill.explicacao,
        exemplos: skill.exemplos,
      },
      create: {
        codigo: skill.codigo,
        nivel: skill.nivel,
        ano: skill.ano,
        eixo: skill.eixo,
        descricao: skill.descricao,
        explicacao: skill.explicacao,
        exemplos: skill.exemplos,
      },
    });
  }

  console.log(`Seed concluído com sucesso: ${skills.length} habilidades BNCC inseridas/atualizadas.`);
}

main()
  .catch((e) => {
    console.error('Erro durante execução do seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
