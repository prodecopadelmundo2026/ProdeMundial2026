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
    let listenersAttached = false

    function alreadyPlayed() {
      try {
        return sessionStorage.getItem(WELCOME_AUDIO_KEY) === '1'
      } catch {
        return true
      }
    }

    function markPlayed() {
      try {
        sessionStorage.setItem(WELCOME_AUDIO_KEY, '1')
      } catch {}
    }

    function removeInteractionListeners() {
      if (!listenersAttached) return
      window.removeEventListener('click', playOnInteraction)
      window.removeEventListener('touchstart', playOnInteraction)
      window.removeEventListener('keydown', playOnInteraction)
      listenersAttached = false
    }

    async function tryPlay(fromInteraction = false) {
      if (disposed || alreadyPlayed()) {
        removeInteractionListeners()
        return
      }

      // Colocar el archivo corto de bienvenida en public/audio/welcome.mp3.
      const audio = new Audio('/audio/welcome.mp3')
      audio.preload = 'auto'
      audio.volume = 0.35

      try {
        await audio.play()
        if (!disposed) markPlayed()
        removeInteractionListeners()
      } catch {
        if (fromInteraction) {
          removeInteractionListeners()
          return
        }
        if (!listenersAttached) {
          window.addEventListener('click', playOnInteraction, { once: true })
          window.addEventListener('touchstart', playOnInteraction, { once: true })
          window.addEventListener('keydown', playOnInteraction, { once: true })
          listenersAttached = true
        }
      }
    }

    function playOnInteraction() {
      void tryPlay(true)
    }

    void tryPlay(false)

    return () => {
      disposed = true
      removeInteractionListeners()
    }
  }, [])

  return <div className={navigating ? 'route-progress route-progress--active' : 'route-progress'} aria-hidden="true" />
}
