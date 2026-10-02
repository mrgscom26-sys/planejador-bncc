# Implementation Plan: Planejador de Aulas BNCC

**Branch**: `docs/planejamento` | **Date**: 2026-10-02 | **Spec**: [`specs/001-planejador-aulas-bncc/spec.md`](file:///C:/Users/Marcio/workspace/planejador-bncc/specs/001-planejador-aulas-bncc/spec.md)

**Input**: Feature specification de `/specs/001-planejador-aulas-bncc/spec.md` e contrato de integração em `/docs/contracts/n8n.md`.

---

## Summary

Desenvolver o **Planejador BNCC** para professores em arquitetura monorepo com `pnpm`, frontend em Next.js (App Router/TypeScript) com CSS nativo e tokens do Design System (sem Tailwind), backend em NestJS (TypeScript/Prisma ORM) com PostgreSQL em Docker Compose e integração desacoplada via webhook n8n com Header Auth `x-api-key`.

O sistema viabiliza autenticação privada com contas de demonstração (sessão de 8h com cookie HttpOnly e access token curto em memória), consulta ao catálogo BNCC, seleção de 1 a 3 habilidades, configuração pedagógica e geração assistida por IA com atomicidade transacional estrita (tabela `AiRun` gerenciando estados `PENDING`, `SUCCEEDED`, `FAILED`). Em caso de sucesso, o plano é criado como `RASCUNHO` privado; em falha ou timeout de 45s, nenhum plano parcial é salvo e o formulário é preservado. O professor pode editar o Markdown gerado, alternar entre edição e visualização formatada (split view em desktop e abas em mobile), salvar explicitamente com proteção contra saída acidental e consultar sua lista restrita de rascunhos com retorno HTTP 404 para tentativas de acesso a planos alheios.

---

## Technical Context

- **Language/Version**: TypeScript 5.7+ executado sobre Node.js 22 LTS / 24 (`v24.21.0`).
- **Primary Dependencies**:
  - Frontend (`apps/web`): Next.js 15 (App Router), React 19/18, `react-markdown` + `remark-gfm` + plugins de sanitização HTML contra XSS, `lucide-react`.
  - Backend (`apps/api`): NestJS 11/10, `@nestjs/jwt`, `@nestjs/passport`, `cookie-parser`, `bcrypt`, `zod`, `@prisma/client`.
- **Styling**: CSS nativo com Custom Properties (Tokens do Figma) e CSS Modules (`*.module.css`). **Sem adição de Tailwind CSS**.
- **Storage**: PostgreSQL 16-alpine executado via Docker Compose, com migrações declarativas e cliente tipado via Prisma ORM 6.
- **Testing**: Vitest / Jest para testes unitários de componentes e regras de negócio; Supertest para testes de integração REST com banco de dados e mock do n8n.
- **Target Platform**: Aplicação web responsiva (Desktop 1440px+, Tablet 768px-1023px, Mobile 375px-767px) operando em navegadores modernos (Chrome, Firefox, Safari, Edge).
- **Project Type**: Monorepo pnpm com duas aplicações (`apps/web` na porta 3000 e `apps/api` na porta 3001) e pacotes compartilhados.
- **Performance Goals**: Renderização da alternância Markdown/Preview em < 200 ms; carregamento do catálogo BNCC em < 100 ms via cache local; respostas da API local em < 50 ms (excluindo tempo de IA).
- **Constraints**:
  - Timeout estrito de chamada de IA limitado a **45 segundos**.
  - Frontend **nunca** tem acesso direto a chaves ou URLs privadas do n8n.
  - Planos pertencentes a outro professor retornam categoricamente **HTTP 404**.
  - Sanitização estrita do Markdown sem execução de scripts ou HTML arbitrário.
  - Conexões entre web e api com CORS restrito e cookies protegidos (HttpOnly, SameSite Strict).
- **Scale/Scope**: 2 contas de demonstração locais, catálogo inicial com 5 habilidades de Computação da BNCC, 9 telas aprovadas no Design System.

---

## Constitution Check

*GATE: Avaliação dos 8 princípios fundamentais da Constituição do Planejador BNCC.*

| Princípio Constitucional | Status | Evidência de Conformidade no Planejamento |
| :--- | :--- | :--- |
| **I. Spec-First** | **PASS** | A especificação funcional completa (`spec.md`) e checklist foram aprovados antes deste plano. |
| **II. Segregação de Camadas e Segredos** | **PASS** | O frontend Next.js comunica-se exclusivamente com a API NestJS. O webhook e chave `x-api-key` do n8n residem apenas nas variáveis de ambiente da API. |
| **III. Autorização por Propriedade Docente** | **PASS** | Todas as rotas de planos filtram por `userId`. Planos de outros professores respondem com HTTP 404, prevenindo IDOR e vazamento. |
| **IV. Saída de IA como Rascunho Assistido** | **PASS** | Planos gerados recebem status fixo `RASCUNHO` e flag `aiAssisted=true`. Não há publicação automática nem finalização sem homologação do professor. |
| **V. Validação Estrita e Atomicidade** | **PASS** | Transação interativa do Prisma vincula `AiRun` e `Plan`. Em falhas ou timeouts, nenhum plano parcial é salvo e `AiRun` é marcado `FAILED`. |
| **VI. Migrations e Seeds Reproduzíveis** | **PASS** | Migrações Prisma versionadas e script de seed idempotente carregando as contas demo e o catálogo oficial de `docs/data/bncc-recorte.json`. |
| **VII. Design System, Responsividade e Acessibilidade** | **PASS** | Tokens fiéis ao frame `2:11440` em CSS nativo (cores, tipografia Inter, espaçamentos, elevação). Conformidade WCAG 2.1 AA e suporte a mobile/tablet. |
| **VIII. Testes Críticos e Higiene de Repositório** | **PASS** | Testes de integração automatizados com mock n8n local (`N8N_MOCK_ENABLED=true`). Arquivos `.env` mantidos fora do versionamento Git. |

---

## Project Structure

### Documentation (this feature)

```text
specs/001-planejador-aulas-bncc/
├── spec.md              # Especificação funcional refinada
├── plan.md              # Este plano de implementação técnica
├── research.md          # Pesquisa técnica, compatibilidade de versões e tokens
├── data-model.md        # Modelo de dados relacional e schema Prisma
├── quickstart.md        # Guia de início rápido e roteiro de validação
├── contracts/
│   ├── api-spec.yaml    # Contrato REST OpenAPI 3.1 da API NestJS
│   └── n8n-integration.md # Contrato detalhado do webhook n8n
└── checklists/
    └── requirements.md  # Checklist de requisitos
```

### Source Code (repository root)

```text
planejador-bncc/
├── apps/
│   ├── api/                           # Backend NestJS (porta 3001)
│   │   ├── prisma/
│   │   │   ├── schema.prisma          # Schema relacional (User, Plan, AiRun, BnccSkill, etc.)
│   │   │   ├── migrations/            # Migrações versionadas do banco de dados
│   │   │   └── seed.ts                # Seed idempotente (contas demo + bncc-recorte.json)
│   │   ├── src/
│   │   │   ├── common/                # Guards (JwtAuth, Csrf), decorators, interceptors
│   │   │   ├── config/                # Validação de variáveis de ambiente com Zod
│   │   │   ├── modules/
│   │   │   │   ├── auth/              # Login, refresh token, logout, hash bcrypt, cookies
│   │   │   │   ├── bncc/              # Consulta ao catálogo de habilidades
│   │   │   │   ├── plans/             # CRUD de planos, regras de posse privada e 404
│   │   │   │   └── ai/                # N8nClient, timeout 45s, validação Zod, AiRun e mocks
│   │   │   ├── app.module.ts
│   │   │   └── main.ts                # Inicialização, CORS restrito, cookie-parser, pipes
│   │   ├── test/                      # Testes e2e e integração de API com mock n8n
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   └── web/                           # Frontend Next.js (porta 3000)
│       ├── public/                    # Assets estáticos e imagens
│       ├── src/
│       │   ├── app/                   # App Router do Next.js
│       │   │   ├── layout.tsx         # Layout raiz com fontes e tokens globais
│       │   │   ├── page.tsx           # Redirecionamento inicial (/login ou /planos)
│       │   │   ├── login/page.tsx     # Frame 02: Login com atalhos de contas demo
│       │   │   ├── planos/
│       │   │   │   ├── page.tsx       # Frames 03 e 04: Lista de rascunhos e estado vazio
│       │   │   │   ├── novo/page.tsx  # Frames 05, 06, 07: Formulário, loading e erro de IA
│       │   │   │   └── [id]/editar/page.tsx # Frames 08 e 09: Editor Markdown e modal de saída
│       │   ├── components/            # Componentes reutilizáveis do Design System
│       │   │   ├── ui/                # Button, Input, Select, Checkbox, Radio, Switch, Badge
│       │   │   ├── feedback/          # Banner, Toast, Modal, ProgressBar, EmptyState
│       │   │   ├── layout/            # Sidebar, Topbar, AppShell, ResponsiveContainer
│       │   │   └── editor/            # MarkdownToolbar, MarkdownEditor, MarkdownPreview
│       │   ├── lib/                   # Cliente HTTP (fetch com interceptor de refresh), storage
│       │   ├── styles/                # CSS nativo e Design Tokens
│       │   │   ├── tokens.css         # Variáveis CSS extraídas do Figma (cores, tipografia)
│       │   │   └── globals.css        # Reset, estilos base e utilitários
│       │   └── types/                 # Tipos locais do frontend
│       ├── package.json
│       └── tsconfig.json
│
├── packages/
│   └── shared-types/                  # Contratos e interfaces TypeScript compartilhados
│       ├── src/
│       │   ├── auth.ts
│       │   ├── bncc.ts
│       │   ├── plans.ts
│       │   └── n8n.ts
│       ├── package.json
│       └── tsconfig.json
│
├── docker-compose.yml                 # PostgreSQL 16 para desenvolvimento local
├── pnpm-workspace.yaml                # Definição dos workspaces do monorepo
├── package.json                       # Scripts raiz unificados (dev, lint, test, build)
└── .gitignore                         # Higiene de repositório (node_modules, .env, etc.)
```

---

## Mapeamento de Integração dos Frames Figma

| Frame | Arquivo PNG em `docs/design/` | Responsividade e Interação |
| :--- | :--- | :--- |
| **01 · Design System** (`2:11440`) | [`01-design-system.png`](file:///C:/Users/Marcio/workspace/planejador-bncc/docs/design/01-design-system.png) | Fonte de tokens em `styles/tokens.css` (cores, raios, espaçamentos, elevação e tipografia Inter). |
| **02 · Login com erro** (`2:11755`) | [`02-login-credenciais-invalidas.png`](file:///C:/Users/Marcio/workspace/planejador-bncc/docs/design/02-login-credenciais-invalidas.png) | Split 40/60 no desktop; empilhado vertical no mobile. Formulário com validação e botões de atalho "Usar conta". |
| **03 · Meus planos** (`2:11830`) | [`03-meus-planos-rascunhos.png`](file:///C:/Users/Marcio/workspace/planejador-bncc/docs/design/03-meus-planos-rascunhos.png) | Tabela estruturada no desktop; cartões resumidos no mobile. Busca local e badges `RASCUNHO` + `Auxílio por IA`. |
| **04 · Estado vazio** (`2:11932`) | [`04-meus-planos-estado-vazio.png`](file:///C:/Users/Marcio/workspace/planejador-bncc/docs/design/04-meus-planos-estado-vazio.png) | Ilustração centralizada, texto orientador e botão primário `+ Criar meu primeiro plano`. |
| **05 · Novo plano (Formulário)** (`2:11990`) | [`05-novo-plano-formulario-validacoes.png`](file:///C:/Users/Marcio/workspace/planejador-bncc/docs/design/05-novo-plano-formulario-validacoes.png) | Duas colunas (60/40) no desktop; empilhado no mobile. Catálogo BNCC com busca e seleção de 1 a 3 habilidades. |
| **06 · Preparando rascunho** (`2:12155`) | [`06-novo-plano-preparando-rascunho.png`](file:///C:/Users/Marcio/workspace/planejador-bncc/docs/design/06-novo-plano-preparando-rascunho.png) | Card com barra de progresso, bloqueio de submissão dupla e inputs em estado desabilitado. |
| **07 · Falha de geração** (`2:12329`) | [`07-novo-plano-falha-geracao.png`](file:///C:/Users/Marcio/workspace/planejador-bncc/docs/design/07-novo-plano-falha-geracao.png) | Banner de erro, retenção intacta de todos os campos preenchidos e botão `Tentar gerar novamente`. |
| **08 · Editor Markdown** (`2:12495`) | [`08-rascunho-gerado-editor-previsualizacao.png`](file:///C:/Users/Marcio/workspace/planejador-bncc/docs/design/08-rascunho-gerado-editor-previsualizacao.png) | Split view no desktop; abas comutáveis no mobile. Barra de formatação e preview HTML seguro. |
| **09 · Confirmação de saída** (`2:12608`) | [`09-rascunho-confirmacao-saida.png`](file:///C:/Users/Marcio/workspace/planejador-bncc/docs/design/09-rascunho-confirmacao-saida.png) | Modal com overlay escurecido interceptando navegação quando houver alterações pendentes de salvamento. |

---

## Scripts Raiz para Implementação

O arquivo `package.json` raiz centralizará a orquestração via pnpm workspaces:

```json
{
  "name": "planejador-bncc",
  "private": true,
  "scripts": {
    "dev": "pnpm --parallel --filter api --filter web dev",
    "build": "pnpm --filter shared-types build && pnpm --filter api build && pnpm --filter web build",
    "lint": "pnpm -r lint",
    "typecheck": "pnpm -r typecheck",
    "test": "pnpm -r test",
    "test:integration": "pnpm --filter api test:integration",
    "db:up": "docker compose up -d postgres",
    "db:migrate": "pnpm --filter api prisma migrate dev",
    "db:seed": "pnpm --filter api prisma db seed"
  }
}
```

---

## Complexity Tracking

*Nenhuma violação aos princípios constitucionais. A arquitetura monorepo com isolamento estrito de API e cliente n8n desacoplado atende com simplicidade e precisão ao escopo do projeto.*
