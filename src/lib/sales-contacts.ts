export const SALES_CONTACTS = [
  {
    name: 'Juan',
    role: 'Organización',
    phone: '5491100000000',
  },
  {
    name: 'Gaston',
    role: 'Participantes',
    phone: '5491100000000',
  },
  {
    name: 'Nicolas',
    role: 'Pagos',
    phone: '5491100000000',
  },
  {
    name: 'Santiago',
    role: 'Consultas',
    phone: '5491100000000',
  },
] as const

export function whatsappHref(phone: string, text = 'Hola! Quiero participar del Prode 26') {
  return `https://wa.me/${phone}?text=${encodeURIComponent(text)}`
}
