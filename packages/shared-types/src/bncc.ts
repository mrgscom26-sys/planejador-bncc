export interface BnccSkill {
  id: string;
  codigo: string;
  nivel: string;
  ano: number | null;
  eixo: string;
  descricao: string;
  explicacao: string;
  exemplos: string;
}

export interface BnccSkillSummary {
  codigo: string;
  descricao: string;
}

export interface BnccQueryFilters {
  nivel?: string;
  ano?: number;
  eixo?: string;
  q?: string;
}
