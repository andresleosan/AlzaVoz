import type { Metadata } from 'next';
import { AppShell } from '@/components/AppShell';
import { ConfidentialReportPanel } from '@/components/report/ConfidentialReportPanel';

export const metadata: Metadata = {
  title: 'Denuncia Confidencial · Escudo Violeta | AlzaVoz Medellín',
  description:
    'Radica denuncias confidenciales limpiando metadatos en tu navegador, transformando tu voz y configurando contacto seguro.',
  robots: { index: false, follow: false },
  referrer: 'no-referrer',
};

export default function ConfidentialReportPage() {
  return (
    <AppShell>
      <ConfidentialReportPanel />
    </AppShell>
  );
}
