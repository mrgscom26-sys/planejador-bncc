import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import LoginPage from '../src/app/login/page';
import * as authContext from '../src/contexts/auth-context';

// Mock Next.js navigation
const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
  usePathname: () => '/login',
}));

describe('Login Page Component (T042 / US1)', () => {
  const mockLogin = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(authContext, 'useAuth').mockReturnValue({
      user: null,
      isLoading: false,
      login: mockLogin,
      logout: jest.fn(),
      refreshSession: jest.fn(),
    });
  });

  it('deve renderizar elementos principais da tela de login fiel ao Frame 02', () => {
    render(<LoginPage />);

    expect(screen.getByRole('heading', { name: /planejamento pedagógico com você no controle/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /^entrar$/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/e-mail/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/senha/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^entrar$/i })).toBeInTheDocument();
  });

  it('deve preencher credenciais ao clicar no atalho da Profª Ana Souza', () => {
    render(<LoginPage />);

    const useAccountButtons = screen.getAllByRole('button', { name: /usar conta/i });
    expect(useAccountButtons.length).toBe(2);

    // Clicar no primeiro botão (Ana Souza)
    fireEvent.click(useAccountButtons[0]);

    const emailInput = screen.getByLabelText(/e-mail/i) as HTMLInputElement;
    const passwordInput = screen.getByLabelText(/senha/i) as HTMLInputElement;

    expect(emailInput.value).toBe('ana@demo.bncc.br');
    expect(passwordInput.value).toBe('demo123');
  });

  it('deve preencher credenciais ao clicar no atalho do Prof. Marcos Lima', () => {
    render(<LoginPage />);

    const useAccountButtons = screen.getAllByRole('button', { name: /usar conta/i });

    // Clicar no segundo botão (Marcos Lima)
    fireEvent.click(useAccountButtons[1]);

    const emailInput = screen.getByLabelText(/e-mail/i) as HTMLInputElement;
    const passwordInput = screen.getByLabelText(/senha/i) as HTMLInputElement;

    expect(emailInput.value).toBe('marcos@demo.bncc.br');
    expect(passwordInput.value).toBe('demo123');
  });

  it('deve exibir banner de erro ao falhar na autenticação com credenciais inválidas', async () => {
    mockLogin.mockRejectedValueOnce({
      data: { message: 'Credenciais inválidas.' },
    });

    render(<LoginPage />);

    const emailInput = screen.getByLabelText(/e-mail/i);
    const passwordInput = screen.getByLabelText(/senha/i);
    const submitBtn = screen.getByRole('button', { name: /^entrar$/i });

    fireEvent.change(emailInput, { target: { value: 'ana@demo.bncc.br' } });
    fireEvent.change(passwordInput, { target: { value: 'senha-errada' } });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.getByText(/não foi possível entrar/i)).toBeInTheDocument();
      expect(screen.getByText(/credenciais inválidas/i)).toBeInTheDocument();
    });
  });
});
