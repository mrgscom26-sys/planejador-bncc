# Feature Specification: Planejador de Aulas BNCC

**Feature Branch**: `docs/especificacao`

**Created**: 2026-10-01

**Status**: Draft

**Input**: User description: "Desenvolver o Planejador BNCC para uso de professores. O professor entra com uma conta de demonstração previamente cadastrada. Após o login, consulta habilidades BNCC por nível, ano quando aplicável, eixo, código ou texto e seleciona uma ou mais habilidades. Informa uma instrução pedagógica, duração em minutos e se utilizará recursos digitais. Ao confirmar, visualiza um estado de preparação. O serviço de IA recebe a solicitação. Se a resposta for válida, a aplicação salva um plano privado em estado RASCUNHO, com indicação de auxílio por IA. O professor vê o Markdown, pode editá-lo, visualizar sua apresentação, salvar explicitamente e consultar a lista de seus rascunhos. Se a geração falhar, os campos são preservados e nenhum plano parcial é salvo. Uma nova tentativa é iniciada somente por ação do professor. Outro professor não pode ler nem editar o rascunho. Incluir login, logout, sessão, catálogo mínimo e duas contas de demonstração para testar o acesso privado. Sem cadastro público nem administração. Sem PDF, finalização, versionamento de planos ou publicação pública deles. Defina histórias priorizadas e critérios de aceitação verificáveis. Ainda não implemente código."

## Clarifications

### Session 2026-10-01
- Q: Como o sistema deve responder quando um professor autenticado tentar acessar diretamente pela URL o identificador de um rascunho pertencente a outro professor? (FR-020) → A: Retornar status 404 (Não Encontrado), ocultando se o identificador sequer existe no sistema para evitar enumeração de recursos e assegurar privacidade estrita.
- Q: Qual deve ser a política de duração e expiração da sessão autenticada do professor nas contas de demonstração? (FR-002) → A: Sessão com validade de 8 horas (jornada escolar diária) mantida via cookie seguro HTTP-only (SameSite), com renovação em atividade e encerramento imediato no logout explícito.
- Q: Qual deve ser a regra de limite quantitativo de habilidades da BNCC selecionáveis para um único plano de aula? (FR-007) → A: Mínimo de 1 e máximo de 3 habilidades da BNCC por plano de aula, assegurando foco didático plausível e validação determinística no formulário.
- Q: Qual deve ser o tempo limite (timeout) para a chamada de integração ao serviço de IA antes de abortar a operação e acionar a falha atômica com preservação dos dados? (FR-011) → A: Timeout estrito de 45 segundos; caso excedido ou se houver erro de rede/resposta malformada, a requisição é abortada atomicamente, nenhum plano parcial é salvo no banco de dados e os campos do formulário permanecem intactos para nova tentativa voluntária.
- Q: Como o editor deve disponibilizar a alternância entre a edição direta do Markdown e a visualização formatada da apresentação para garantir usabilidade em desktop, tablet e celular? (FR-016) → A: Abas comutáveis responsivas ('Editar' e 'Visualizar') por padrão em todos os dispositivos, com suporte adicional ao modo de visualização lado a lado (split view) em telas desktop com largura suficiente.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Autenticação Básica e Isolamento de Sessão de Demonstração (Priority: P1)

Como professor, desejo acessar o sistema com minha conta de demonstração pré-cadastrada e encerrar minha sessão com segurança, para que meus dados e planejamentos pedagógicos fiquem restritos ao meu perfil.

**Why this priority**: É o alicerce de identidade e segurança do sistema. Sem autenticação e sessão individualizada, não é possível garantir a propriedade privada dos planos de aula nem o cumprimento das regras de autorização docente.

**Independent Test**: Pode ser testado de forma isolada autenticando com uma das contas de demonstração, verificando a criação da sessão ativa válida por 8 horas em cookie seguro, acessando a área autenticada e, em seguida, efetuando o logout para confirmar o término da sessão e redirecionamento à tela de login.

**Acceptance Scenarios**:

1. **Given** que o usuário está na tela de autenticação e insere credenciais válidas de uma das contas de demonstração (ex.: Professor 1), **When** solicita a entrada, **Then** o sistema estabelece a sessão autenticada persistida por até 8 horas via cookie HTTP-only e redireciona o usuário para o painel principal do planejador.
2. **Given** que o usuário insere credenciais incorretas ou não cadastradas, **When** tenta autenticar-se, **Then** o sistema rejeita o acesso, exibe mensagem clara de erro sem expor detalhes internos e mantém o usuário na tela de login.
3. **Given** que um professor está autenticado em sua sessão, **When** aciona a opção de logout, **Then** o sistema invalida a sessão ativa, limpa os dados do usuário em memória do cliente e redireciona para a tela de login.
4. **Given** que um usuário não autenticado tenta acessar diretamente qualquer rota interna do planejador via URL, **When** a requisição é interceptada, **Then** o acesso é bloqueado e o usuário é redirecionado à página de login.

