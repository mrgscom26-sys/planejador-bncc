'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Search, Check, Info } from 'lucide-react';
import { BnccSkill } from '@planejador-bncc/shared-types';
import { apiClient } from '../../../../lib/api-client';
import { Input } from '../../../../components/ui/input';
import { Select } from '../../../../components/ui/select';
import { Badge } from '../../../../components/ui/badge';
import styles from './bncc-catalog.module.css';

export interface BnccCatalogProps {
  selectedSkills: BnccSkill[];
  onToggleSkill: (skill: BnccSkill) => void;
  disabled?: boolean;
}

export const BnccCatalog: React.FC<BnccCatalogProps> = ({
  selectedSkills,
  onToggleSkill,
  disabled = false,
}) => {
  const [skills, setSkills] = useState<BnccSkill[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAno, setSelectedAno] = useState<string>('');
  const [selectedEixo, setSelectedEixo] = useState<string>('');

  useEffect(() => {
    let isMounted = true;

    async function fetchSkills() {
      setLoading(true);
      try {
        const data = await apiClient<BnccSkill[]>('/bncc/skills');
        if (isMounted) {
          setSkills(data || []);
        }
      } catch (err) {
        console.error('Erro ao buscar habilidades BNCC:', err);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    fetchSkills();

    return () => {
      isMounted = false;
    };
  }, []);

  const eixosOptions = useMemo(() => {
    const set = new Set<string>();
    skills.forEach((s) => {
      if (s.eixo) set.add(s.eixo);
    });
    return Array.from(set).map((eixo) => ({ label: eixo, value: eixo }));
  }, [skills]);

  const filteredSkills = useMemo(() => {
    return skills.filter((skill) => {
      if (selectedAno && String(skill.ano) !== selectedAno) {
        return false;
      }
      if (selectedEixo && skill.eixo !== selectedEixo) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        return (
          skill.codigo.toLowerCase().includes(q) ||
          skill.descricao.toLowerCase().includes(q) ||
          skill.explicacao.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [skills, selectedAno, selectedEixo, searchQuery]);

  const isSelected = (skillId: string) => {
    return selectedSkills.some((s) => s.id === skillId);
  };

  const isLimitReached = selectedSkills.length >= 3;

  return (
    <div className={styles.catalogCard}>
      <div className={styles.header}>
        <div>
          <h2 className={styles.title}>Catálogo BNCC</h2>
          <p className={styles.subtitle}>
            Selecione de 1 a 3 habilidades para orientar o rascunho pedagógico.
          </p>
        </div>
        <div className={styles.selectionCountBadge}>
          <span className={styles.selectionCounter}>
            {selectedSkills.length} de 3 selecionadas
          </span>
        </div>
      </div>

      <div className={styles.filterSection}>
        <Input
          type="text"
          placeholder="Buscar por código ou descrição..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          leftIcon={<Search size={16} />}
          disabled={disabled}
          aria-label="Buscar habilidades BNCC"
        />

        <div className={styles.selectRow}>
          <Select
            label="Ano escolar"
            value={selectedAno}
            onChange={(e) => setSelectedAno(e.target.value)}
            options={[
              { label: 'Todos os anos', value: '' },
              { label: '1º Ano', value: '1' },
              { label: '2º Ano', value: '2' },
            ]}
            disabled={disabled}
          />
          <Select
            label="Eixo temático"
            value={selectedEixo}
            onChange={(e) => setSelectedEixo(e.target.value)}
            options={[{ label: 'Todos os eixos', value: '' }, ...eixosOptions]}
            disabled={disabled}
          />
        </div>
      </div>

      <div className={styles.skillsList} role="group" aria-label="Lista de habilidades">
        {loading ? (
          <div className={styles.emptyNotice}>Carregando habilidades...</div>
        ) : filteredSkills.length === 0 ? (
          <div className={styles.emptyNotice}>Nenhuma habilidade encontrada para os filtros.</div>
        ) : (
          filteredSkills.map((skill) => {
            const checked = isSelected(skill.id);
            const cannotSelectMore = isLimitReached && !checked;

            return (
              <div
                key={skill.id}
                className={`${styles.skillItem} ${checked ? styles.selected : ''} ${
                  cannotSelectMore || disabled ? styles.disabled : ''
                }`}
                onClick={() => {
                  if (!disabled && (!cannotSelectMore || checked)) {
                    onToggleSkill(skill);
                  }
                }}
                role="checkbox"
                aria-checked={checked}
                tabIndex={disabled || cannotSelectMore ? -1 : 0}
                onKeyDown={(e) => {
                  if (e.key === ' ' || e.key === 'Enter') {
                    e.preventDefault();
                    if (!disabled && (!cannotSelectMore || checked)) {
                      onToggleSkill(skill);
                    }
                  }
                }}
              >
                <div className={styles.skillHeader}>
                  <div className={styles.codeAndBadges}>
                    <span className={styles.code}>{skill.codigo}</span>
                    <Badge variant="primary" size="sm">
                      {skill.ano ? `${skill.ano}º Ano` : skill.nivel}
                    </Badge>
                    <Badge variant="neutral" size="sm">
                      {skill.eixo}
                    </Badge>
                  </div>
                  <div
                    className={`${styles.checkbox} ${checked ? styles.checked : ''}`}
                    aria-hidden="true"
                  >
                    {checked && <Check size={14} color="#FFFFFF" strokeWidth={3} />}
                  </div>
                </div>

                <p className={styles.description}>{skill.descricao}</p>

                {skill.explicacao && (
                  <div className={styles.explanation}>
                    <Info size={13} className={styles.infoIcon} />
                    <span>{skill.explicacao}</span>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
