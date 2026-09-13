import type { Metadata } from 'next'
import { DailyProdePreview } from '@/components/DailyProdePreview'
export const metadata: Metadata = {
  title: 'Prode diario | Demo multideporte',
  description: 'Agenda diaria, salas y pronosticos multideporte. Demostracion con datos ficticios.',
  openGraph: { title: 'Prode diario | Demo multideporte', description: 'Agenda diaria multideporte con datos ficticios.' },
}
export default async function DailyPage({ searchParams }: { searchParams: Promise<{ jornada?: string }> }) {
  const { jornada } = await searchParams
  return <DailyProdePreview initialDate={jornada} />
}
