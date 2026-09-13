import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { NavLinks } from '@/app/(app)/NavLinks'

export default async function DailyLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const metadataName = typeof user?.user_metadata?.full_name === 'string' ? user.user_metadata.full_name : user?.email?.split('@')[0]
  const initial = metadataName?.trim().charAt(0).toUpperCase() || 'U'

  return <div className="min-h-full">
    <header className="sticky top-0 z-50 border-b" style={{ background: 'rgba(10,10,10,.8)', backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)', borderColor: 'rgba(255,255,255,.08)' }}>
      <div className="relative mx-auto flex h-14 max-w-[1280px] items-center justify-between px-4">
        <NavLinks isLoggedIn={Boolean(user)} />
        {user ? (
          <Link href="/mi-prode" aria-label="Abrir Mi Prode" title="Mi Prode" className="grid h-9 w-9 place-items-center rounded-full text-[13px] font-bold" style={{ background: 'linear-gradient(135deg, #5B2D8E, #1565C0)', border: '2px solid #2a2a2a' }}>{initial}</Link>
        ) : (
          <Link href="/login" className="rounded-full px-4 py-2 text-[13px] font-extrabold" style={{ background: '#FF6B00', color: '#0A0A0A', boxShadow: '0 6px 18px -8px rgba(255,107,0,.6)' }}>Ingresar</Link>
        )}
      </div>
      <div className="h-[3px] bg-orange" />
    </header>
    <main>{children}</main>
  </div>
}
