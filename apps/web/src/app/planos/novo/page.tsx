'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { RefreshCw, ArrowLeft } from 'lucide-react';
import NextLink from 'next/link';
import { BnccSkill, PlanDetail } from '@planejador-bncc/shared-types';
import { apiClient } from '../../../lib/api-client';
import { AppShell } from '../../../components/layout/app-shell';
import { BnccCatalog } from './components/bncc-catalog';
import { PlanForm, PlanFormData } from './components/plan-form';
import { ProgressCard } from '../../../components/feedback/progress-card';
import { Banner } from '../../../components/feedback/banner';
import { Button } from '../../../components/ui/button';
import styles from './novo.module.css';

export default function NovoPlanoPage() {
  const router = useRouter();

  const [selectedSkills, setSelectedSkills] = useState<BnccSkill[]>([]);
  const [formData, setFormData] = useState<PlanFormData>({
    title: '',
    instructionalGoal: '',
    durationMinutes: 50,
    useDigitalResources: false,
  });

  const [generationState, setGenerationState] = useState<'IDLE' | 'PREPARING' | 'ERROR'>('IDLE');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleToggleSkill = (skill: BnccSkill) => {
    setSelectedSkills((prev) => {
      const exists = prev.some((s) => s.id === skill.id);
      if (exists) {
        return prev.filter((s) => s.id !== skill.id);
      }
      if (prev.length >= 3) {
        return prev;
      }
      return [...prev, skill];
    });
  };

  const handleRemoveSkill = (skillId: string) => {
    setSelectedSkills((prev) => prev.filter((s) => s.id !== skillId));
  };

  const handleUpdateFormData = (updates: Partial<PlanFormData>) => {
    setFormData((prev) => ({ ...prev, ...updates }));
  };

  const handleGenerate = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    setGenerationState('PREPARING');
    setErrorMessage(null);

    try {
      const plan = await apiClient<PlanDetail>('/plans/generate', {
        method: 'POST',
        body: JSON.stringify({
          skillIds: selectedSkills.map((s) => s.id),
          title: formData.title,
          instructionalGoal: formData.instructionalGoal,
          durationMinutes: formData.durationMinutes,
          useDigitalResources: formData.useDigitalResources,
        }),
      });

      // Navegar para o editor do rascunho recém-criado
      router.push(`/planos/${plan.id}/editar`);
    } catch (err: any) {
      setGenerationState('ERROR');
      setErrorMessage(
        err.data?.message ||
          'O provedor de inteligência artificial não respondeu a tempo ou ocorreu uma instabilidade. Suas informações foram preservadas.',
      );
    }
  };

  const isPreparing = generationState === 'PREPARING';

  return (
    <AppShell title="Novo Plano de Aula">
      <div className={styles.container}>
        {/* Navegação de retorno */}
        <div className={styles.backLinkWrapper}>
          <NextLink href="/planos" className={styles.backLink}>
            <ArrowLeft size={16} />
            <span>Voltar para Meus Planos</span>
          </NextLink>
        </div>

        {/* Estado de Falha (Frame 07) */}
        {generationState === 'ERROR' && (
          <Banner
            variant="danger"
            title="Não foi possível gerar o rascunho com IA"
            action={
              <Button
                variant="danger"
                size="sm"
                onClick={() => handleGenerate()}
                leftIcon={<RefreshCw size={14} />}
              >
                Tentar gerar novamente
              </Button>
            }
            onClose={() => setGenerationState('IDLE')}
          >
            {errorMessage}
          </Banner>
        )}

        {/* Estado de Preparação com ProgressCard (Frame 06) */}
        {isPreparing && (
          <div className={styles.preparingWrapper}>
            <ProgressCard
              title="Criando seu rascunho de aula com IA..."
              description="Aguarde enquanto combinamos as habilidades da BNCC e estruturamos seu plano pedagógico."
              estimatedSeconds={45}
            />
          </div>
        )}

        {/* Layout Split de duas colunas (Catálogo + Formulário) */}
        <div className={styles.splitLayout}>
          <div className={styles.columnCatalog}>
            <BnccCatalog
              selectedSkills={selectedSkills}
              onToggleSkill={handleToggleSkill}
              disabled={isPreparing}
            />
          </div>

          <div className={styles.columnForm}>
            <PlanForm
              selectedSkills={selectedSkills}
              onRemoveSkill={handleRemoveSkill}
              formData={formData}
              onChangeFormData={handleUpdateFormData}
              onSubmit={handleGenerate}
              disabled={isPreparing}
              loading={isPreparing}
            />
          </div>
        </div>
      </div>
    </AppShell>
  );
}
