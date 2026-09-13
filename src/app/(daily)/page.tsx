import type { Metadata } from 'next'
import { DailyProdePreview } from '@/components/DailyProdePreview'
export const metadata: Metadata = {
  title: 'Prode diario | Pronósticos multideporte',
  description: 'Resumen diario de eventos verificados, salas y pronósticos multideporte.',
  openGraph: { title: 'Prode diario | Pronósticos multideporte', description: 'Resumen diario de eventos verificados.' },
}
export default async function DailyPage({ searchParams }: { searchParams: Promise<{ jornada?: string }> }) {
  const { jornada } = await searchParams
  return <DailyProdePreview initialDate={jornada} />
}