---

### User Story 2 - Consulta e Seleção de Habilidades no Catálogo BNCC (Priority: P1)

Como professor autenticado, desejo consultar o catálogo de habilidades da BNCC utilizando filtros pedagógicos e selecionar entre 1 e 3 habilidades, para fundamentar a elaboração do meu plano de aula nas diretrizes curriculares oficiais.

**Why this priority**: A conformidade com a BNCC é o núcleo pedagógico do produto. O professor precisa selecionar habilidades válidas antes de solicitar qualquer auxílio à IA.

**Independent Test**: Pode ser testado pesquisando e filtrando habilidades por nível (ex.: Ensino Fundamental), ano (ex.: 6º ano), eixo/componente (ex.: Língua Portuguesa), código (ex.: EF06LP01) ou termos textuais, marcando duas habilidades (dentro do limite permitido de 1 a 3) e confirmando que a seleção é exibida com clareza para a etapa seguinte.

**Acceptance Scenarios**:

1. **Given** que o professor está na tela de planejamento, **When** aplica filtros por nível de ensino, ano escolar, eixo temático ou insere um código/termo de busca, **Then** o catálogo exibe instantaneamente a lista de habilidades correspondentes com código oficial, componente e descrição pedagógica.
2. **Given** que o professor visualiza a lista filtrada, **When** marca entre 1 e 3 habilidades, **Then** o sistema adiciona as habilidades à lista de seleção ativa, destacando-as visualmente e permitindo a remoção individual a qualquer momento.
3. **Given** que o professor busca por um termo ou código que não existe no catálogo, **When** a busca é executada, **Then** o sistema exibe uma indicação visual amigável de que nenhuma habilidade foi encontrada, sugerindo a revisão dos filtros aplicados.
4. **Given** que o professor não selecionou nenhuma habilidade da BNCC (0 habilidades) ou tenta selecionar uma 4ª habilidade excedendo o limite, **When** tenta avançar ou marcar o item excedente, **Then** o sistema impede a ação e sinaliza com clareza que o plano deve conter entre 1 e 3 habilidades.

---

### User Story 3 - Configuração Pedagógica e Geração Atômica do Rascunho com IA (Priority: P1)

Como professor, desejo informar a instrução pedagógica, a duração da aula e o uso de recursos digitais para solicitar a geração assistida do plano, recebendo um rascunho privado somente se o serviço de IA responder com sucesso e integridade.

**Why this priority**: Representa a proposta de valor central do produto (planejamento assistido por IA com integridade transacional). Em caso de erro, os dados digitados não podem ser perdidos e planos corrompidos não podem ser salvos.

**Independent Test**: Pode ser testado preenchendo os parâmetros pedagógicos e submetendo a geração em dois cenários: (1) com resposta válida da IA, verificando a criação do plano privado em estado `RASCUNHO` com aviso de auxílio de IA; e (2) com simulação de falha ou resposta corrompida, verificando que nenhum plano é persistido no banco e os dados do formulário permanecem intactos na tela.

**Acceptance Scenarios**:

1. **Given** que o professor selecionou habilidades e preencheu instrução pedagógica, duração em minutos (valor numérico positivo) e indicação de recursos digitais (sim/não), **When** confirma a solicitação de geração, **Then** a interface apresenta um estado visual claro de preparação/carregamento e os botões de ação ficam desabilitados para evitar envios duplicados.
2. **Given** que o serviço de IA processa a solicitação e retorna uma estrutura de plano pedagógico válida, **When** a resposta é recebida e validada pelo sistema, **Then** a aplicação salva atomicamente o plano com status `RASCUNHO`, vinculado exclusivamente ao professor logado, exibindo a indicação explícita de "Auxiliado por Inteligência Artificial".
3. **Given** que a chamada ao serviço de IA falha por indisponibilidade, timeout de 45 segundos excedido ou resposta estruturalmente inválida, **When** o erro é interceptado, **Then** nenhum plano parcial ou registro órfão é salvo na base de dados, a interface exibe mensagem amigável de falha e todos os campos previamente preenchidos (habilidades, instrução, duração, recursos) permanecem preservados no formulário.
4. **Given** que ocorreu uma falha de geração e o formulário está preservado, **When** o professor decide tentar novamente, **Then** a nova tentativa é iniciada exclusivamente por clique voluntário no botão de reenvio, sem qualquer tentativa automática repetitiva em segundo plano.

