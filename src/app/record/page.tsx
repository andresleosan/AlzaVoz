import type { Metadata } from 'next';
import { AppShell } from '@/components/AppShell';
import { RecordingPanel } from '@/components/recording/RecordingPanel';

export const metadata: Metadata = { title: 'Grabar evidencia | AlzaVoz', robots: { index: false, follow: false }, referrer: 'no-referrer' };
export default function RecordPage() { return <AppShell><RecordingPanel /></AppShell>; }
