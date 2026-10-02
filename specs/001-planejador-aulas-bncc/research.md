# Research & Technical Decisions: Planejador BNCC

**Feature**: `001-planejador-aulas-bncc`  
**Date**: 2026-10-02  
**Status**: Completed  

---

## 1. Monorepo Architecture & Workspace Setup

### Decision
Utilizar um monorepo gerenciado por **pnpm workspaces** estruturado em:
- `apps/web`: Frontend Next.js (App Router) com TypeScript e CSS nativo/CSS Modules. Porta `localhost:3000`.
- `apps/api`: Backend NestJS com TypeScript, Prisma ORM e PostgreSQL. Porta `localhost:3001`.
- `packages/shared-types` (ou exportações internas centralizadas): Tipos e contratos DTO compartilhados entre frontend e backend para manter tipagem estática ponta a ponta.

### Rationale
- O `pnpm` oferece isolamento de dependências via symlinks, execução veloz e caching eficiente, atendendo à governança de projetos corporativos.
- A divisão clara entre `apps/web` e `apps/api` garante a **segregação estrita de camadas (Princípio II da Constituição)**: a API atua como fronteira única de dados e nenhuma credencial ou chave externa (como o webhook do n8n) trafega para o navegador.

### Alternatives Considered
- *Next.js Fullstack Monolítico (Next API Routes / Server Actions apenas)*: Rejeitado para assegurar desacoplamento arquitetural limpo, permitir ciclo de vida independente dos serviços de negócio e cumprir a diretriz de NestJS na API.
- *Turborepo / Nx*: Rejeitado para manter simplicidade operacional sem ferramentas adicionais; os scripts nativos do pnpm (`pnpm -r` / `pnpm --filter`) atendem plenamente ao escopo.

---

## 2. Compatibilidade de Versões e Ferramental

### Decision
Fixar as seguintes versões compatíveis no `package.json` raiz e nos workspaces, garantindo reprodutibilidade através do lockfile (`pnpm-lock.yaml`):

| Tecnologia | Versão Homologada | Justificativa |
| :--- | :--- | :--- |
| **Node.js** | `>= 22.0.0 < 25.0.0` (LTS recomendado: `22.x` ou runtime local `24.21.0`) | Compatibilidade com ESM nativo, `AbortSignal.timeout` e suporte a NestJS/Next.js |
| **pnpm** | `>= 9.0.0 < 11.0.0` (via `corepack enable pnpm`) | Gerenciamento determinístico de monorepo |
| **Next.js** | `15.2.x` (ou `14.2.x` LTS estável) | Suporte a App Router, React 19/18, SSR seguro e streaming |
| **React / React DOM** | `19.0.0` (ou `18.3.1`) | Tipagem estrita e compatibilidade com Next.js |
| **NestJS** | `11.0.x` (ou `10.4.x`) | Framework modular corporativo, injeção de dependências e tipagem robusta |
| **Prisma ORM** | `6.4.x` | Suporte completo a PostgreSQL, transações interativas atômicas e migrações tipadas |
| **PostgreSQL** | `16-alpine` (Docker Compose) | Banco relacional robusto com conformidade ACID estrita |
| **TypeScript** | `5.7.x` | Verificação estática rigorosa (`strict: true`) em todos os apps |
| **Zod** | `3.24.x` | Validação de schemas declarativa nas fronteiras (formulários, API e n8n) |

### Rationale
- As versões selecionadas formam uma matriz estável e testada no ecossistema Node.js moderno.
- A presença de lockfile versionado evita o problema de dependências flutuantes ("it works on my machine").

---

## 3. Estratégia de CSS, Design System e Tokens

### Decision
Adotar **CSS nativo com CSS Custom Properties (Variáveis de Design Tokens)** e **CSS Modules** (`*.module.css`) por componente, **sem adicionar Tailwind CSS**.

### Rationale
- Cumpre estritamente a instrução do usuário: *"Usar CSS com tokens e componentes reutilizáveis, sem acrescentar Tailwind"*.
- Mapeia 1:1 os tokens extraídos diretamente do frame aprovado do Figma (`2:11440`, `docs/design/01-design-system.png`):
  - `--color-blue-900: #173A63`
  - `--color-blue-800: #1E4E84`
  - `--color-blue-700: #245F9E`
  - `--color-blue-600: #2F73B8`
  - `--color-blue-100: #DCEBFA`
  - `--color-blue-50: #F1F7FD`
  - `--color-surface: #FFFFFF`
  - `--color-background: #F5F7FA`
  - `--color-table-header: #F8FAFC`
  - `--color-border-subtle: #D8E0EA`
  - `--color-border-medium: #AEBBCB`
  - `--color-text-primary: #172333`
  - `--color-text-secondary: #58677A`
  - `--color-text-placeholder: #7B8796`
  - `--color-success: #247A55` / `--color-success-bg: #E9F6EF`
  - `--color-warning: #A45B12` / `--color-warning-bg: #FFF4DE`
  - `--color-error: #B43A3A` / `--color-error-bg: #FDECEC`
  - `--color-info: #2566A8` / `--color-info-bg: #EAF3FC`
  - Escala de espaçamento: 4px, 8px, 12px, 16px, 24px, 32px, 48px, 64px.
  - Escala de raios: 4px, 8px, 12px, 16px, 999px.
  - Elevações: `--shadow-card: 0px 2px 10px 0px rgba(23, 58, 99, 0.07)` e `--shadow-modal: 0px 14px 38px 0px rgba(16, 36, 61, 0.14)`.
