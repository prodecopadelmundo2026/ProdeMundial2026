import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getCurrentProfile } from '@/lib/current-profile'
import { DailyManualConsole } from './DailyManualConsole'

export default async function DailyManualAdminPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const profile = await getCurrentProfile(user)
  if (!profile?.is_admin) redirect('/')

  return <DailyManualConsole actor={profile.email ?? profile.id} />
}
