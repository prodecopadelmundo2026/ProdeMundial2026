'use client'

import { Share2 } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'

type Props = {
  name?: string | null
  email?: string | null
  userId?: string | null
  className?: string
}

function buildReferralText(
  { name, email, userId }: Pick<Props, 'name' | 'email' | 'userId'>,
  url: string
) {
  if (name || email || userId) {
    return [
      'Sumate al Prode Mundial 2026',
      '',
      'Yo ya estoy participando y te invito a jugar.',
      '',
      'Avisa que venis referido por:',
      name || 'Participante del Prode',
      email || '',
      userId ? `ID: ${userId}` : '',
      '',
      'Entra aca:',
      url,
    ]
      .filter((line) => line !== '')
      .join('\n')
  }

  return [
    'Sumate al Prode Mundial 2026',
    '',
    'Entra, habla con los organizadores y avisa quien te invito asi queda anotado el referido.',
    '',
    url,
  ].join('\n')
}

export function ReferralShareButton({
  name,
  email,
  userId,
  className,
}: Props) {
  const [siteUrl, setSiteUrl] = useState('')

  useEffect(() => {
    setSiteUrl(window.location.origin)
  }, [])

  const href = useMemo(() => {
    const text = buildReferralText(
      { name, email, userId },
      siteUrl || 'https://prode-mundial2026.vercel.app'
    )

    return `https://wa.me/?text=${encodeURIComponent(text)}`
  }, [email, name, siteUrl, userId])

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={
        className ??
        'inline-flex items-center gap-2 rounded-[14px] px-5 py-3.5 text-[13px] font-extrabold transition-transform hover:-translate-y-0.5'
      }
      style={{
        background: '#FF6B00',
        color: '#0A0A0A',
        letterSpacing: '.02em',
      }}
    >
      <Share2 size={15} strokeWidth={2.5} aria-hidden="true" />
      Invita amigos
    </a>
  )
}