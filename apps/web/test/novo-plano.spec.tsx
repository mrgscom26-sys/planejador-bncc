import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import NovoPlanoPage from '../src/app/planos/novo/page';
import * as authContext from '../src/contexts/auth-context';
import * as apiModule from '../src/lib/api-client';
import { BnccSkill } from '@planejador-bncc/shared-types';

const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
  usePathname: () => '/planos/novo',
}));

const mockSkills: BnccSkill[] = [
  {
    id: 'skill-1',
    codigo: 'EF01CI01',
    descricao: 'Comparar características de diferentes materiais presentes nos objetos de uso cotidiano.',
    ano: 1,
    eixo: 'Matéria e Energia',
    nivel: 'Ensino Fundamental',
    explicacao: 'Identifica propriedades dos materiais.',
    exemplos: 'Madeira e vidro',
  },
  {
    id: 'skill-2',
    codigo: 'EF01CI02',
    descricao: 'Localizar, nomear e representar graficamente partes do corpo humano e explicar suas funções.',
    ano: 1,
    eixo: 'Vida e Evolução',
    nivel: 'Ensino Fundamental',
    explicacao: 'Partes do corpo humano.',
    exemplos: 'Cabeça, tronco, membros',
  },
  {
    id: 'skill-3',
    codigo: 'EF02CI01',
    descricao: 'Identificar de que materiais são feitos os objetos que fazem parte da vida cotidiana.',
    ano: 2,
    eixo: 'Matéria e Energia',
    nivel: 'Ensino Fundamental',
    explicacao: 'Origem dos materiais.',
    exemplos: 'Plástico, metal',
  },
  {
    id: 'skill-4',
    codigo: 'EF02CI02',
    descricao: 'Propor o uso de diferentes materiais para a construção de objetos de uso cotidiano.',
    ano: 2,
    eixo: 'Matéria e Energia',
    nivel: 'Ensino Fundamental',
    explicacao: 'Construção com materiais.',
    exemplos: 'Brinquedos recicláveis',
  },
];

