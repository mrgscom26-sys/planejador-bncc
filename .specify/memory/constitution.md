# Planejador BNCC Constitution

## Core Principles

### I. Especificação Prévia e Critérios de Aceitação (Spec-First)
Nenhum código de implementação DEVE ser iniciado sem especificação prévia do comportamento e critérios de aceitação objetivos e verificáveis. Cada funcionalidade DEVE ter seus cenários de sucesso, limites de borda e fluxos de erro formalmente documentados antes do desenvolvimento.
*Rationale*: Garante alinhamento pedagógico e técnico antecipado, evitando retrabalho e inconsistências no planejamento curricular.

### II. Segregação de Camadas e Gestão Centralizada de Segredos
A arquitetura DEVE isolar rigorosamente as responsabilidades entre frontend (interface), API (serviços de negócio) e integrações externas (provedores de IA e serviços educacionais). Chaves de API, credenciais de terceiros, tokens privados e quaisquer segredos de ambiente DEVEM residir estritamente no backend e NUNCA ser expostos ao cliente ou trafegar desprotegidos.
*Rationale*: Previne vazamento de credenciais críticas e desacopla a camada de apresentação das regras e integrações de servidor.

### III. Autenticação e Autorização por Propriedade Docente
Todo acesso às operações da aplicação DEVE ser autenticado. Cada leitura, criação, modificação, exclusão ou exportação de plano de aula DEVE validar explicitamente a autorização do professor, assegurando que o usuário acesse estritamente os planos de sua própria autoria ou concedidos formalmente por compartilhamento.
*Rationale*: Protege a privacidade do trabalho pedagógico docente e impede vulnerabilidades de acesso indevido por referência direta (IDOR).

### IV. Saída de IA como Rascunho Assistido e Revisão Docente
Todo conteúdo gerado por modelos de Inteligência Artificial DEVE ser tratado como rascunho preliminar editável e sugestivo, nunca como plano homologado automaticamente. O sistema DEVE exigir intervenção e validação explícita do professor antes da persistência definitiva ou exportação do plano de aula alinhado à BNCC.
*Rationale*: Assegura a soberania e a responsabilidade pedagógica do educador sobre o plano curricular, mitigando alucinações e inadequações da IA.

### V. Validação Estrita e Atomicidade Operacional
Todas as entradas fornecidas pelo usuário e respostas retornadas por serviços externos DEVEM ser validadas contra esquemas rígidos antes do consumo. Se ocorrer qualquer falha durante a validação ou comunicação com terceiros, a operação DEVE ser abortada atomicamente sem persistir planos incompletos, registros corrompidos ou estados intermediários órfãos.
*Rationale*: Garante integridade do banco de dados e confiabilidade do ecossistema, eliminando planos parciais inutilizáveis.

### VI. Persistência Declarativa com Migrations e Seeds Reproduzíveis
Toda alteração na estrutura do banco de dados DEVE ser gerenciada exclusivamente por meio de migrações (migrations) declarativas e versionadas. O repositório DEVE conter scripts de seed determinísticos e reproduzíveis, viabilizando a recriação fiel do estado da base (incluindo referenciais da BNCC) em qualquer ambiente de desenvolvimento ou teste.
*Rationale*: Proporciona repetibilidade de testes locais, previsibilidade de deploy e independência de dados voláteis.

### VII. Design System Coerente (Figma Tokens), Responsividade e Acessibilidade
A interface DEVE consumir de forma sistemática os tokens (cores, espaçamentos, tipografia) e componentes definidos no Design System do Figma. O layout DEVE ser totalmente responsivo com suporte oficial para dispositivos móveis (celular), tablets e desktop, atendendo aos padrões de acessibilidade digital (WCAG 2.1 nível AA com navegação por teclado, contraste e suporte a leitores de tela).
*Rationale*: Garante consistência visual profissional e permite que professores planejem suas aulas com ergonomia em qualquer contexto de trabalho.

