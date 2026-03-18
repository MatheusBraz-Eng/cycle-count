import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Cycle Count Enginei',
  description: 'Portal corporativo de contagem com ação rápida, rastreabilidade e ranking de operadores.'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
