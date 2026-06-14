'use client'

import { useEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'

const WELCOME_AUDIO_KEY = 'prode-welcome-audio-played'

export function AppFeedback() {
  const pathname = usePathname()
  const [navigating, setNavigating] = useState(false)
  const previousPath = useRef(pathname)

  useEffect(() => {
    function handleClick(event: MouseEvent) {
      if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
      const target = event.target instanceof Element
        ? event.target.closest<HTMLAnchorElement>('a[href]')
        : null
      if (!target) return
      if (target.target && target.target !== '_self') return
      if (target.hasAttribute('download')) return

      const nextUrl = new URL(target.href, window.location.href)
      if (nextUrl.origin !== window.location.origin) return
      if (nextUrl.pathname === window.location.pathname && nextUrl.search === window.location.search) return

      setNavigating(true)
      window.setTimeout(() => setNavigating(false), 1200)
    }

    document.addEventListener('click', handleClick, true)
    return () => document.removeEventListener('click', handleClick, true)
  }, [])

  useEffect(() => {
    if (previousPath.current === pathname) return
    previousPath.current = pathname
    const timer = window.setTimeout(() => setNavigating(false), 220)
    return () => window.clearTimeout(timer)
  }, [pathname])

  useEffect(() => {
    let disposed = false
    let playing = false
    const audio = new Audio('/audio/welcome.mp3')
    // Colocar el archivo corto de bienvenida en public/audio/welcome.mp3.
    audio.preload = 'auto'
    audio.volume = 0.18

    function alreadyPlayed() {
      try {
        return localStorage.getItem(WELCOME_AUDIO_KEY) === '1'
      } catch {
        return true
      }
    }

    function markPlayed() {
      try {
        localStorage.setItem(WELCOME_AUDIO_KEY, '1')
      } catch {}
    }

    async function playWelcomeAudio() {
      if (disposed || playing || alreadyPlayed()) {
        removeInteractionListeners()
        return
      }

      playing = true
      try {
        audio.currentTime = 0
        await audio.play()
        if (!disposed) markPlayed()
        removeInteractionListeners()
      } catch {
        // Si el archivo no existe o el navegador rechaza el play, no bloqueamos la UI.
        // Si fue bloqueo de activacion/autoplay, mantenemos listeners para reintentar en el proximo gesto real.
      } finally {
        playing = false
      }
    }

    function handleFirstInteraction() {
      void playWelcomeAudio()
    }

    function removeInteractionListeners() {
      window.removeEventListener('pointerdown', handleFirstInteraction)
      window.removeEventListener('click', handleFirstInteraction)
      window.removeEventListener('touchstart', handleFirstInteraction)
      window.removeEventListener('touchmove', handleFirstInteraction)
      window.removeEventListener('scroll', handleFirstInteraction)
      window.removeEventListener('wheel', handleFirstInteraction)
    }

    if (!alreadyPlayed()) {
      window.addEventListener('pointerdown', handleFirstInteraction, { passive: true })
      window.addEventListener('click', handleFirstInteraction, { passive: true })
      window.addEventListener('touchstart', handleFirstInteraction, { passive: true })
      window.addEventListener('touchmove', handleFirstInteraction, { passive: true })
      window.addEventListener('scroll', handleFirstInteraction, { passive: true })
      window.addEventListener('wheel', handleFirstInteraction, { passive: true })
    }

    return () => {
      disposed = true
      removeInteractionListeners()
    }
  }, [])

  return <div className={navigating ? 'route-progress route-progress--active' : 'route-progress'} aria-hidden="true" />
}
