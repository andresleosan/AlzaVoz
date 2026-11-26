import type { Metadata } from 'next';
import { AppShell } from '@/components/AppShell';
import { AdminPanel } from '@/components/admin/AdminPanel';

export const metadata: Metadata = {
  title: 'Panel de Gestión Autorizado | AlzaVoz Medellín',
  description:
    'Gestión privada de expedientes ciudadanos, evidencias y borradores jurídicos para el equipo autorizado.',
  robots: { index: false, follow: false },
  referrer: 'no-referrer',
};

export default function AdminPage() {
  return (
    <AppShell>
      <AdminPanel />
    </AppShell>
  );
}
