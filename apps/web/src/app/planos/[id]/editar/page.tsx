'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeSanitize from 'rehype-sanitize';
import {
  Save,
  ArrowLeft,
  Bold,
  Italic,
  List,
  ListOrdered,
  Link as LinkIcon,
  Heading2,
  CheckCircle,
  AlertCircle,
  HelpCircle,
  UserCheck,
} from 'lucide-react';
import { PlanDetail } from '@planejador-bncc/shared-types';
import { apiClient } from '../../../../lib/api-client';
import { AppShell } from '../../../../components/layout/app-shell';
import { Button } from '../../../../components/ui/button';
import { Badge } from '../../../../components/ui/badge';
import { Chip } from '../../../../components/ui/chip';
import { ExitModal } from './components/exit-modal';
import styles from './editar.module.css';

export default function EditarPlanoPage() {
  const params = useParams();
  const router = useRouter();
  const planId = params?.id as string;

  const [plan, setPlan] = useState<PlanDetail | null>(null);
  const [title, setTitle] = useState('');
  const [markdownContent, setMarkdownContent] = useState('');
  const [initialContent, setInitialContent] = useState('');
  const [initialTitle, setInitialTitle] = useState('');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSavedSuccess, setShowSavedSuccess] = useState(false);
  const [showExitModal, setShowExitModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'editor' | 'preview'>('editor');

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Carregar dados do plano
  useEffect(() => {
    let isMounted = true;

    async function loadPlan() {
      setLoading(true);
      setError(null);
      try {
        const data = await apiClient<PlanDetail>(`/plans/${planId}`);
        if (isMounted) {
          setPlan(data);
          setTitle(data.title);
          setMarkdownContent(data.markdownContent);
          setInitialTitle(data.title);
          setInitialContent(data.markdownContent);
        }
      } catch (err: any) {
        if (isMounted) {
          setError(err.status === 404 ? 'Plano não encontrado ou acesso não autorizado.' : err.message);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    if (planId) {
      loadPlan();
    }

    return () => {
      isMounted = false;
    };
  }, [planId]);

  // Verificar se há alterações não salvas
  const isDirty = title !== initialTitle || markdownContent !== initialContent;

  // Interceptar fechamento de aba/navegador se houver alterações
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  // Ações da Barra de Ferramentas Markdown
  const applyFormatting = (prefix: string, suffix: string = '') => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = markdownContent.substring(start, end);
    const replacement = `${prefix}${selectedText || 'texto'}${suffix}`;

    const newContent =
      markdownContent.substring(0, start) + replacement + markdownContent.substring(end);

    setMarkdownContent(newContent);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + prefix.length, start + prefix.length + (selectedText.length || 5));
    }, 10);
  };

  const handleSave = async () => {
    if (!title.trim() || !markdownContent.trim()) return;

    setSaving(true);
    setShowSavedSuccess(false);

    try {
      const updated = await apiClient<PlanDetail>(`/plans/${planId}`, {
        method: 'PUT',
        body: JSON.stringify({
          title: title.trim(),
          markdownContent: markdownContent.trim(),
        }),
      });

      setPlan(updated);
      setInitialTitle(updated.title);
      setInitialContent(updated.markdownContent);
      setShowSavedSuccess(true);
    } catch (err: any) {
      alert(`Erro ao salvar: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleExitClick = () => {
    if (isDirty) {
      setShowExitModal(true);
    } else {
      router.push('/planos');
    }
  };

  if (loading) {
    return (
      <AppShell title="Carregando plano...">
        <div className={styles.loadingContainer}>
          <div className={styles.spinner} />
          <p>Carregando rascunho de aula...</p>
        </div>
      </AppShell>
    );
  }

  if (error || !plan) {
    return (
      <AppShell title="Aviso">
        <div className={styles.errorContainer}>
          <AlertCircle size={36} color="var(--color-danger-700)" />
          <h2 className={styles.errorTitle}>Não foi possível abrir o plano</h2>
          <p className={styles.errorMessage}>{error || 'Plano indisponível.'}</p>
          <Button variant="secondary" onClick={() => router.push('/planos')} leftIcon={<ArrowLeft size={16} />}>
            Voltar para Meus Planos
          </Button>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell title={`Editar: ${plan.title}`}>
      <div className={styles.container}>
        {/* Cabeçalho superior de ações e metadados */}
        <header className={styles.header}>
          <div className={styles.headerInfo}>
            <div className={styles.statusBadges}>
              <Badge variant="warning" size="sm">
                RASCUNHO
              </Badge>
              {plan.aiAssisted && (
                <Badge variant="ai" size="sm">
                  Auxílio por IA
                </Badge>
              )}
            </div>

            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className={styles.titleInput}
              aria-label="Título do plano de aula"
              placeholder="Título do plano..."
            />

            <div className={styles.metaRow}>
              <span>{plan.durationMinutes} minutos</span>
              <span>·</span>
              <span>{plan.useDigitalResources ? 'Com recursos digitais' : 'Recursos físicos'}</span>
              <span>·</span>
              <span className={isDirty ? styles.unsavedNotice : styles.savedNotice}>
                {isDirty ? 'Alterações não salvas' : 'Salvo'}
              </span>
            </div>
          </div>

          <div className={styles.actionButtons}>
            <Button
              type="button"
              variant="secondary"
              size="md"
              leftIcon={<ArrowLeft size={16} />}
              onClick={handleExitClick}
            >
              Sair
            </Button>
            <Button
              type="button"
              variant="primary"
              size="md"
              leftIcon={<Save size={16} />}
              loading={saving}
              disabled={!isDirty || saving}
              onClick={handleSave}
            >
              Salvar alterações
            </Button>
          </div>
        </header>

        {/* Banner de Confirmação de Sucesso (Frame 08) */}
        {showSavedSuccess && (
          <div className={styles.successBanner} role="status">
            <CheckCircle size={18} className={styles.successIcon} />
            <div className={styles.successContent}>
              <strong className={styles.successTitle}>Alterações salvas com sucesso</strong>
              <span className={styles.successText}>
                Seu rascunho privado foi atualizado. Você pode continuar editando.
              </span>
            </div>
            <button
              type="button"
              className={styles.closeBannerBtn}
              onClick={() => setShowSavedSuccess(false)}
              aria-label="Fechar aviso"
            >
              &times;
            </button>
          </div>
        )}

        {/* Habilidades Vinculadas */}
        {plan.skills && plan.skills.length > 0 && (
          <div className={styles.skillsSection}>
            <span className={styles.skillsLabel}>Habilidades BNCC vinculadas:</span>
            <div className={styles.skillsChips}>
              {plan.skills.map((skill) => (
                <Chip key={skill.id} label={skill.codigo} title={skill.descricao} />
              ))}
            </div>
          </div>
        )}

        {/* Abas Mobile / Tablet */}
        <div className={styles.mobileTabs}>
          <button
            type="button"
            className={`${styles.tabBtn} ${activeTab === 'editor' ? styles.tabActive : ''}`}
            onClick={() => setActiveTab('editor')}
          >
            Editor Markdown
          </button>
          <button
            type="button"
            className={`${styles.tabBtn} ${activeTab === 'preview' ? styles.tabActive : ''}`}
            onClick={() => setActiveTab('preview')}
          >
            Pré-visualização
          </button>
        </div>

        {/* Área do Editor e Pré-visualização (Split View Desktop) */}
        <div className={styles.splitArea}>
          {/* Coluna 1: Editor Markdown */}
          <div
            className={`${styles.editorPane} ${
              activeTab === 'editor' ? styles.tabVisible : styles.tabHiddenMobile
            }`}
          >
            <div className={styles.toolbar}>
              <div className={styles.toolsGroup}>
                <button
                  type="button"
                  onClick={() => applyFormatting('**', '**')}
                  className={styles.toolBtn}
                  title="Negrito (**texto**)"
                  aria-label="Negrito"
                >
                  <Bold size={15} />
                </button>
                <button
                  type="button"
                  onClick={() => applyFormatting('*', '*')}
                  className={styles.toolBtn}
                  title="Itálico (*texto*)"
                  aria-label="Itálico"
                >
                  <Italic size={15} />
                </button>
                <button
                  type="button"
                  onClick={() => applyFormatting('## ')}
                  className={styles.toolBtn}
                  title="Título H2"
                  aria-label="Título H2"
                >
                  <Heading2 size={15} />
                </button>
                <button
                  type="button"
                  onClick={() => applyFormatting('- ')}
                  className={styles.toolBtn}
                  title="Lista com marcadores"
                  aria-label="Lista com marcadores"
                >
                  <List size={15} />
                </button>
                <button
                  type="button"
                  onClick={() => applyFormatting('1. ')}
                  className={styles.toolBtn}
                  title="Lista numerada"
                  aria-label="Lista numerada"
                >
                  <ListOrdered size={15} />
                </button>
                <button
                  type="button"
                  onClick={() => applyFormatting('[', '](https://)')}
                  className={styles.toolBtn}
                  title="Inserir Link"
                  aria-label="Link"
                >
                  <LinkIcon size={15} />
                </button>
              </div>

              <div className={styles.markdownHelp}>
                <HelpCircle size={14} />
                <span>Markdown compatível</span>
              </div>
            </div>

            <textarea
              ref={textareaRef}
              className={styles.markdownTextarea}
              value={markdownContent}
              onChange={(e) => setMarkdownContent(e.target.value)}
              placeholder="Escreva ou edite o plano de aula em Markdown..."
              aria-label="Conteúdo do plano em Markdown"
              rows={24}
            />
          </div>

          {/* Coluna 2: Pré-visualização Sanitizada */}
          <div
            className={`${styles.previewPane} ${
              activeTab === 'preview' ? styles.tabVisible : styles.tabHiddenMobile
            }`}
          >
            <div className={styles.previewHeader}>
              <span className={styles.previewLabel}>Pré-visualização Formatada</span>
            </div>

            <div className={styles.renderedMarkdown}>
              <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeSanitize]}>
                {markdownContent || '*Nenhum conteúdo para exibir.*'}
              </ReactMarkdown>
            </div>
          </div>
        </div>

        {/* Nota de Autoria Docente (Princípio IV da Constituição) */}
        <footer className={styles.authorFooter}>
          <UserCheck size={16} className={styles.authorIcon} />
          <span>
            Revise o conteúdo gerado antes de usar em sala. A decisão e autonomia pedagógica são sempre suas.
          </span>
        </footer>

        {/* Modal de Confirmação de Saída com Alterações Não Salvas (Frame 09) */}
        <ExitModal
          isOpen={showExitModal}
          onClose={() => setShowExitModal(false)}
          onConfirmExit={() => {
            setShowExitModal(false);
            router.push('/planos');
          }}
        />
      </div>
    </AppShell>
  );
}
