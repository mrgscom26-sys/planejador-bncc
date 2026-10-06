'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  BookOpen,
  ShieldCheck,
  Sparkles,
  Pencil,
  Lock,
  Mail,
  AlertCircle,
} from 'lucide-react';
import { useAuth } from '../../contexts/auth-context';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import styles from './login.module.css';

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setLoading(true);

    try {
      await login(email, password);
    } catch (err: any) {
      setErrorMessage(
        err.data?.message || 'E-mail ou senha incorretos. Confira os dados e tente novamente.',
      );
    } finally {
      setLoading(false);
    }
  };

  const handleUseDemoAccount = (demoEmail: string, demoPass: string) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    setErrorMessage(null);
  };

  return (
    <div className={styles.container}>
      {/* Painel Institucional (Esquerda no desktop) */}
      <section className={styles.brandPanel} aria-label="Apresentação institucional">
        <div className={styles.brandContent}>
          <div className={styles.brandHeader}>
            <div className={styles.brandSymbol}>
              <BookOpen size={24} color="#FFFFFF" />
            </div>
            <h1 className={styles.brandTitle}>Planejador BNCC</h1>
          </div>

          <div className={styles.heroText}>
            <h2 className={styles.headline}>Planejamento pedagógico com você no controle.</h2>
            <p className={styles.subheadline}>
              Selecione habilidades da BNCC, organize sua intenção pedagógica e gere um primeiro rascunho para revisar com autonomia.
            </p>
          </div>

          <div className={styles.guarantees}>
            <div className={styles.guaranteeItem}>
              <div className={styles.guaranteeIcon}>
                <ShieldCheck size={18} />
              </div>
              <span className={styles.guaranteeText}>Rascunhos privados por padrão</span>
            </div>
            <div className={styles.guaranteeItem}>
              <div className={styles.guaranteeIcon}>
                <Sparkles size={18} />
              </div>
              <span className={styles.guaranteeText}>Auxílio por IA sempre identificado</span>
            </div>
            <div className={styles.guaranteeItem}>
              <div className={styles.guaranteeIcon}>
                <Pencil size={18} />
              </div>
              <span className={styles.guaranteeText}>Você revisa e decide o que salvar</span>
            </div>
          </div>
        </div>

        <p className={styles.demoDisclaimer}>
          Ambiente demonstrativo · Sem cadastro público · Acesso restrito a contas autorizadas.
        </p>
      </section>

      {/* Área de Acesso (Direita no desktop) */}
      <section className={styles.authArea} aria-label="Formulário de autenticação">
        <header className={styles.areaHeader}>
          <div className={styles.areaBrand}>
            <div className={styles.areaLogo}>
              <BookOpen size={18} color="#FFFFFF" />
            </div>
            <div>
              <span className={styles.areaName}>Planejador BNCC</span>
              <span className={styles.areaTag}>CONTROLE DOCENTE</span>
            </div>
          </div>
          <div className={styles.securityTag}>
            <Lock size={14} />
            <span>Acesso seguro</span>
          </div>
        </header>

        <div className={styles.formCard}>
          <div className={styles.formIntro}>
            <h3 className={styles.formTitle}>Entrar</h3>
            <p className={styles.formSubtitle}>
              Use uma das contas de demonstração para acessar seus rascunhos.
            </p>
          </div>

          {errorMessage && (
            <div className={styles.errorBanner} role="alert">
              <AlertCircle size={20} className={styles.errorIcon} />
              <div className={styles.errorText}>
                <strong className={styles.errorTitle}>Não foi possível entrar</strong>
                <span>{errorMessage}</span>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className={styles.form}>
            <Input
              id="login-email"
              label="E-mail"
              type="email"
              placeholder="ana@demo.bncc.br"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              leftIcon={<Mail size={16} />}
              autoComplete="email"
            />

            <Input
              id="login-password"
              label="Senha"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              leftIcon={<Lock size={16} />}
              autoComplete="current-password"
            />

            <Button
              type="submit"
              variant="primary"
              size="lg"
              loading={loading}
              className={styles.submitBtn}
            >
              Entrar
            </Button>
          </form>

          <div className={styles.demoSection}>
            <h4 className={styles.demoTitle}>Contas de demonstração</h4>

            <div className={styles.demoCard}>
              <div className={styles.demoInfo}>
                <span className={styles.demoName}>Profª Ana Souza</span>
                <span className={styles.demoCredentials}>ana@demo.bncc.br · demo123</span>
              </div>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => handleUseDemoAccount('ana@demo.bncc.br', 'demo123')}
              >
                Usar conta
              </Button>
            </div>

            <div className={styles.demoCard}>
              <div className={styles.demoInfo}>
                <span className={styles.demoName}>Prof. Marcos Lima</span>
                <span className={styles.demoCredentials}>marcos@demo.bncc.br · demo123</span>
              </div>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => handleUseDemoAccount('marcos@demo.bncc.br', 'demo123')}
              >
                Usar conta
              </Button>
            </div>
          </div>

          <p className={styles.demoNote}>
            Não há cadastro público. O acesso é disponibilizado somente por convite da demonstração.
          </p>
        </div>

        <footer className={styles.areaFooter}>
          <p>Problemas para acessar? Fale com a equipe responsável pela demonstração.</p>
        </footer>
      </section>
    </div>
  );
}
