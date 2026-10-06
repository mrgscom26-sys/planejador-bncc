import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import EditarPlanoPage from '../src/app/planos/[id]/editar/page';
import * as authContext from '../src/contexts/auth-context';
import * as apiModule from '../src/lib/api-client';
import { PlanDetail } from '@planejador-bncc/shared-types';

const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
  useParams: () => ({
    id: 'plan-xyz',
  }),
  usePathname: () => '/planos/plan-xyz/editar',
}));

jest.mock('remark-gfm', () => () => {});
jest.mock('rehype-sanitize', () => () => {});
jest.mock('react-markdown', () => {
  return function MockReactMarkdown({ children }: { children?: string }) {
    if (!children) return null;
    // Emulates react-markdown + rehype-sanitize:
    // Markdown headers are rendered as headings (e.g. # H1, ## H2),
    // and raw HTML tags like <script> or <iframe> are stripped/sanitized, preventing XSS.
    const cleanContent = children
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '');

    const lines = cleanContent.split('\n');
    return (
      <div data-testid="markdown-preview">
        {lines.map((line, idx) => {
          if (line.startsWith('## ')) {
            return <h2 key={idx}>{line.replace('## ', '')}</h2>;
          }
          if (line.startsWith('# ')) {
            return <h1 key={idx}>{line.replace('# ', '')}</h1>;
          }
          if (line.startsWith('- ')) {
            return <li key={idx}>{line.replace('- ', '')}</li>;
          }
          if (line.trim().length > 0) {
            return <p key={idx}>{line}</p>;
          }
          return null;
        })}
      </div>
    );
  };
});

const mockPlan: PlanDetail = {
  id: 'plan-xyz',
  title: 'Exploração dos Recursos Hídricos',
  instructionalGoal: 'Identificar a importância da conservação da água potável.',
  durationMinutes: 50,
  useDigitalResources: true,
  status: 'RASCUNHO',
  markdownContent: '## Objetivos da Aula\n\n- Discutir o ciclo da água\n- Analisar gráficos de consumo',
  aiAssisted: true,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  skills: [
    {
      id: 'skill-1',
      codigo: 'EF01CI01',
      descricao: 'Comparar características de diferentes materiais.',
      ano: 1,
      eixo: 'Matéria e Energia',
      nivel: 'Ensino Fundamental',
      explicacao: 'Compara os materiais.',
      exemplos: 'Madeira e metal',
    },
  ],
};