---

### User Story 4 - Edição em Markdown, Visualização da Apresentação e Salvamento Explícito (Priority: P2)

Como professor, desejo inspecionar o conteúdo gerado em Markdown, editar o texto livremente, alternar para a visualização formatada da aula e salvar as alterações explicitamente, garantindo controle pedagógico total sobre o rascunho.

**Why this priority**: Cumpre o princípio constitucional de que toda saída de IA é um rascunho preliminar sob homologação do educador, permitindo refinamentos manuais antes do uso em sala de aula.

**Independent Test**: Pode ser testado abrindo um rascunho gerado, modificando trechos no editor Markdown, alternando para a aba/modo de visualização formatada (preview renderizado), clicando em salvar e recarregando a página para confirmar que as edições manuais persistiram fielmente.

**Acceptance Scenarios**:

1. **Given** que um rascunho foi gerado com sucesso, **When** o professor acessa a tela de detalhe do plano, **Then** o sistema disponibiliza o conteúdo completo estruturado em Markdown dentro de uma área de edição direta.
2. **Given** que o professor está na tela do rascunho, **When** interage com o editor, **Then** o sistema oferece abas comutáveis responsivas ('Editar' e 'Visualizar') em qualquer dispositivo, além de opção de visualização simultânea lado a lado (split view) em telas desktop com largura suficiente, renderizando formatação rica (títulos, listas, tabelas e destaques) com integridade textual.
3. **Given** que o professor realizou alterações no texto do Markdown, **When** clica na ação explícita de salvar rascunho, **Then** o sistema persiste as modificações no banco de dados e apresenta notificação de confirmação de salvamento bem-sucedido.
4. **Given** que o professor tenta navegar para outra tela ou fechar a aba com modificações não salvas no editor, **When** o evento de navegação ocorre, **Then** o sistema exibe alerta preventivo solicitando confirmação para evitar perda acidental do trabalho.

---

### User Story 5 - Consulta da Lista Pessoal e Isolamento Estrito entre Professores (Priority: P2)

Como professor autenticado, desejo visualizar o histórico de todos os meus rascunhos salvos, tendo a certeza de que outro professor jamais poderá visualizar, listar ou editar meus planejamentos.

**Why this priority**: Garante a governança de dados, organização do trabalho docente e validação prática da regra de autorização por posse (RBAC / ownership).

**Independent Test**: Pode ser testado autenticando como Professor 1, criando dois rascunhos, confirmando a listagem; em seguida, autenticando como Professor 2, confirmando que a lista deste está vazia e que tentativas de acessar a URL de edição dos planos do Professor 1 resultam em bloqueio de acesso (403/404).

**Acceptance Scenarios**:

1. **Given** que o professor está autenticado e possui rascunhos salvos, **When** acessa a seção de seus rascunhos, **Then** o sistema lista apenas os planos pertencentes a ele, exibindo data de criação/atualização, habilidades associadas, duração e o selo de auxílio por IA.
2. **Given** que um professor autenticado (Professor 2) tenta acessar diretamente a rota de consulta ou edição de um rascunho pertencente a outro professor (Professor 1), **When** a solicitação é processada, **Then** o sistema retorna status 404 (Não Encontrado), omitindo completamente se o identificador existe no sistema para evitar enumeração de dados e proteger a privacidade docente.
3. **Given** que um professor não possui nenhum rascunho cadastrado, **When** visita a lista de rascunhos, **Then** a interface apresenta um estado vazio acolhedor com orientação e atalho para criar seu primeiro plano.

---

### Edge Cases