describe('Novo Plano Page (T043 / US2 / US3)', () => {
  let apiClientSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(authContext, 'useAuth').mockReturnValue({
      user: {
        id: 'user-1',
        name: 'Profª Ana Souza',
        email: 'ana@demo.bncc.br',
        role: 'TEACHER',
      },
      isLoading: false,
      login: jest.fn(),
      logout: jest.fn(),
      refreshSession: jest.fn(),
    });

    apiClientSpy = jest.spyOn(apiModule, 'apiClient').mockImplementation(async (endpoint: string) => {
      if (endpoint === '/bncc/skills') {
        return mockSkills as any;
      }
      return {} as any;
    });
  });

  afterEach(() => {
    apiClientSpy.mockRestore();
  });

  it('deve respeitar o limite estrito de 1 a 3 habilidades selecionadas', async () => {
    render(<NovoPlanoPage />);

    // Aguardar carregamento das habilidades
    await waitFor(() => {
      expect(screen.getByText('EF01CI01')).toBeInTheDocument();
    });

    expect(screen.getByText('0 de 3 selecionadas')).toBeInTheDocument();

    // Selecionar 1ª habilidade
    fireEvent.click(screen.getByText('EF01CI01'));
    expect(screen.getByText('1 de 3 selecionadas')).toBeInTheDocument();

    // Selecionar 2ª habilidade
    fireEvent.click(screen.getByText('EF01CI02'));
    expect(screen.getByText('2 de 3 selecionadas')).toBeInTheDocument();

    // Selecionar 3ª habilidade
    fireEvent.click(screen.getByText('EF02CI01'));
    expect(screen.getByText('3 de 3 selecionadas')).toBeInTheDocument();

    // Tentar selecionar a 4ª habilidade (deve ser bloqueada)
    fireEvent.click(screen.getByText('EF02CI02'));
    expect(screen.getByText('3 de 3 selecionadas')).toBeInTheDocument();

    // Remover uma habilidade pelo chip de remoção
    const removeButtons = screen.getAllByRole('button', { name: /remover/i });
    expect(removeButtons.length).toBe(3);
    fireEvent.click(removeButtons[0]);

    // Agora deve ter 2 selecionadas e permitir nova seleção
    expect(screen.getByText('2 de 3 selecionadas')).toBeInTheDocument();
    fireEvent.click(screen.getByText('EF02CI02'));
    expect(screen.getByText('3 de 3 selecionadas')).toBeInTheDocument();
  });

  it('deve desabilitar botão de submissão quando formulário estiver incompleto', async () => {
    render(<NovoPlanoPage />);

    await waitFor(() => {
      expect(screen.getByText('EF01CI01')).toBeInTheDocument();
    });

    const submitBtn = screen.getByRole('button', { name: /gerar rascunho com ia/i });
    expect(submitBtn).toBeDisabled();

    // Seleciona 1 habilidade mas campos de texto continuam vazios
    fireEvent.click(screen.getByText('EF01CI01'));
    expect(submitBtn).toBeDisabled();

    // Preenche título mas falta objetivo
    fireEvent.change(screen.getByLabelText(/título do plano/i), {
      target: { value: 'Aula de Ciências sobre Materiais' },
    });
    expect(submitBtn).toBeDisabled();

    // Preenche objetivo pedagógico
    fireEvent.change(screen.getByLabelText(/objetivo e instrução pedagógica/i), {
      target: { value: 'Explorar as propriedades físicas dos objetos da sala.' },
    });

    // Agora com 1 habilidade, título e objetivo válidos, o botão deve estar habilitado
    expect(submitBtn).not.toBeDisabled();
  });

  it('deve reter 100% dos dados preenchidos após falha na geração com IA e permitir nova tentativa', async () => {
    let callCount = 0;
    apiClientSpy.mockImplementation(async (endpoint: string) => {
      if (endpoint === '/bncc/skills') {
        return mockSkills as any;
      }
      if (endpoint === '/plans/generate') {
        callCount++;
        throw {
          status: 504,
          data: {
            message: 'Timeout ao conectar com serviço de inteligência artificial.',
          },
        };
      }
      return {} as any;
    });

    render(<NovoPlanoPage />);

    await waitFor(() => {
      expect(screen.getByText('EF01CI01')).toBeInTheDocument();
    });

    // Seleciona habilidade
    fireEvent.click(screen.getByText('EF01CI01'));

    // Preenche dados do formulário
    const titleInput = screen.getByLabelText(/título do plano/i) as HTMLInputElement;
    const goalInput = screen.getByLabelText(/objetivo e instrução pedagógica/i) as HTMLTextAreaElement;
    const durationInput = screen.getByLabelText(/duração estimada/i) as HTMLInputElement;
    const digitalRadio = screen.getByLabelText(/incluir tecnologias digitais/i) as HTMLInputElement;

    fireEvent.change(titleInput, { target: { value: 'Água e vida no planeta' } });
    fireEvent.change(goalInput, { target: { value: 'Discutir o ciclo da água e o consumo consciente em casa.' } });
    fireEvent.change(durationInput, { target: { value: '90' } });
    fireEvent.click(digitalRadio);

    const submitBtn = screen.getByRole('button', { name: /gerar rascunho com ia/i });
    expect(submitBtn).not.toBeDisabled();

    // Submete geração
    fireEvent.click(submitBtn);

    // Aguarda banner de erro aparecer
    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.getByText(/não foi possível gerar o rascunho com ia/i)).toBeInTheDocument();
      expect(screen.getByText(/timeout ao conectar com serviço de inteligência artificial/i)).toBeInTheDocument();
    });

    // Verifica retenção 100% dos campos após erro
    expect(titleInput.value).toBe('Água e vida no planeta');
    expect(goalInput.value).toBe('Discutir o ciclo da água e o consumo consciente em casa.');
    expect(durationInput.value).toBe('90');
    expect(digitalRadio.checked).toBe(true);

    // Verifica que as habilidades selecionadas permanecem intactas
    expect(screen.getByText('1 de 3 selecionadas')).toBeInTheDocument();
    const chips = screen.getAllByRole('button', { name: /remover/i });
    expect(chips.length).toBe(1);

    // Verifica que o botão de retry "Tentar gerar novamente" está presente
    const retryBtn = screen.getByRole('button', { name: /tentar gerar novamente/i });
    expect(retryBtn).toBeInTheDocument();

    // Clica em tentar novamente
    fireEvent.click(retryBtn);

    await waitFor(() => {
      expect(callCount).toBe(2);
    });
  });

  it('deve exibir mensagem de progresso com aviso de 45 segundos durante a geração', async () => {
    let resolveGenerate: (value: any) => void;
    const generatePromise = new Promise((resolve) => {
      resolveGenerate = resolve;
    });

    apiClientSpy.mockImplementation(async (endpoint: string) => {
      if (endpoint === '/bncc/skills') {
        return mockSkills as any;
      }
      if (endpoint === '/plans/generate') {
        return generatePromise;
      }
      return {} as any;
    });

    render(<NovoPlanoPage />);

    await waitFor(() => {
      expect(screen.getByText('EF01CI01')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('EF01CI01'));
    fireEvent.change(screen.getByLabelText(/título do plano/i), { target: { value: 'Investigação da Natureza' } });
    fireEvent.change(screen.getByLabelText(/objetivo e instrução pedagógica/i), {
      target: { value: 'Realizar trabalho de campo nos arredores da escola.' },
    });

    const submitBtn = screen.getByRole('button', { name: /gerar rascunho com ia/i });
    fireEvent.click(submitBtn);

    // Verifica exibição do card de progresso com aviso de 45 segundos sincronizado com o backend
    await waitFor(() => {
      expect(screen.getByText(/criando seu rascunho de aula com ia/i)).toBeInTheDocument();
      expect(screen.getByText(/isso pode levar até 45 segundos/i)).toBeInTheDocument();
    });

    // Resolve a promise simulando retorno de sucesso
    resolveGenerate!({
      id: 'plan-123',
      title: 'Investigação da Natureza',
      markdownContent: '# Plano',
    });

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/planos/plan-123/editar');
    });
  });
});
