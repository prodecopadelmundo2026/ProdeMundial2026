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
            ? 'fixed left-4 right-4 top-[66px] z-[120] rounded-[18px] p-3 shadow-[0_24px_70px_-24px_rgba(0,0,0,0.9)] min-[540px]:left-1/2 min-[540px]:right-auto min-[540px]:w-[330px] min-[540px]:-translate-x-1/2'
            : 'relative z-[120] w-[min(330px,calc(100vw-32px))] rounded-[18px] p-3 shadow-[0_24px_70px_-24px_rgba(0,0,0,0.9)]'
          }
          style={{
            background: '#141414',
            border: '1px solid #303030',
            backdropFilter: 'none',
            WebkitBackdropFilter: 'none',
          }}
        >
          <div className="mb-2 flex items-center justify-between gap-3 px-1">
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

          <div className="grid gap-2">
            {SALES_CONTACTS.map((contact) => (
              <a
                key={contact.phone}
                href={whatsappHref(contact.phone)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between gap-3 rounded-[14px] px-3 py-2.5 transition-colors hover:bg-white/[0.06]"
                style={{ border: '1px solid rgba(255,255,255,0.08)' }}
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
          ? 'inline-flex h-9 items-center justify-center gap-1.5 rounded-full px-3 text-[12px] font-extrabold text-[#0A0A0A] shadow-[0_10px_26px_-18px_rgba(168,240,216,0.85)]'
          : 'inline-flex h-12 items-center justify-center gap-2 rounded-full px-5 text-[14px] font-extrabold text-[#0A0A0A] shadow-[0_16px_38px_-18px_rgba(168,240,216,0.85)] transition-transform hover:-translate-y-0.5'
        }
        style={{ background: '#A8F0D8' }}
      >
        <MessageCircle size={isNav ? 15 : 18} aria-hidden="true" />
        Consultas
      </button>
    </div>
  )
}
