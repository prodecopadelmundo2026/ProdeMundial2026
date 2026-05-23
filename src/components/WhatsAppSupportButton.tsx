'use client'

import { MessageCircle, X } from 'lucide-react'
import { useState } from 'react'
import { SALES_CONTACTS, whatsappHref } from '@/lib/sales-contacts'

type Props = {
  placement?: 'floating' | 'nav'
}

export function WhatsAppSupportButton({ placement = 'floating' }: Props) {
  const [open, setOpen] = useState(false)
  const isNav = placement === 'nav'

  return (
    <div className={isNav ? 'relative z-[120]' : 'fixed bottom-4 right-4 z-[120] hidden flex-col items-end gap-3 min-[880px]:flex sm:bottom-6 sm:right-6'}>
      {open && (
        <div
          className={isNav
            ? 'fixed left-3 right-3 top-[66px] isolate z-[120] overflow-hidden rounded-[20px] border border-[#303030] bg-[#111111] p-4 shadow-2xl min-[540px]:left-1/2 min-[540px]:right-auto min-[540px]:w-[350px] min-[540px]:-translate-x-1/2'
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
                className="flex items-center justify-between gap-3 rounded-[14px] border border-[#303030] bg-[#181818] px-3 py-3 transition-colors hover:bg-[#202020]"
              >
                <span className="min-w-0">
                  <span className="block truncate text-[13px] font-extrabold text-white">{contact.name}</span>
                  <span className="block truncate text-[11px] font-semibold text-[#8A8A8A]">{contact.role}</span>
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
          : 'inline-flex h-12 items-center justify-center gap-2 rounded-full bg-[#A8F0D8] px-5 text-[14px] font-extrabold text-[#0A0A0A] shadow-lg transition-transform hover:-translate-y-0.5'
        }
      >
        <MessageCircle size={isNav ? 15 : 18} aria-hidden="true" />
        Consultas
      </button>
    </div>
  )
}