describe('Markdown Editor Component (T044 / US4)', () => {
  let apiClientSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(authContext, 'useAuth').mockReturnValue({
      user: {
        id: 'teacher-1',
        name: 'Profª Ana Souza',
        email: 'ana@demo.bncc.br',
        role: 'TEACHER',
      },
      isLoading: false,
      login: jest.fn(),
      logout: jest.fn(),
      refreshSession: jest.fn(),
    });

    apiClientSpy = jest.spyOn(apiModule, 'apiClient').mockImplementation(async (endpoint: string, options?: any) => {
      if (endpoint === '/plans/plan-xyz' && (!options || options.method === 'GET')) {
        return mockPlan as any;
      }
      if (endpoint === '/plans/plan-xyz' && options?.method === 'PUT') {
        const body = JSON.parse(options.body);
        return {
          ...mockPlan,
          title: body.title,
          markdownContent: body.markdownContent,
        } as any;
      }
      return {} as any;
    });
  });

  afterEach(() => {
    apiClientSpy.mockRestore();
  });

  it('deve renderizar o plano com título, badges, habilidades e editor Markdown', async () => {
    render(<EditarPlanoPage />);

    await waitFor(() => {
      expect(screen.getByDisplayValue('Exploração dos Recursos Hídricos')).toBeInTheDocument();
    });

    expect(screen.getByText('RASCUNHO')).toBeInTheDocument();
    expect(screen.getByText('Auxílio por IA')).toBeInTheDocument();
    expect(screen.getByText('EF01CI01')).toBeInTheDocument();
    expect(screen.getByDisplayValue(/## Objetivos da Aula/)).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: /objetivos da aula/i })).toBeInTheDocument();
  });

  it('deve sanitizar tags perigosas como <script> e <iframe> no painel de pré-visualização (anti-XSS)', async () => {
    render(<EditarPlanoPage />);

    await waitFor(() => {
      expect(screen.getByDisplayValue('Exploração dos Recursos Hídricos')).toBeInTheDocument();
    });

    const textarea = screen.getByLabelText(/conteúdo do plano em markdown/i) as HTMLTextAreaElement;

    // Injetar payload malicioso com scripts, iframes e atributos onerror
    const maliciousPayload =
      '# Título Seguro\n\n<script>alert("xss attack!")</script>\n<iframe src="https://evil-site.com"></iframe>\n<img src="x" onerror="alert(1)" />\nTexto legítimo do professor.';

    fireEvent.change(textarea, { target: { value: maliciousPayload } });

    const previewContainer = screen.getByTestId('markdown-preview');
    expect(previewContainer).toHaveTextContent(/texto legítimo do professor/i);
    expect(screen.getByRole('heading', { level: 1, name: /título seguro/i })).toBeInTheDocument();

    // Tags perigosas <script> e <iframe> NÃO devem existir na árvore DOM
    const scripts = document.querySelectorAll('script');
    const iframes = document.querySelectorAll('iframe');
    expect(scripts.length).toBe(0);
    expect(iframes.length).toBe(0);
  });

  it('deve alternar entre as abas de Editor e Pré-visualização no layout mobile/tablet', async () => {
    render(<EditarPlanoPage />);

    await waitFor(() => {
      expect(screen.getByDisplayValue('Exploração dos Recursos Hídricos')).toBeInTheDocument();
    });

    const tabEditor = screen.getByRole('button', { name: /^editor markdown$/i });
    const tabPreview = screen.getByRole('button', { name: /^pré-visualização$/i });

    expect(tabEditor).toHaveClass('tabActive');
    expect(tabPreview).not.toHaveClass('tabActive');

    // Alternar para a aba de Pré-visualização
    fireEvent.click(tabPreview);
    expect(tabPreview).toHaveClass('tabActive');
    expect(tabEditor).not.toHaveClass('tabActive');

    // Retornar para a aba de Editor
    fireEvent.click(tabEditor);
    expect(tabEditor).toHaveClass('tabActive');
  });

  it('deve aplicar formatações markdown a partir dos botões da barra de ferramentas', async () => {
    render(<EditarPlanoPage />);

    await waitFor(() => {
      expect(screen.getByDisplayValue('Exploração dos Recursos Hídricos')).toBeInTheDocument();
    });

    const textarea = screen.getByLabelText(/conteúdo do plano em markdown/i) as HTMLTextAreaElement;
    // Limpar o textarea
    fireEvent.change(textarea, { target: { value: '' } });

    // Clicar no botão de negrito
    const boldBtn = screen.getByRole('button', { name: /negrito/i });
    fireEvent.click(boldBtn);
    expect(textarea.value).toContain('**texto**');

    // Clicar no botão de título H2
    const h2Btn = screen.getByRole('button', { name: /título h2/i });
    fireEvent.click(h2Btn);
    expect(textarea.value).toContain('## ');

    // Clicar no botão de lista com marcadores
    const listBtn = screen.getByRole('button', { name: /lista com marcadores/i });
    fireEvent.click(listBtn);
    expect(textarea.value).toContain('- ');
  });

  it('deve interceptar navegação de saída com modal de confirmação quando houver alterações pendentes', async () => {
    render(<EditarPlanoPage />);

    await waitFor(() => {
      expect(screen.getByDisplayValue('Exploração dos Recursos Hídricos')).toBeInTheDocument();
    });

    const exitBtn = screen.getByRole('button', { name: /^sair$/i });

    // Sem alterações, sair navega diretamente para /planos
    fireEvent.click(exitBtn);
    expect(mockPush).toHaveBeenCalledWith('/planos');

    mockPush.mockClear();

    // Modificar o título para sujar o formulário (isDirty = true)
    const titleInput = screen.getByLabelText(/título do plano de aula/i);
    fireEvent.change(titleInput, { target: { value: 'Título Modificado com Alterações' } });

    // Clicar em Sair agora deve abrir o ExitModal
    fireEvent.click(exitBtn);

    expect(screen.getByRole('heading', { name: /você tem alterações não salvas/i })).toBeInTheDocument();
    expect(screen.getByText(/se sair agora, as alterações feitas neste rascunho de aula serão perdidas/i)).toBeInTheDocument();

    // Clicar em "Continuar editando" fecha o modal sem navegar
    const continueBtn = screen.getByRole('button', { name: /continuar editando/i });
    fireEvent.click(continueBtn);

    expect(screen.queryByRole('heading', { name: /você tem alterações não salvas/i })).not.toBeInTheDocument();
    expect(mockPush).not.toHaveBeenCalled();

    // Reabrir o modal e confirmar saída "Descartar e sair"
    fireEvent.click(exitBtn);
    const confirmExitBtn = screen.getByRole('button', { name: /descartar e sair/i });
    fireEvent.click(confirmExitBtn);

    expect(mockPush).toHaveBeenCalledWith('/planos');
  });

  it('deve salvar alterações com feedback explícito de sucesso', async () => {
    render(<EditarPlanoPage />);

    await waitFor(() => {
      expect(screen.getByDisplayValue('Exploração dos Recursos Hídricos')).toBeInTheDocument();
    });

    const saveBtn = screen.getByRole('button', { name: /salvar alterações/i });
    // Inicialmente desabilitado pois não há alterações (isDirty = false)
    expect(saveBtn).toBeDisabled();

    // Alterar o conteúdo Markdown
    const textarea = screen.getByLabelText(/conteúdo do plano em markdown/i);
    fireEvent.change(textarea, { target: { value: '## Nova Versão Aprovada\n\nConteúdo atualizado pelo docente.' } });

    // Agora o botão de salvar está habilitado
    expect(saveBtn).not.toBeDisabled();

    // Clicar em salvar
    fireEvent.click(saveBtn);

    // Aguardar feedback de sucesso (Frame 08)
    await waitFor(() => {
      expect(screen.getByText(/alterações salvas com sucesso/i)).toBeInTheDocument();
      expect(screen.getByText(/seu rascunho privado foi atualizado/i)).toBeInTheDocument();
    });

    // Botão de salvar volta a ficar desabilitado após o salvamento
    expect(saveBtn).toBeDisabled();
    expect(screen.getByText('Salvo')).toBeInTheDocument();
  });
});
