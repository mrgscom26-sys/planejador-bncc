'use client';

import React from 'react';
import { Sparkles, AlertCircle } from 'lucide-react';
import { BnccSkill } from '@planejador-bncc/shared-types';
import { Button } from '../../../../components/ui/button';
import { Input } from '../../../../components/ui/input';
import { Chip } from '../../../../components/ui/chip';
import { Radio } from '../../../../components/ui/radio';
import styles from './plan-form.module.css';

export interface PlanFormData {
  title: string;
  instructionalGoal: string;
  durationMinutes: number;
  useDigitalResources: boolean;
}

export interface PlanFormProps {
  selectedSkills: BnccSkill[];
  onRemoveSkill: (skillId: string) => void;
  formData: PlanFormData;
  onChangeFormData: (updates: Partial<PlanFormData>) => void;
  onSubmit: (e: React.FormEvent) => void;
  disabled?: boolean;
  loading?: boolean;
}

export const PlanForm: React.FC<PlanFormProps> = ({
  selectedSkills,
  onRemoveSkill,
  formData,
  onChangeFormData,
  onSubmit,
  disabled = false,
  loading = false,
}) => {
  const isFormValid =
    selectedSkills.length >= 1 &&
    selectedSkills.length <= 3 &&
    formData.title.trim().length >= 3 &&
    formData.instructionalGoal.trim().length >= 5 &&
    formData.durationMinutes >= 10 &&
    formData.durationMinutes <= 480;

  return (
    <form onSubmit={onSubmit} className={styles.formCard}>
      <div className={styles.header}>
        <h2 className={styles.title}>Contexto do Plano</h2>
        <p className={styles.subtitle}>
          Defina as diretrizes pedagógicas para orientar o modelo de inteligência artificial.
        </p>
      </div>

      {/* Seção de Habilidades Selecionadas */}
      <div className={styles.section}>
        <label className={styles.sectionLabel}>
          Habilidades Selecionadas <span className={styles.required}>*</span>
        </label>
        {selectedSkills.length === 0 ? (
          <div className={styles.noSkillsAlert}>
            <AlertCircle size={16} />
            <span>Nenhuma habilidade selecionada. Escolha de 1 a 3 itens no catálogo da BNCC.</span>
          </div>
        ) : (
          <div className={styles.chipsWrapper}>
            {selectedSkills.map((skill) => (
              <Chip
                key={skill.id}
                label={skill.codigo}
                title={skill.descricao}
                onRemove={disabled ? undefined : () => onRemoveSkill(skill.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Título do Plano */}
      <Input
        id="plan-title"
        label="Título do Plano"
        placeholder="Ex.: Água e vida no território"
        value={formData.title}
        onChange={(e) => onChangeFormData({ title: e.target.value })}
        required
        disabled={disabled}
        helperText="Identificação principal para organização e busca do rascunho."
      />

      {/* Intenção Pedagógica (Textarea) */}
      <div className={styles.textareaGroup}>
        <label htmlFor="plan-goal" className={styles.label}>
          Objetivo e Instrução Pedagógica <span className={styles.required}>*</span>
        </label>
        <textarea
          id="plan-goal"
          className={styles.textarea}
          rows={4}
          placeholder="Ex.: Propor uma investigação sobre o consumo de água na escola, incentivando a observação em duplas e a identificação de padrões de uso..."
          value={formData.instructionalGoal}
          onChange={(e) => onChangeFormData({ instructionalGoal: e.target.value })}
          required
          disabled={disabled}
        />
        <span className={styles.helperText}>
          Descreva dinâmicas, formação de grupos ou orientações metodológicas desejadas.
        </span>
      </div>

      {/* Duração Estimada */}
      <Input
        id="plan-duration"
        label="Duração Estimada (minutos)"
        type="number"
        min={10}
        max={480}
        value={formData.durationMinutes}
        onChange={(e) => onChangeFormData({ durationMinutes: parseInt(e.target.value, 10) || 0 })}
        required
        disabled={disabled}
        helperText="Tempo total previsto para a execução das atividades pedagógicas (10 a 480 min)."
      />

      {/* Recursos Digitais */}
      <div className={styles.section}>
        <label className={styles.sectionLabel}>Recursos Didáticos</label>
        <div className={styles.radioGroup}>
          <Radio
            name="digitalResources"
            id="resources-digital"
            label="Incluir tecnologias digitais"
            description="Computadores, tablets, softwares educativos e internet."
            checked={formData.useDigitalResources === true}
            onChange={() => onChangeFormData({ useDigitalResources: true })}
            disabled={disabled}
          />
          <Radio
            name="digitalResources"
            id="resources-physical"
            label="Apenas recursos físicos convencionais"
            description="Papel, cartolina, lápis e materiais manipuláveis da sala de aula."
            checked={formData.useDigitalResources === false}
            onChange={() => onChangeFormData({ useDigitalResources: false })}
            disabled={disabled}
          />
        </div>
      </div>

      <Button
        type="submit"
        variant="primary"
        size="lg"
        leftIcon={<Sparkles size={18} />}
        loading={loading}
        disabled={!isFormValid || disabled || loading}
        className={styles.submitBtn}
      >
        Gerar rascunho com IA
      </Button>
    </form>
  );
};
