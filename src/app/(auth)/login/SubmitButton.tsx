'use client'

import { useFormStatus } from 'react-dom'
import { Loader2 } from 'lucide-react'

export function SubmitButton() {
  const { pending } = useFormStatus()

  return (
    <button
      type="submit"
      disabled={pending}
      className="flex min-h-12 w-full items-center justify-center rounded-lg bg-[#0a3d1f] px-4 py-3 text-base font-bold text-white transition hover:bg-[#0f4f2a] disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? <Loader2 size={18} className="animate-spin" /> : 'Ingresar con Google'}
    </button>
  )
}
