export const SALES_CONTACTS = [
  {
    name: 'Juan Ascenzi',
    role: 'Consultas',
    phone: '5491133971210',
  },
  {
    name: 'Lucas Capelli',
    role: 'Consultas',
    phone: '5491150361049',
  },
  {
    name: 'Ezequiel Squatrito',
    role: 'Consultas',
    phone: '5491130717200',
  },
  {
    name: 'Julián Fernández',
    role: 'Consultas',
    phone: '5491124598986',
  },
] as const

export const WHATSAPP_SUPPORT_MESSAGE = 'Hola! Quiero consultar por el Prode Mundial 2026.'

export function whatsappHref(phone: string, text = WHATSAPP_SUPPORT_MESSAGE) {
  return `https://wa.me/${phone}?text=${encodeURIComponent(text)}`
}
