import { BnccSkill, BnccSkillSummary } from './bncc.js';

export type PlanStatus = 'RASCUNHO';

export interface PlanSummary {
  id: string;
  title: string;
  durationMinutes: number;
  status: PlanStatus;
  aiAssisted: boolean;
  updatedAt: string;
  skills: BnccSkillSummary[];
}

export interface PlanDetail {
  id: string;
  title: string;
  instructionalGoal: string;
  durationMinutes: number;
  useDigitalResources: boolean;
  status: PlanStatus;
  markdownContent: string;
  aiAssisted: boolean;
  createdAt: string;
  updatedAt: string;
  skills: BnccSkill[];
}

export interface CreatePlanDto {
  skillIds: string[];
  title?: string;
  instructionalGoal: string;
  durationMinutes: number;
  useDigitalResources: boolean;
}

export interface GeneratePlanDto {
  skillIds: string[];
  title: string;
  instructionalGoal: string;
  durationMinutes: number;
  useDigitalResources: boolean;
}

export interface UpdatePlanDto {
  title: string;
  markdownContent: string;
}
