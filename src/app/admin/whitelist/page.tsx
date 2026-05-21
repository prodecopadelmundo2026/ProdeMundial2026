import Link from 'next/link'
import { redirect } from 'next/navigation'
import { requireAdmin } from '../actions'
import { createAdminClient } from '@/lib/supabase/admin'
import { WhitelistForm, type AuthorizedEmailRow } from './WhitelistForm'

type Props = {
  searchParams: Promise<{ q?: string }>
}

export default async function AdminWhitelistPage({ searchParams }: Props) {
  const { q } = await searchParams
  const query = q?.trim() ?? ''

  try {
    await requireAdmin()
  } catch {
    redirect('/')
  }

  const admin = createAdminClient()
  const { data, error } = await admin.rpc('admin_list_authorized_emails', {
    p_query: query,
  })

  if (error) {
    throw new Error(error.message)
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Lista blanca</h1>
            <p className="mt-1 text-sm text-gray-500">
              Administrá los emails habilitados para participar.
            </p>
          </div>
          <Link
            href="/admin"
            className="inline-flex min-h-10 items-center rounded-lg border border-gray-200 bg-white px-4 text-sm font-bold text-gray-700"
          >
            Volver al panel
          </Link>
        </div>

        <WhitelistForm rows={(data ?? []) as AuthorizedEmailRow[]} query={query} />
      </div>
    </div>
  )
}
