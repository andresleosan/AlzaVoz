import type { Metadata } from 'next';
import { AppShell } from '@/components/AppShell';
import { CommunityPanel } from '@/components/community/CommunityPanel';

export const metadata: Metadata = {
  title: 'Convivencia Barrial y Sonómetro | AlzaVoz Medellín',
  description:
    'Observación sonora local durante 15 segundos y tablero agregado por comunas de Medellín.',
};

export default function CommunityPage() {
  return <AppShell><CommunityPanel /></AppShell>;
}
