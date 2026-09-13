import type { Metadata } from 'next'
import { DailyProdePreview } from '@/components/DailyProdePreview'

export const metadata: Metadata = {
  title: 'Prode diario | Operacion demo',
  description: 'Agenda operativa diaria multideporte con datos sinteticos.',
}

export default async function DiarioPage({ searchParams }: { searchParams: Promise<{ jornada?: string }> }) {
  const { jornada } = await searchParams
  return <DailyProdePreview initialDate={jornada} mode="workspace" />
}
