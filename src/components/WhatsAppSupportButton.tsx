'use client'

import { MessageCircle, X } from 'lucide-react'
import { useState } from 'react'
import { usePathname } from 'next/navigation'
import { SALES_CONTACTS, whatsappHref } from '@/lib/sales-contacts'

type Props = {
  placement?: 'floating' | 'nav'
}

export function WhatsAppSupportButton({ placement = 'floating' }: Props) {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()
  const isNav = placement === 'nav'

  if (pathname?.startsWith('/admin')) return null

  return (
    <div className={isNav ? 'relative z-[120]' : 'fixed bottom-[calc(16px+env(safe-area-inset-bottom))] right-3 z-[120] flex flex-col items-end gap-3 sm:right-6 min-[880px]:bottom-6'}>
      {open && (
        <div
          className={isNav
            ? 'fixed left-1/2 top-[68px] isolate z-[1000] max-h-[calc(100dvh-92px)] w-[calc(100vw-32px)] max-w-[430px] -translate-x-1/2 overflow-y-auto rounded-[20px] border border-[#303030] bg-[#111111] p-4 shadow-2xl'
            : 'relative isolate z-[120] w-[min(350px,calc(100vw-24px))] overflow-hidden rounded-[20px] border border-[#303030] bg-[#111111] p-4 shadow-2xl'
          }
        >
          <div className="absolute inset-0 bg-[#111111]" aria-hidden="true" />
          <div className="relative mb-3 flex items-center justify-between gap-3 px-1">
            <p className="text-[12px] font-extrabold uppercase tracking-[0.16em] text-[#A8F0D8]">
              WhatsApp
            </p>
            <button
              type="button"
              aria-label="Cerrar consultas"
              onClick={() => setOpen(false)}
              className="grid h-8 w-8 place-items-center rounded-full text-[#8A8A8A] transition-colors hover:text-white"
            >
              <X size={16} aria-hidden="true" />
            </button>
          </div>

          <div className="relative grid gap-2">
            {SALES_CONTACTS.map((contact) => (
              <a
                key={contact.phone}
                href={whatsappHref(contact.phone)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex min-h-[68px] items-center justify-between gap-3 rounded-[14px] border border-[#303030] bg-[#181818] px-4 py-3 transition-colors hover:bg-[#202020]"
              >
                <span className="min-w-0">
                  <span className="block truncate text-[14px] font-extrabold text-white">{contact.name}</span>
                  <span className="mt-0.5 block truncate text-[12px] font-semibold text-[#A8F0D8]">Consultar por WhatsApp</span>
                  <span className="mt-0.5 block truncate text-[11px] font-semibold text-[#8A8A8A]">{contact.role}</span>
                </span>
                <MessageCircle size={18} className="shrink-0 text-[#A8F0D8]" aria-hidden="true" />
              </a>
            ))}
          </div>
        </div>
      )}

      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className={isNav
          ? 'inline-flex h-9 items-center justify-center gap-1.5 rounded-full bg-[#A8F0D8] px-3 text-[12px] font-extrabold text-[#0A0A0A] shadow-lg'
          : 'inline-flex h-10 items-center justify-center gap-1.5 rounded-full bg-[#A8F0D8] px-3 text-[12px] font-extrabold text-[#0A0A0A] shadow-lg transition-transform hover:-translate-y-0.5 min-[880px]:h-12 min-[880px]:gap-2 min-[880px]:px-5 min-[880px]:text-[14px]'
        }
      >
        <MessageCircle size={isNav ? 15 : 18} aria-hidden="true" />
        Consultas
      </button>
    </div>
  )
}
