import { z } from 'zod';

export const GeneratePlanRequestSchema = z.object({
  skillIds: z
    .array(z.string().min(1, 'ID de habilidade inválido'))
    .min(1, 'Selecione ao menos 1 habilidade da BNCC.')
    .max(3, 'Selecione no máximo 3 habilidades da BNCC.'),
  title: z
    .string()
    .min(3, 'O título deve ter no mínimo 3 caracteres.')
    .max(120, 'O título deve ter no máximo 120 caracteres.'),
  instructionalGoal: z
    .string()
    .min(5, 'A instrução pedagógica deve ter no mínimo 5 caracteres.'),
  durationMinutes: z
    .number()
    .int('A duração deve ser um número inteiro.')
    .min(10, 'A duração mínima permitida é de 10 minutos.')
    .max(480, 'A duração máxima permitida é de 480 minutos.'),
  useDigitalResources: z.boolean(),
});

export type GeneratePlanRequest = z.infer<typeof GeneratePlanRequestSchema>;

export const UpdatePlanRequestSchema = z.object({
  title: z
    .string()
    .min(3, 'O título deve ter no mínimo 3 caracteres.')
    .max(120, 'O título deve ter no máximo 120 caracteres.'),
  markdownContent: z
    .string()
    .min(1, 'O conteúdo em Markdown não pode estar vazio.'),
});

export type UpdatePlanRequest = z.infer<typeof UpdatePlanRequestSchema>;
