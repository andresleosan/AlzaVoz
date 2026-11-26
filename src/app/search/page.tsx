import type { Metadata } from 'next';
import { AppShell } from '@/components/AppShell';
import { SearchPanel } from '@/components/search/SearchPanel';

export const metadata: Metadata = {
  title: 'Tableros de Búsqueda Comunitaria | AlzaVoz Medellín',
  description:
    'Tableros ciudadanos para personas y mascotas perdidas o encontradas en Medellín con afiches QR y pistas privadas.',
};

export default function SearchPage() { return <AppShell><SearchPanel /></AppShell>; }
