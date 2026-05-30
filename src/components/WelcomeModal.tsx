'use client'

import Link from 'next/link'
import { MessageCircle, X } from 'lucide-react'
import { useEffect, useState } from 'react'

const STORAGE_KEY = 'prode-2026-welcome-seen'

export function WelcomeModal() {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const id = window.setTimeout(() => {
      if (window.localStorage.getItem(STORAGE_KEY) !== '1') {
        setOpen(true)
      }
    }, 0)
    return () => window.clearTimeout(id)
  }, [])

  function closeModal() {
    window.localStorage.setItem(STORAGE_KEY, '1')
    setOpen(false)
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[200] grid place-items-center px-4 py-6">
      <button
        type="button"
        className="absolute inset-0 cursor-default bg-black/72"
        aria-label="Cerrar bienvenida"
        onClick={closeModal}
      />
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="welcome-title"
        className="relative w-full max-w-[600px] overflow-hidden rounded-[24px] border border-white/10 bg-[#111111] p-5 shadow-2xl min-[640px]:p-7"
      >
        <div className="absolute inset-x-0 top-0 h-1.5 bg-orange" aria-hidden="true" />
        <button
          type="button"
          aria-label="Cerrar bienvenida"
          onClick={closeModal}
          className="absolute right-4 top-4 grid h-9 w-9 place-items-center rounded-full text-muted transition-colors hover:bg-white/5 hover:text-white"
        >
          <X size={18} aria-hidden="true" />
        </button>

        <p className="mb-3 inline-flex rounded-full bg-mint/10 px-3 py-1.5 text-[11px] font-extrabold uppercase tracking-[0.18em] text-mint">
          Bienvenido
        </p>
        <h2 id="welcome-title" className="max-w-[500px] font-display text-[34px] uppercase leading-[0.92] tracking-[-0.02em] min-[640px]:text-[46px]">
          Primero conocé el Prode
        </h2>
        <p className="mt-4 text-[14px] font-medium leading-relaxed text-[#cfcfcf]">
          Podés recorrer la plataforma sin iniciar sesión: reglas, premios, ranking y fixture están disponibles para que entiendas cómo funciona antes de decidir.
        </p>

        <div className="mt-5 grid gap-3 text-[13px] font-semibold leading-relaxed text-[#d8d8d8]">
          <p>Si te interesa, escribinos y podemos habilitar temporalmente tu correo para que pruebes el sistema.</p>
          <p>Durante la prueba podés cargar pronósticos, navegar, explorar y mostrarle la plataforma a tus amigos.</p>
          <p>Después decidís: si querés participar oficialmente, abonás la inscripción de <strong className="text-white">$20.000</strong>; si no continuás, los administradores pueden deshabilitar el acceso.</p>
          <p>Ingresar con Google <strong className="text-white">no crea una cuenta</strong>: solamente valida si tu correo ya fue autorizado.</p>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/reglas"
            onClick={closeModal}
            className="inline-flex items-center rounded-full bg-orange px-5 py-3 text-[13px] font-extrabold text-bg transition-transform hover:-translate-y-0.5"
          >
            Leer reglas
          </Link>
          <Link
            href="/premios"
            onClick={closeModal}
            className="inline-flex items-center rounded-full border border-white/12 bg-white/5 px-5 py-3 text-[13px] font-extrabold text-white transition-colors hover:bg-white/10"
          >
            Ver premios
          </Link>
          <Link
            href="/#contacto"
            onClick={closeModal}
            className="inline-flex items-center gap-2 rounded-full border border-mint/20 bg-mint/10 px-5 py-3 text-[13px] font-extrabold text-mint transition-colors hover:bg-mint/15"
          >
            <MessageCircle size={16} aria-hidden="true" />
            Contacto
          </Link>
        </div>
      </section>
    </div>
  )
}
