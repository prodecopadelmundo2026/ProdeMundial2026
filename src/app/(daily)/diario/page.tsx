import type { Metadata } from 'next'
import { DailyProdePreview } from '@/components/DailyProdePreview'

export const metadata: Metadata = {
  title: 'Prode diario | Agenda',
  description: 'Agenda diaria de eventos verificados y pronósticos multideporte.',
}

export default async function DiarioPage({ searchParams }: { searchParams: Promise<{ jornada?: string }> }) {
  const { jornada } = await searchParams
  return <DailyProdePreview initialDate={jornada} mode="workspace" />
}
