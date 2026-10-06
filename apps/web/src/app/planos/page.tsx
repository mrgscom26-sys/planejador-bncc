'use client';

import React, { useState, useEffect, useMemo } from 'react';
import NextLink from 'next/link';
import { useRouter } from 'next/navigation';
import { Plus, Search, Lock, ChevronRight, Clock, BookOpen } from 'lucide-react';
import { PlanSummary } from '@planejador-bncc/shared-types';
import { apiClient } from '../../lib/api-client';
import { AppShell } from '../../components/layout/app-shell';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import { EmptyState } from '../../components/feedback/empty-state';
import styles from './planos.module.css';

export default function PlanosPage() {
  const [plans, setPlans] = useState<PlanSummary[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    let isMounted = true;

    async function loadPlans() {
      setLoading(true);
      try {
        const data = await apiClient<PlanSummary[]>('/plans');
        if (isMounted) {
          setPlans(data || []);
        }
      } catch (err) {
        console.error('Erro ao carregar planos:', err);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadPlans();

    return () => {
      isMounted = false;
    };
  }, []);

  const filteredPlans = useMemo(() => {
    if (!searchQuery.trim()) return plans;
    const q = searchQuery.toLowerCase().trim();
    return plans.filter(
      (p) =>
        p.title.toLowerCase().includes(q) ||
        p.skills.some(
          (s) =>
            s.codigo.toLowerCase().includes(q) ||
            s.descricao.toLowerCase().includes(q),
        ),
    );
  }, [plans, searchQuery]);

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return new Intl.DateTimeFormat('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }).format(date);
    } catch {
      return dateString;
    }
  };

  return (
    <AppShell title="Meus planos">
      <div className={styles.container}>
        {/* Cabeçalho da página */}
        <header className={styles.header}>
          <div className={styles.headerText}>
            <h1 className={styles.title}>Meus planos</h1>
            <p className={styles.subtitle}>
              Seus rascunhos privados. Somente você pode consultar e editar estes planos.
            </p>
          </div>
          <NextLink href="/planos/novo">
            <Button variant="primary" size="md" leftIcon={<Plus size={18} />}>
              Novo plano
            </Button>
          </NextLink>
        </header>

        {/* Ferramentas: Busca e Contador de Privacidade */}
        <div className={styles.tools}>
          <div className={styles.searchWrapper}>
            <Input
              type="text"
              placeholder="Buscar por título ou componente curricular"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              leftIcon={<Search size={16} />}
              aria-label="Buscar nos rascunhos"
            />
          </div>

          <div className={styles.privacyCounter}>
            <Lock size={14} className={styles.lockIcon} />
            <span className={styles.counterText}>
              {plans.length} {plans.length === 1 ? 'rascunho privado' : 'rascunhos privados'}
            </span>
          </div>
        </div>

        {/* Conteúdo: Lista ou Estado Vazio */}
        {loading ? (
          <div className={styles.loadingState}>
            <div className={styles.spinner} />
            <p>Carregando rascunhos...</p>
          </div>
        ) : filteredPlans.length === 0 ? (
          <EmptyState
            title={
              searchQuery
                ? 'Nenhum rascunho encontrado'
                : 'Você ainda não possui rascunhos salvos'
            }
            description={
              searchQuery
                ? 'Nenhum plano corresponde aos termos da sua pesquisa. Tente buscar por outros termos.'
                : 'Comece criando um novo plano de aula selecionando as habilidades da BNCC adequadas à sua turma.'
            }
            action={
              <NextLink href="/planos/novo">
                <Button variant="primary" size="md" leftIcon={<Plus size={18} />}>
                  Criar meu primeiro plano
                </Button>
              </NextLink>
            }
          />
        ) : (
          <div className={styles.tableCard}>
            <div className={styles.tableHeader}>
              <span className={styles.colPlan}>Plano</span>
              <span className={styles.colDate}>Última atualização</span>
              <span className={styles.colStatus}>Status</span>
              <span className={styles.colAction}></span>
            </div>

            <div className={styles.tableBody}>
              {filteredPlans.map((plan) => (
                <div
                  key={plan.id}
                  className={styles.row}
                  onClick={() => router.push(`/planos/${plan.id}/editar`)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      router.push(`/planos/${plan.id}/editar`);
                    }
                  }}
                  aria-label={`Editar plano: ${plan.title}`}
                >
                  <div className={styles.colPlan}>
                    <h3 className={styles.planTitle}>{plan.title}</h3>
                    <div className={styles.planMeta}>
                      <span className={styles.metaItem}>
                        <Clock size={13} />
                        {plan.durationMinutes} min
                      </span>
                      {plan.skills.length > 0 && (
                        <span className={styles.metaItem}>
                          <BookOpen size={13} />
                          {plan.skills.map((s) => s.codigo).join(', ')}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className={styles.colDate}>
                    <span className={styles.dateText}>{formatDate(plan.updatedAt)}</span>
                  </div>

                  <div className={styles.colStatus}>
                    <div className={styles.badgesWrapper}>
                      <Badge variant="neutral" size="sm">
                        {plan.status}
                      </Badge>
                      {plan.aiAssisted && (
                        <Badge variant="ai" size="sm">
                          Auxílio por IA
                        </Badge>
                      )}
                    </div>
                  </div>

                  <div className={styles.colAction}>
                    <ChevronRight size={18} className={styles.chevron} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
