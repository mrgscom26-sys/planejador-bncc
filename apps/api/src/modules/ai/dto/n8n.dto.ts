import { z } from 'zod';

export const N8nRequestSchema = z.object({
  sessao: z.string().email(),
  habilidade: z.string().min(1),
  instrucao: z.string().min(5),
  duracao: z.number().int().min(10).max(480),
  recursos_digitais: z.boolean(),
});

export type N8nRequest = z.infer<typeof N8nRequestSchema>;

export const N8nSuccessResponseSchema = z.object({
  success: z.literal(true),
  sessao: z.string().min(1).optional(),
  habilidade: z.string().min(1).optional(),
  answer: z.string().min(10),
  format: z.literal('markdown'),
});

export type N8nSuccessResponse = z.infer<typeof N8nSuccessResponseSchema>;

export function formatSkillsForN8n(skills: { codigo: string; descricao: string }[]): string {
  if (!skills || skills.length === 0) {
    throw new Error('Pelo menos uma habilidade deve ser selecionada.');
  }
  if (skills.length > 3) {
    throw new Error('No máximo 3 habilidades podem ser selecionadas.');
  }
  return skills.map((s) => `${s.codigo} — ${s.descricao}`).join('\n\n');
}