- **Tentativa de selecionar mais de 3 habilidades**: Caso o professor tente selecionar uma 4ª habilidade no catálogo, a interface deve desabilitar novas seleções e informar que o plano suporta de 1 a 3 habilidades simultâneas.
- **Tentativa de acesso direto a plano de outro professor**: Se o professor autenticado tentar acessar via URL ou payload o ID de um rascunho que pertença a outro usuário, o sistema deve tratar a requisição como inexistente (HTTP 404), sem revelar detalhes do registro.
- **Entrada com dados de duração inválidos**: Se o professor informar duração igual a zero, negativa, não numérica ou valor irreal (ex.: 9999 minutos), o formulário deve impedir o envio e sinalizar o intervalo permitido (ex.: entre 10 e 480 minutos).
- **Instrução pedagógica em branco ou excessivamente curta**: Se o professor tentar gerar um plano sem fornecer instrução pedagógica ou com texto vazio, a validação deve orientar o preenchimento de diretrizes mínimas para a aula.
- **Interrupção de conexão de rede durante a geração da IA**: Caso o cliente perca a conectividade durante o estado de preparação, a aplicação não deve perder os dados preenchidos no formulário e deve permitir que o professor reenvie assim que a conexão for reestabelecida.
- **Resposta da IA truncada ou sem seções essenciais**: Se o serviço de IA retornar texto incompleto, inválido ou fora da estrutura mínima necessária, a camada de validação deve rejeitar o retorno, não persistir nada no banco de dados e tratar como falha de geração.
- **Tentativa de acesso com sessão expirada**: Se a sessão do professor expirar enquanto ele preenche parâmetros ou edita um rascunho, o sistema deve alertar sobre a expiração, oferecer oportunidade de preservar as edições locais e exigir reautenticação sem expor planos a terceiros.
- **Nenhum resultado nos filtros da BNCC**: Selecionar combinações de filtros sem habilidades cadastradas deve exibir mensagem amigável com opção rápida para limpar filtros, sem causar travamento na interface.

---

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: O sistema DEVE disponibilizar autenticação por credenciais com duas contas de demonstração pré-configuradas para avaliação e testes de isolamento de acesso.
- **FR-002**: O sistema DEVE manter a sessão do professor autenticado ativa por até 8 horas por meio de cookie seguro (HTTP-only e SameSite), com renovação durante a atividade e encerramento imediato via opção explícita de logout.
- **FR-003**: O sistema NÃO DEVE fornecer mecanismo de auto-cadastro público de novos usuários nem módulo administrativo de gestão de usuários nesta versão.
- **FR-004**: O sistema DEVE restringir o acesso a qualquer funcionalidade pedagógica exclusivamente a usuários autenticados.
- **FR-005**: O sistema DEVE fornecer um catálogo mínimo de habilidades da BNCC estruturado por nível de ensino, ano escolar (quando aplicável), componente curricular/eixo, código oficial e texto descritivo.
- **FR-006**: O sistema DEVE permitir a busca e filtragem dinâmica de habilidades por nível, ano escolar, eixo temático, código de habilidade ou busca textual em tempo real.
- **FR-007**: O sistema DEVE validar e permitir a seleção de no mínimo 1 e no máximo 3 habilidades da BNCC para compor um único plano de aula, impedindo o envio se nenhuma ou mais de 3 habilidades estiverem selecionadas.
- **FR-008**: O sistema DEVE permitir a visualização detalhada e a remoção individual de qualquer habilidade selecionada antes do envio.
- **FR-009**: O sistema DEVE capturar os seguintes parâmetros obrigatórios para a geração do plano: seleção de ao menos uma habilidade da BNCC, texto de instrução pedagógica, duração estimada da aula em minutos (inteiro positivo) e indicador binário de uso de recursos digitais.
- **FR-010**: Ao submeter a geração, o sistema DEVE apresentar estado visual de preparação (indicador de progresso/carregamento) e desabilitar nova submissão enquanto o processamento estiver ativo.
- **FR-011**: O sistema DEVE enviar a solicitação ao serviço de IA estabelecendo tempo limite (timeout) estrito de 45 segundos e validar rigorosamente o formato e integridade da resposta retornada antes de qualquer persistência.
- **FR-012**: Se a resposta da IA for válida, o sistema DEVE salvar o plano de aula no banco de dados exclusivamente no estado `RASCUNHO`, associado ao identificador do professor autenticado e com flag indicadora de auxílio por IA.
- **FR-013**: Se a resposta da IA for inválida ou o serviço falhar, o sistema DEVE garantir atomicidade, impedindo a gravação de planos parciais ou inconsistentes no banco de dados.
- **FR-014**: Em caso de falha na geração, o sistema DEVE preservar todos os valores inseridos pelo professor no formulário e somente permitir nova tentativa por ação explícita e voluntária do usuário.
- **FR-015**: O sistema DEVE apresentar o plano gerado em formato Markdown editável, permitindo inserção, exclusão e alteração direta do texto pelo professor.
- **FR-016**: O sistema DEVE prover modo de visualização formatada (preview renderizado) do conteúdo em Markdown por meio de abas comutáveis ('Editar' e 'Visualizar') responsivas em qualquer dispositivo (celular, tablet e desktop), disponibilizando adicionalmente suporte ao modo lado a lado (split view) em telas desktop com largura compatível.
- **FR-017**: O sistema DEVE permitir ao professor salvar explicitamente as alterações realizadas no rascunho a qualquer momento.
- **FR-018**: O sistema DEVE fornecer aviso preventivo se o usuário tentar sair da tela com modificações no rascunho pendentes de salvamento.
- **FR-019**: O sistema DEVE exibir a lista de planos de aula salvos pertencentes estritamente ao professor autenticado.
- **FR-020**: O sistema DEVE impedir categoricamente que um professor visualize, edite, exclua ou liste planos pertencentes a outro professor; qualquer tentativa de acesso direto via rota/identificador de plano alheio DEVE responder com status 404 (Não Encontrado).
- **FR-021**: O sistema NÃO DEVE contemplar exportação para PDF, publicação pública de planos, finalização/homologação de planos ou histórico de versionamento nesta etapa do produto.
- **FR-022**: A interface DEVE ser responsiva e utilizável em telas de desktop, tablet e celular, respeitando padrões de acessibilidade WCAG 2.1 AA (navegação por teclado, contraste e suporte a leitores de tela).