- Elimina overhead de compilação de bibliotecas pesadas e garante fidelidade visual e conformidade WCAG 2.1 AA.

---

## 4. Segurança, Autenticação e Gestão de Sessão

### Decision
Implementar autenticação baseada em **Access Token curto em memória** + **Refresh Token rotativo em cookie HttpOnly**:
1. **Login (`POST /api/auth/login`)**:
   - Valida credenciais com `bcrypt.compare` contra a senha com hash gravada no banco.
   - Gera um JWT Access Token de curta duração (15 minutos), retornado no payload JSON.
   - Gera um Refresh Token opaco e criptograficamente seguro (UUID v4 ou 64 bytes aleatórios).
   - Persiste no banco de dados **apenas o hash SHA-256 do Refresh Token** associado ao usuário e validade de 8 horas (**FR-002**).
   - Envia o Refresh Token cru em cookie HttpOnly (`bncc_refresh_token`).
2. **Flags do Cookie**:
   - `HttpOnly: true` (inibe acesso via scripts no browser).
   - `SameSite: 'strict'` (proteção intrínseca contra CSRF).
   - `Path: '/api/auth'` (o cookie só trafega nas rotas de autenticação: refresh e logout).
   - `Secure`: `true` em produção; em `localhost` parametrizável como `false` para desenvolvimento sem certificado SSL local.
3. **Proteção Adicional contra CSRF**:
   - As mutações baseadas em sessão validam cabeçalho customizado obrigatório (`x-requested-with: XMLHttpRequest` ou `x-csrf-token`), bloqueando requisições cross-origin simples de navegadores.
   - CORS no NestJS configurado estritamente para a origem da aplicação web (`http://localhost:3000` em dev, domínio oficial em prod) com `credentials: true`.
4. **Gerenciamento de Estado no Frontend**:
   - O Access Token é armazenado em uma closure/módulo de estado em memória (React Context ou singleton de serviço HTTP).
   - Nunca é persistido em `localStorage` ou `sessionStorage` para evitar ataques de XSS.
   - Um interceptor HTTP automático detecta respostas 401 e chama `POST /api/auth/refresh` silenciosamente para renovar o access token sem deslogar o professor em uso contínuo.
5. **Logout (`POST /api/auth/logout`)**:
   - Revoga o refresh token no banco de dados (marca `revokedAt = now()`).
   - Limpa o cookie HttpOnly no cliente (`Max-Age=0`).
   - Limpa o access token da memória.

---

## 5. Integração com n8n: Atomicidade, Resiliência e Mocks

