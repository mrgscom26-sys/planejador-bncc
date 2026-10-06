import type { Metadata } from 'next';
import { AuthProvider } from '../contexts/auth-context';
import '../styles/globals.css';

export const metadata: Metadata = {
  title: 'Planejador de Aulas BNCC',
  description: 'Planejador pedagógico assistido por IA alinhado à Base Nacional Comum Curricular',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
