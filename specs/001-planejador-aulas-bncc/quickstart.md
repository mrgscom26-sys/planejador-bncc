# Quickstart & Validation Guide: Planejador BNCC

**Feature**: `001-planejador-aulas-bncc`  
**Date**: 2026-10-02  
**Status**: Ready for Validation  

---

## 1. Pré-Requisitos do Sistema

- **Node.js**: Versão `>= 22.0.0` (LTS recomendado; runtime testado: `v24.21.0`)
- **pnpm**: Versão `>= 9.0.0` (ativar via `corepack enable pnpm` ou `npm install -g pnpm`)
- **Docker & Docker Compose**: Para execução do PostgreSQL local
- **Navegador Moderno**: Chrome, Firefox, Safari ou Edge

---

## 2. Configuração de Ambiente e Instalação

### Passo 1: Instalação das dependências do monorepo
```bash
# Na raiz do repositório
pnpm install
```

### Passo 2: Configuração das Variáveis de Ambiente
Criar os arquivos de ambiente a partir dos exemplos sanitizados:

**`apps/api/.env`**:
```env
PORT=3001
NODE_ENV=development
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/planejador_bncc?schema=public"
JWT_SECRET="segredo-local-para-testes-jwt-deve-ter-ao-menos-32-chars"
COOKIE_SECRET="segredo-local-para-assinatura-de-cookies"
REFRESH_TOKEN_EXPIRES_IN_HOURS=8
ACCESS_TOKEN_EXPIRES_IN_MINUTES=15
COOKIE_SECURE=false

# n8n Webhook Integration
N8N_WEBHOOK_URL="http://localhost:5678/webhook/planejador-bncc"
N8N_API_KEY="chave-api-local-n8n"
N8N_TIMEOUT_MS=45000
N8N_MOCK_ENABLED=true

# Credenciais do Seed Local
DEMO_PASSWORD_ANA="demo123"
DEMO_PASSWORD_MARCOS="demo123"
```

**`apps/web/.env.local`**:
```env
NEXT_PUBLIC_API_URL="http://localhost:3001/api"
```

### Passo 3: Inicialização do Banco de Dados
```bash
# Iniciar o container do PostgreSQL em segundo plano
docker compose up -d postgres

# Executar as migrações declarativas do Prisma na API
pnpm --filter api prisma migrate dev

# Executar o seed idempotente (cria usuários de demonstração e carrega o catálogo BNCC)
pnpm --filter api prisma db seed
```

---

## 3. Comandos de Execução e Verificação (Scripts Raiz)

| Comando | Descrição |
| :--- | :--- |
| `pnpm dev` | Inicia simultaneamente a API (`http://localhost:3001`) e a Web (`http://localhost:3000`) |
| `pnpm lint` | Executa o linter estático em todos os workspaces |
| `pnpm typecheck` | Valida a checagem de tipos TypeScript (`tsc --noEmit`) |
| `pnpm test` | Executa os testes unitários (regras de domínio, schemas e componentes) |
| `pnpm test:integration` | Executa os testes de integração de ponta a ponta com banco e mock n8n |
| `pnpm build` | Gera os pacotes de produção otimizados de `apps/api` e `apps/web` |

---

## 4. Cenários de Validação Ponta a Ponta