### Decision
O serviço de geração de planos com IA é orquestrado exclusivamente pela API NestJS (`AiPlanService`), seguindo o contrato estrito de [`docs/contracts/n8n.md`](file:///C:/Users/Marcio/workspace/planejador-bncc/docs/contracts/n8n.md):

1. **Cliente HTTP Dedicado (`N8nClient`)**:
   - Comunicação via `fetch` nativo ou `axios` com `AbortSignal.timeout(45_000)`.
   - **Timeout estrito de 45 segundos** (**FR-011**).
   - **Sem retry automático**: em caso de falha de rede ou timeout, a requisição é encerrada imediatamente.
   - **Header de Autenticação**: Envio do header `x-api-key: ${process.env.N8N_API_KEY}` configurado em segredo de ambiente.
   - **Rastreabilidade**: Geração de um `requestId` (UUID) injetado no header `x-request-id` e armazenado na entidade `AiRun`.
2. **Formatação de Habilidades Múltiplas (Resolução de Lacuna)**:
   - A especificação permite selecionar de 1 a 3 habilidades (**FR-007**), enquanto o contrato n8n prevê a string singular `"habilidade"`.
   - **Regra de mapeamento adotada**:
     - 1 habilidade: `"${habilidade.codigo} — ${habilidade.descricao}"`
     - Múltiplas habilidades (2 ou 3): Unificadas por quebra de linha dupla:
       `"${h1.codigo} — ${h1.descricao}\n\n${h2.codigo} — ${h2.descricao}"`
3. **Atomicidade e Ciclo de Vida da `AiRun`**:
   - Antes de disparar a chamada ao n8n, a API cria um registro `AiRun` com status `PENDING` associado ao `userId` e ao `requestId`.
   - **Cenário de Sucesso**:
     - Resposta do n8n validada contra o schema Zod (`success === true`, `format === 'markdown'`, `answer` não-vazio).
     - Em uma **transação interativa do Prisma (`prisma.$transaction`)**:
       1. Cria a entidade `Plan` com status `RASCUNHO`, `aiAssisted = true`, vinculando as habilidades selecionadas (`PlanSkill`).
       2. Atualiza a entidade `AiRun` para `status = 'SUCCEEDED'`, gravando a latência e o `rawResponse`.
     - Retorna o plano gerado para o cliente.
   - **Cenário de Falha (Timeout, HTTP != 200, resposta inválida, n8n offline)**:
     - A transação NÃO cria a entidade `Plan`.
     - A entidade `AiRun` é atualizada com `status = 'FAILED'`, registrando a mensagem de erro e latência.
     - A API responde com erro HTTP `502 Bad Gateway` ou `504 Gateway Timeout` contendo mensagem amigável para o educador.
     - O frontend preserva integralmente os campos preenchidos e exibe o botão `Tentar gerar novamente` (**FR-014**).
4. **Modo Mock Local (`N8N_MOCK_ENABLED=true`)**:
   - Permite executar a suíte de testes de integração e rodar a aplicação localmente sem depender do workflow compartilhado do n8n nem gastar quotas de IA.
   - Retorna payload idêntico ao contrato oficial, com latência simulada de 500ms.

---

## 6. Renderização e Sanitização Segura de Markdown

### Decision
No frontend (`apps/web`), utilizar **`react-markdown`** configurado com **`remark-gfm`** (tabelas, listas de tarefas, tachado) e **sanitização estrita** que remove tags HTML perigosas (`<script>`, `<iframe>`, `<object>`, manipuladores inline como `onload/onerror`).

### Rationale
- Cumpre o critério de segurança: *"Sanitizar a apresentação do Markdown, sem executar HTML arbitrário"*.
- Assegura renderização formatada rica para o educador com fidelidade tipográfica ao Design System.

---

## 7. Mapeamento de Telas do Design System e Adaptações Responsivas

Todas as 9 telas aprovadas em [`docs/design-reference.md`](file:///C:/Users/Marcio/workspace/planejador-bncc/docs/design-reference.md) foram mapeadas para rotas e componentes:

| Frame / Referência | Rota Frontend (`apps/web`) | Comportamento e Adaptação Responsiva |
| :--- | :--- | :--- |
| `01-design-system` (`2:11440`) | `/design-system` (rota interna/dev) e `styles/tokens.css` | Definição global de tokens, tipografia, cores e controles atômicos |
| `02-login-credenciais-invalidas` (`2:11755`) | `/login` | Desktop: split 40/60 (painel institucional + card login). Mobile/Tablet: painel institucional colapsado em banner compacto superior; foco no card de login e botões de conta de demonstração |
| `03-meus-planos-rascunhos` (`2:11830`) | `/planos` | Desktop: sidebar lateral fixa 230px, tabela completa de planos. Mobile/Tablet: menu hamburguer/drawer, tabela convertida em lista vertical de cards com visualização resumida |
| `04-meus-planos-estado-vazio` (`2:11932`) | `/planos` (sem registros) | Card centralizado com ilustração acolhedora e CTA `+ Criar meu primeiro plano` |
| `05-novo-plano-formulario-validacoes` (`2:11990`) | `/planos/novo` | Desktop: 2 colunas (Catálogo 60% / Formulário 40%). Mobile/Tablet: empilhamento vertical de seções (1º seleção de habilidades, 2º contexto pedagógico) |
| `06-novo-plano-preparando-rascunho` (`2:12155`) | `/planos/novo` (estado de envio) | Card com barra de progresso no topo, desabilitação de todos os campos e botão com spinner de carregamento |
| `07-novo-plano-falha-geracao` (`2:12329`) | `/planos/novo` (estado de erro) | Banner vermelho superior com aviso de preservação, campos mantidos intactos e botão `Tentar gerar novamente` habilitado |
| `08-rascunho-gerado-editor-previsualizacao` (`2:12495`) | `/planos/[id]/editar` | Desktop: split view lado a lado (editor à esquerda, preview à direita). Mobile/Tablet: alternância exclusiva por abas (`Editor Markdown` e `Pré-visualização`) conforme **FR-016** |
| `09-rascunho-confirmacao-saida` (`2:12608`) | `/planos/[id]/editar` (modal) | Modal com overlay escurecido interceptando navegação (via `beforeunload` e interceptor de rota do Next.js) quando houver `isDirty = true` |
