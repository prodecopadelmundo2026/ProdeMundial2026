export type TeamMeta = { code: string; flag: string }

const TEAMS: Record<string, TeamMeta> = {
  // Grupo A
  'México': { code: 'MEX', flag: '🇲🇽' },
  'Sudáfrica': { code: 'RSA', flag: '🇿🇦' },
  'Corea del Sur': { code: 'KOR', flag: '🇰🇷' },
  'Chequia': { code: 'CZE', flag: '🇨🇿' },
  // Grupo B
  'Canadá': { code: 'CAN', flag: '🇨🇦' },
  'Bosnia y Herzegovina': { code: 'BIH', flag: '🇧🇦' },
  'Qatar': { code: 'QAT', flag: '🇶🇦' },
  'Suiza': { code: 'SUI', flag: '🇨🇭' },
  // Grupo C
  'Brasil': { code: 'BRA', flag: '🇧🇷' },
  'Marruecos': { code: 'MAR', flag: '🇲🇦' },
  'Haití': { code: 'HAI', flag: '🇭🇹' },
  'Escocia': { code: 'SCO', flag: '🏴󠁧󠁢󠁳󠁣󠁴󠁿' },
  // Grupo D
  'Estados Unidos': { code: 'USA', flag: '🇺🇸' },
  'Paraguay': { code: 'PAR', flag: '🇵🇾' },
  'Australia': { code: 'AUS', flag: '🇦🇺' },
  'Turquía': { code: 'TUR', flag: '🇹🇷' },
  // Grupo E
  'Alemania': { code: 'GER', flag: '🇩🇪' },
  'Curazao': { code: 'CUW', flag: '🇨🇼' },
  'Costa de Marfil': { code: 'CIV', flag: '🇨🇮' },
  'Ecuador': { code: 'ECU', flag: '🇪🇨' },
  // Grupo F
  'Países Bajos': { code: 'NED', flag: '🇳🇱' },
  'Japón': { code: 'JPN', flag: '🇯🇵' },
  'Suecia': { code: 'SWE', flag: '🇸🇪' },
  'Túnez': { code: 'TUN', flag: '🇹🇳' },
  // Grupo G
  'Bélgica': { code: 'BEL', flag: '🇧🇪' },
  'Egipto': { code: 'EGY', flag: '🇪🇬' },
  'Irán': { code: 'IRN', flag: '🇮🇷' },
  'Nueva Zelanda': { code: 'NZL', flag: '🇳🇿' },
  // Grupo H
  'España': { code: 'ESP', flag: '🇪🇸' },
  'Cabo Verde': { code: 'CPV', flag: '🇨🇻' },
  'Arabia Saudita': { code: 'KSA', flag: '🇸🇦' },
  'Uruguay': { code: 'URU', flag: '🇺🇾' },
  // Grupo I
  'Francia': { code: 'FRA', flag: '🇫🇷' },
  'Senegal': { code: 'SEN', flag: '🇸🇳' },
  'Irak': { code: 'IRQ', flag: '🇮🇶' },
  'Noruega': { code: 'NOR', flag: '🇳🇴' },
  // Grupo J
  'Argentina': { code: 'ARG', flag: '🇦🇷' },
  'Argelia': { code: 'ALG', flag: '🇩🇿' },
  'Austria': { code: 'AUT', flag: '🇦🇹' },
  'Jordania': { code: 'JOR', flag: '🇯🇴' },
  // Grupo K
  'Portugal': { code: 'POR', flag: '🇵🇹' },
  'Colombia': { code: 'COL', flag: '🇨🇴' },
  'Uzbekistán': { code: 'UZB', flag: '🇺🇿' },
  'RD Congo': { code: 'COD', flag: '🇨🇩' },
  // Grupo L
  'Inglaterra': { code: 'ENG', flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿' },
  'Croacia': { code: 'CRO', flag: '🇭🇷' },
  'Ghana': { code: 'GHA', flag: '🇬🇭' },
  'Panamá': { code: 'PAN', flag: '🇵🇦' },
}

export function getTeam(name: string): TeamMeta {
  return TEAMS[name] ?? { code: name.slice(0, 3).toUpperCase(), flag: '🏳️' }
}