### VIII. Testes Críticos, Rastreabilidade e Higiene de Repositório
Todos os fluxos críticos de negócio (validação BNCC, permissões de acesso, geração via IA e exportação) DEVEM possuir testes automatizados que comprovem seu comportamento. A execução de rotinas e comandos DEVE estar documentada em guias rastreáveis. Arquivos de variáveis locais (`.env`), certificados e credenciais NUNCA DEVEM ser adicionados ao controle de versão Git.
*Rationale*: Preserva a segurança do repositório contra incidentes graves e mantém a qualidade contínua do produto durante todo o ciclo de vida.

## Requisitos Técnicos e Diretrizes de Engenharia

- **Tipagem Estática e Contratos Rígidos**: Código de frontend e backend DEVE empregar tipagem estática e validação declarativa de esquemas nas fronteiras de rede (ex.: formulários, payloads de requisição e respostas de APIs externas).
- **Tratamento de Exceções e Resiliência**: Falhas de serviços externos (incluindo timeouts e indisponibilidade de IA) DEVEM ser tratadas graciosamente com mensagens explicativas para o educador, sem exibição de stack traces técnicos ou perda do formulário em edição.
- **Exportação Fiel e Interoperável**: Exportações em formatos externos (PDF/DOCX) DEVEM reproduzir com exatidão a estrutura aprovada pelo professor e garantir acessibilidade nos documentos gerados.
- **Isolamento de Segredos e Configuração por Ambiente**: O carregamento de variáveis sensíveis DEVE ocorrer via variáveis de ambiente injetadas no runtime do servidor, mantendo arquivos `.env.example` sanitizados como única referência no repositório.

## Fluxo de Desenvolvimento e Gates de Qualidade

- **Fluxo Spec-Driven**: Antes de implementar novas rotas, telas ou serviços, é obrigatório gerar e aprovar a especificação funcional (`spec.md`), plano técnico (`plan.md`) e lista de tarefas (`tasks.md`).
- **Checklist de Aceite em Pull Requests (Quality Gates)**:
  1. Testes automatizados cobrindo os cenários críticos e caminhos de exceção.
  2. Validação estática de tipos, lint e formatação aprovados sem pendências.
  3. Conformidade visual e de responsividade com os tokens do Figma.
  4. Migrações e seeds atualizados e testados em caso de alteração de esquema.
  5. Auditoria de git diff confirmando ausência absoluta de chaves de API, credenciais ou arquivos `.env`.
- **Convenções de Commit**: Commits DEVEM seguir a especificação Conventional Commits (ex.: `feat:`, `fix:`, `refactor:`, `docs:`, `test:`), proporcionando histórico auditável.

## Governance

Esta constituição é o instrumento normativo fundamental do repositório Planejador BNCC e tem supremacia sobre decisões ad-hoc ou conveniências temporárias de desenvolvimento.

- **Processo de Emenda**: Qualquer alteração, inclusão ou revogação de princípios requer proposta documentada, revisão de impacto em tarefas existentes e aprovação expressa da liderança técnica do projeto.
- **Versionamento Semântico da Constituição**:
  - **MAJOR (vX.0.0)**: Inclusão, remoção ou redefinição substancial de princípios fundamentais ou mudanças estruturais incompatíveis.
  - **MINOR (v0.X.0)**: Acréscimo de novas diretrizes, seções de qualidade ou expansão de orientações sem alterar o núcleo normativo anterior.
  - **PATCH (v0.0.X)**: Correções gramaticais, ajustes de clareza textual ou atualizações não-semânticas.
- **Revisão de Conformidade**: Todas as especificações e artefatos gerados pelo Spec Kit DEVEM ser avaliados à luz dos 8 princípios aqui estabelecidos.

**Version**: 2.0.0 | **Ratified**: 2026-10-01 | **Last Amended**: 2026-10-01