---

### Key Entities *(include if feature involves data)*

- **Professor (Usuário)**:
  - Representa o educador autenticado no sistema.
  - Atributos principais: identificador único, nome completo, e-mail institucional/demonstração, credencial segura de autenticação.
  - Relacionamentos: possui zero ou muitos Planos de Aula.

- **Habilidade BNCC**:
  - Representa uma unidade curricular oficial da Base Nacional Comum Curricular.
  - Atributos principais: código alfanumérico oficial (ex.: EF01LP01), nível de ensino (ex.: Ensino Fundamental), ano/faixa escolar aplicável, componente curricular/eixo, descrição detalhada da competência/habilidade.
  - Relacionamentos: pode ser referenciada por múltiplos Planos de Aula.

- **Plano de Aula (Rascunho)**:
  - Representa a sequência didática em elaboração por um professor.
  - Atributos principais: identificador único, identificador do professor proprietário, status (`RASCUNHO`), conteúdo em Markdown, instrução pedagógica original, duração estimada em minutos, indicador de uso de recursos digitais, indicador de assistência por IA (`true`), data/hora de criação, data/hora da última alteração.
  - Relacionamentos: pertence obrigatoriamente a um único Professor; associa-se a uma ou mais Habilidades BNCC.

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% das tentativas de leitura, listagem ou edição de rascunhos de outro professor são interceptadas e bloqueadas com recusa formal de acesso (isolamento estrito entre as contas de demonstração).
- **SC-002**: Em 100% dos cenários de timeout (excedendo 45 segundos), desconexão ou resposta inválida da IA, nenhum registro de plano parcial ou corrompido é persistido no banco de dados (atomicidade estrita).
- **SC-003**: Em 100% das falhas de geração da IA, os dados informados no formulário (habilidades selecionadas, instrução, duração e recursos) são preservados na tela sem recarregamento destrutivo.
- **SC-004**: Um professor familiarizado com o sistema consegue selecionar habilidades, configurar parâmetros pedagógicos e submeter a solicitação em menos de 2 minutos.
- **SC-005**: O tempo de renderização entre o editor Markdown e o modo de visualização formatada (preview) ocorre em menos de 200 ms percebidos pelo usuário.
- **SC-006**: Todos os componentes interativos do fluxo (formulários, filtros, botões e editor) são navegáveis via teclado e compatíveis com leitores de tela em conformidade com critérios WCAG 2.1 nível AA.
- **SC-007**: 100% dos planos salvos no sistema possuem estado inicial `RASCUNHO` e indicação explícita e visível de que foram auxiliados por Inteligência Artificial.

---

## Assumptions

- **Catálogo Mínimo da BNCC**: O ambiente conterá um conjunto prévio e estático de habilidades representativas da BNCC carregadas na inicialização (seed), viabilizando testes de filtros e buscas sem dependência de APIs externas de currículo.
- **Contas de Demonstração**: Serão fornecidas duas contas de teste (ex.: `prof.ana@bncc.local` e `prof.carlos@bncc.local`) com senhas pré-definidas para avaliação das regras de privacidade e propriedade.
- **Serviço de IA Desacoplado**: O backend intermediará a comunicação com a API de IA mantendo chaves de acesso em segredo de ambiente, entregando o conteúdo de volta à aplicação conforme estabelecido no princípio constitucional II.
- **Navegadores Alvo**: A interface é compatível com as versões recentes dos principais navegadores modernos (Chrome, Firefox, Safari, Edge) em dispositivos móveis, tablets e computadores de mesa.
- **Escopo Delimitado**: Funcionalidades avançadas como exportação para PDF/DOCX, workflows de aprovação por coordenação, compartilhamento público de planos e histórico de versões estão deliberadamente excluídas desta especificação, atendendo estritamente ao escopo solicitado.