### Cenário 1: Autenticação, Cookie Seguro e Isolamento de Sessão (US 1 / FR-001, FR-002)
1. Abra o navegador em `http://localhost:3000/login`.
2. Observe o split layout fiel ao frame [`02-login-credenciais-invalidas.png`](file:///C:/Users/Marcio/workspace/planejador-bncc/docs/design/02-login-credenciais-invalidas.png).
3. Teste o fluxo de erro digitando `ana@escola.demo.br` e senha errada:
   - Verifique os contornos vermelhos nos campos e o banner *"Não foi possível entrar"*.
4. Clique no botão de demonstração rápida **"Usar conta"** da **Profª Ana Souza** (`ana@demo.bncc.br` / `demo123`) e clique em **"Entrar"**.
5. No DevTools (aba Application/Storage), verifique:
   - O cookie `bncc_refresh_token` está presente com as flags `HttpOnly` e `SameSite=Strict`.
   - O Access Token JWT reside em memória e não no `localStorage`.
6. O sistema redireciona com sucesso para `/planos`.

### Cenário 2: Catálogo BNCC e Validação de Limites (US 2 / FR-005, FR-007)
1. Navegue para `http://localhost:3000/planos/novo`.
2. Visualize o catálogo de habilidades carregado do arquivo [`docs/data/bncc-recorte.json`](file:///C:/Users/Marcio/workspace/planejador-bncc/docs/data/bncc-recorte.json).
3. Utilize os filtros de nível (Ensino Fundamental) e ano (1º e 2º ano) e a busca textual.
4. Selecione a habilidade `EF01CO01` e depois `EF01CO02`:
   - Verifique os chips azuis com botão de exclusão `(x)` na coluna da direita.
5. Tente prosseguir sem preencher a duração ou com duração `0`:
   - O campo é destacado com borda vermelha e a mensagem *"Informe uma duração maior que zero"*.
   - O botão *"Gerar rascunho com IA"* permanece desabilitado.

### Cenário 3: Geração Assistida por IA com Mock e Atomicidade (US 3 / FR-010, FR-012)
1. Com `N8N_MOCK_ENABLED=true`, informe:
   - Título provisório: `"Água e vida no território"`
   - Instrução pedagógica: `"Investigação prática em duplas"`
   - Duração: `50`
   - Recursos digitais: `Sim`
2. Clique no botão habilitado **"Gerar rascunho com IA"**:
   - O card de carregamento aparece no topo com barra de progresso (fiel ao frame [`06-novo-plano-preparando-rascunho.png`](file:///C:/Users/Marcio/workspace/planejador-bncc/docs/design/06-novo-plano-preparando-rascunho.png)).
   - Todos os botões e campos ficam travados contra submissão dupla.
3. Após a resposta simulada:
   - O plano é salvo com status `RASCUNHO`, `aiAssisted=true` e vinculado à Profª Ana.
   - O registro correspondente em `AiRun` é atualizado para `SUCCEEDED`.
   - O usuário é levado para a tela de edição do rascunho (`/planos/{id}/editar`).

### Cenário 4: Falha de Geração e Preservação de Formulário (US 3 / FR-013, FR-014)
1. No formulário de novo plano, insira no texto da instrução a palavra-chave `[MOCK_ERROR]`.
2. Clique em **"Gerar rascunho com IA"**:
   - A chamada falha propositalmente com HTTP 502/500.
3. Verifique na interface (fiel ao frame [`07-novo-plano-falha-geracao.png`](file:///C:/Users/Marcio/workspace/planejador-bncc/docs/design/07-novo-plano-falha-geracao.png)):
   - O banner vermelho exibe: *"Não foi possível gerar o rascunho. O processamento foi interrompido e nenhum plano foi salvo..."*.
   - **Todos os campos continuam preenchidos** (habilidades selecionadas, título, instrução, duração).
   - O botão é alterado para **"Tentar gerar novamente"**.
4. No banco de dados, comprove que a tabela `plans` **não possui nenhum registro órfão** e a tabela `ai_runs` registrou o status `FAILED`.

### Cenário 5: Edição em Markdown, Visualização Formatada e Confirmação de Saída (US 4 / FR-015, FR-018)
1. Na tela `/planos/{id}/editar` (frame [`08-rascunho-gerado-editor-previsualizacao.png`](file:///C:/Users/Marcio/workspace/planejador-bncc/docs/design/08-rascunho-gerado-editor-previsualizacao.png)):
   - Verifique as abas `Editor Markdown` e `Pré-visualização`.
   - No desktop, observe o split view com o texto cru à esquerda e a formatação rica higienizada (sem XSS) à direita.
2. Altere uma linha no Markdown:
   - O subtítulo muda para *"Alterações não salvas"*.
3. Tente clicar no botão *"<- Sair"* ou fechar a página sem salvar:
   - O modal central de confirmação de saída é renderizado (frame [`09-rascunho-confirmacao-saida.png`](file:///C:/Users/Marcio/workspace/planejador-bncc/docs/design/09-rascunho-confirmacao-saida.png)) alertando sobre perda de alterações.
4. Clique em *"Continuar editando"*, depois clique em **"Salvar alterações"**:
   - O banner verde de confirmação aparece e os dados persistem no PostgreSQL.

### Cenário 6: Isolamento Estrito entre Docentes e Proteção 404 (US 5 / FR-020)
1. Copie o ID do plano criado pela Profª Ana (ex.: `cly...123`).
2. Faça logout clicando no ícone superior direito.
3. Na tela de login, selecione a conta do **Prof. Marcos Lima** (`marcos@demo.bncc.br` / `demo123`).
4. Acesse `/planos`:
   - A lista de planos do Prof. Marcos exibe o estado vazio (frame [`04-meus-planos-estado-vazio.png`](file:///C:/Users/Marcio/workspace/planejador-bncc/docs/design/04-meus-planos-estado-vazio.png)) comprovando que ele não enxerga os planos da Profª Ana.
5. Tente colar diretamente na barra de endereço a URL de edição do plano da Profª Ana: `http://localhost:3000/planos/cly...123/editar`.
6. Verifique o resultado:
   - A API e o frontend respondem com status **HTTP 404 (Não Encontrado)**, ocultando se o identificador sequer existe e impedindo qualquer visualização ou edição não autorizada.
