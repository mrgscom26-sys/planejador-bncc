# Contrato de Integração n8n: Planejador BNCC

**Origem**: [`docs/contracts/n8n.md`](file:///C:/Users/Marcio/workspace/planejador-bncc/docs/contracts/n8n.md)  
**Consumidor**: `apps/api` (`AiPlanService` / `N8nClient`)  
**Provedor**: Workflow n8n Webhook  
**Data**: 2026-10-02  

---

## 1. Protocolo e Transporte

- **Método**: `POST`
- **URL**: `${process.env.N8N_WEBHOOK_URL}`
- **Headers HTTP**:
  - `Content-Type: application/json`
  - `x-api-key: ${process.env.N8N_API_KEY}` (segredo de ambiente, nunca exposto ao cliente web)
  - `x-request-id: ${requestId}` (UUID v4 para rastreabilidade de logs)
- **Timeout**: **45 segundos estritos** via `AbortSignal.timeout(45000)`.
- **Política de Retentativa**: **Sem retry automático**. Caso ocorra falha de rede ou timeout, a requisição é abortada e a retentativa depende exclusivamente de ação manual do professor (**FR-014**).

---

## 2. Contrato da Requisição (Payload JSON)

### Schema de Validação (Zod)

```typescript
import { z } from 'zod';

export const N8nRequestSchema = z.object({
  sessao: z.string().email(),
  habilidade: z.string().min(1),
  instrucao: z.string().min(5),
  duracao: z.number().int().min(10).max(480),
  recursos_digitais: z.boolean(),
});

export type N8nRequest = z.infer<typeof N8nRequestSchema>;
```

### Exemplo de Payload Enviado

```json
{
  "sessao": "ana@demo.bncc.br",
  "habilidade": "EF01CO01 — Organizar objetos físicos ou digitais considerando diferentes características para esta organização, explicitando semelhanças (padrões) e diferenças.",
  "instrucao": "Criar uma atividade introdutória em dupla.",
  "duracao": 50,
  "recursos_digitais": true
}
```

> **Regra para Múltiplas Habilidades (1 a 3 habilidades - FR-007)**:  
> Quando o professor seleciona mais de uma habilidade, as strings formatadas `"{codigo} — {descricao}"` são unificadas no campo `habilidade` separadas por quebra de linha dupla (`\n\n`), garantindo aderência ao tipo `string` esperado pelo workflow n8n.

---

## 3. Contrato da Resposta de Sucesso

### Schema de Validação Estrita (Zod)

```typescript
export const N8nSuccessResponseSchema = z.object({
  success: z.literal(true),
  sessao: z.string().min(1),
  habilidade: z.string().min(1),
  answer: z.string().min(10),
  format: z.literal('markdown'),
});

export type N8nSuccessResponse = z.infer<typeof N8nSuccessResponseSchema>;
```

### Exemplo de Resposta do n8n (HTTP 200)

```json
{
  "success": true,
  "sessao": "ana@demo.bncc.br",
  "habilidade": "EF01CO01 — Organizar objetos físicos ou digitais...",
  "answer": "# Plano de Aula: Padrões e Organização\n\n## Objetivos Específicos\n- Identificar padrões e semelhanças em coleções de objetos.\n- Desenvolver cooperação em atividades em dupla.\n\n## Introdução (10 min)\nApresente conjuntos variados de figuras aos estudantes.\n\n## Desenvolvimento (30 min)\nEm duplas, as crianças devem classificar os cartões por cores e formas.\n\n## Fechamento (10 min)\nSocialização das regras de classificação adotadas.",
  "format": "markdown"
}
```

---

## 4. Tratamento de Exceções e Falhas

A integração entra em estado de falha quando ocorrer qualquer uma das condições:
1. Status HTTP diferente de 200 (ex.: 401, 500, 502, 503).
2. Erro de conexão / rede (`ECONNREFUSED`, `ENOTFOUND`).
3. Tempo de execução superior a 45.000 ms (`TimeoutError` / `AbortError`).
4. Resposta JSON com `success !== true` ou violação do schema de validação (`answer` vazio, ausência do campo `format`, etc.).

### Fluxo Atômico no Banco de Dados
- **Sucesso**:
  ```typescript
  await prisma.$transaction(async (tx) => {
    const plan = await tx.plan.create({
      data: {
        userId,
        title,
        instructionalGoal: instrucao,
        durationMinutes: duracao,
        useDigitalResources: recursos_digitais,
        status: 'RASCUNHO',
        markdownContent: answer,
        aiAssisted: true,
        aiRunId: aiRun.id,
        skills: { create: skillConnections },
      },
    });

    await tx.aiRun.update({
      where: { id: aiRun.id },
      data: {
        status: 'SUCCEEDED',
        rawResponse,
        latencyMs,
      },
    });
    return plan;
  });
  ```
- **Falha**:
  ```typescript
  await prisma.aiRun.update({
    where: { id: aiRun.id },
    data: {
      status: 'FAILED',
      errorMessage: error.message,
      latencyMs,
    },
  });
  // Nenhum Plan é criado. Lança exceção de domínio.
  ```

---

## 5. Mock Local para Testes (`N8N_MOCK_ENABLED=true`)

Para permitir testes de integração e desenvolvimento sem conexão com a internet ou consumo do workflow compartilhado, o `N8nClient` disponibiliza um provedor mock local:

- **Mock de Sucesso**: Simula um atraso de 300ms e retorna:
  ```json
  {
    "success": true,
    "sessao": "${request.sessao}",
    "habilidade": "${request.habilidade}",
    "answer": "# Plano de Aula (Mock Local)\n\n## Objetivos Específicos\n- Explorar a habilidade selecionada com protagonismo estudantil.\n\n## Introdução (10 min)\nAtivação de conhecimentos prévios.\n\n## Desenvolvimento (30 min)\nAtividade prática orientada.\n\n## Fechamento (10 min)\nSíntese coletiva.",
    "format": "markdown"
  }
  ```
- **Simulação de Timeout no Mock**: Quando o texto da instrução contiver a palavra-chave `[MOCK_TIMEOUT]`, o client simula delay de 46.000 ms disparando o abort para testar o comportamento de timeout.
- **Simulação de Erro no Mock**: Quando a instrução contiver `[MOCK_ERROR]`, o client lança erro 500 para validar a atomicidade e preservação do formulário.
