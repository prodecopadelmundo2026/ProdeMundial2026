export type TeamMeta = { code: string; flag: string; iso2: string }

const TEAMS: Record<string, TeamMeta> = {
  'República Checa':      { code: 'CZE', flag: '🇨🇿', iso2: 'cz' },
  // Grupo A
  'México':               { code: 'MEX', flag: '🇲🇽', iso2: 'mx' },
  'Sudáfrica':            { code: 'RSA', flag: '🇿🇦', iso2: 'za' },
  'Corea del Sur':        { code: 'KOR', flag: '🇰🇷', iso2: 'kr' },
  'Chequia':              { code: 'CZE', flag: '🇨🇿', iso2: 'cz' },
  // Grupo B
  'Canadá':               { code: 'CAN', flag: '🇨🇦', iso2: 'ca' },
  'Bosnia y Herzegovina': { code: 'BIH', flag: '🇧🇦', iso2: 'ba' },
  'Qatar':                { code: 'QAT', flag: '🇶🇦', iso2: 'qa' },
  'Suiza':                { code: 'SUI', flag: '🇨🇭', iso2: 'ch' },
  // Grupo C
  'Brasil':               { code: 'BRA', flag: '🇧🇷', iso2: 'br' },
  'Marruecos':            { code: 'MAR', flag: '🇲🇦', iso2: 'ma' },
  'Haití':                { code: 'HAI', flag: '🇭🇹', iso2: 'ht' },
  'Escocia':              { code: 'SCO', flag: '🏴󠁧󠁢󠁳󠁣󠁴󠁿', iso2: 'gb-sct' },
  'Gales':                { code: 'WAL', flag: '🏴󠁧󠁢󠁷󠁬󠁳󠁿', iso2: 'gb-wls' },
  'Irlanda del Norte':    { code: 'NIR', flag: '🇬🇧', iso2: 'gb-nir' },
  // Grupo D
  'Estados Unidos':       { code: 'USA', flag: '🇺🇸', iso2: 'us' },
  'Paraguay':             { code: 'PAR', flag: '🇵🇾', iso2: 'py' },
  'Australia':            { code: 'AUS', flag: '🇦🇺', iso2: 'au' },
  'Turquía':              { code: 'TUR', flag: '🇹🇷', iso2: 'tr' },
  // Grupo E
  'Alemania':             { code: 'GER', flag: '🇩🇪', iso2: 'de' },
  'Curazao':              { code: 'CUW', flag: '🇨🇼', iso2: 'cw' },
  'Costa de Marfil':      { code: 'CIV', flag: '🇨🇮', iso2: 'ci' },
  'Ecuador':              { code: 'ECU', flag: '🇪🇨', iso2: 'ec' },
  // Grupo F
  'Países Bajos':         { code: 'NED', flag: '🇳🇱', iso2: 'nl' },
  'Japón':                { code: 'JPN', flag: '🇯🇵', iso2: 'jp' },
  'Suecia':               { code: 'SWE', flag: '🇸🇪', iso2: 'se' },
  'Túnez':                { code: 'TUN', flag: '🇹🇳', iso2: 'tn' },
  // Grupo G
  'Bélgica':              { code: 'BEL', flag: '🇧🇪', iso2: 'be' },
  'Egipto':               { code: 'EGY', flag: '🇪🇬', iso2: 'eg' },
  'Irán':                 { code: 'IRN', flag: '🇮🇷', iso2: 'ir' },
  'Nueva Zelanda':        { code: 'NZL', flag: '🇳🇿', iso2: 'nz' },
  // Grupo H
  'España':               { code: 'ESP', flag: '🇪🇸', iso2: 'es' },
  'Cabo Verde':           { code: 'CPV', flag: '🇨🇻', iso2: 'cv' },
  'Arabia Saudita':       { code: 'KSA', flag: '🇸🇦', iso2: 'sa' },
  'Uruguay':              { code: 'URU', flag: '🇺🇾', iso2: 'uy' },
  // Grupo I
  'Francia':              { code: 'FRA', flag: '🇫🇷', iso2: 'fr' },
  'Senegal':              { code: 'SEN', flag: '🇸🇳', iso2: 'sn' },
  'Irak':                 { code: 'IRQ', flag: '🇮🇶', iso2: 'iq' },
  'Noruega':              { code: 'NOR', flag: '🇳🇴', iso2: 'no' },
  // Grupo J
  'Argentina':            { code: 'ARG', flag: '🇦🇷', iso2: 'ar' },
  'Argelia':              { code: 'ALG', flag: '🇩🇿', iso2: 'dz' },
  'Austria':              { code: 'AUT', flag: '🇦🇹', iso2: 'at' },
  'Jordania':             { code: 'JOR', flag: '🇯🇴', iso2: 'jo' },
  // Grupo K
  'Portugal':             { code: 'POR', flag: '🇵🇹', iso2: 'pt' },
  'Colombia':             { code: 'COL', flag: '🇨🇴', iso2: 'co' },
  'Uzbekistán':           { code: 'UZB', flag: '🇺🇿', iso2: 'uz' },
  'RD Congo':             { code: 'COD', flag: '🇨🇩', iso2: 'cd' },
  // Grupo L
  'Inglaterra':           { code: 'ENG', flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', iso2: 'gb-eng' },
  'Croacia':              { code: 'CRO', flag: '🇭🇷', iso2: 'hr' },
  'Ghana':                { code: 'GHA', flag: '🇬🇭', iso2: 'gh' },
  'Panamá':               { code: 'PAN', flag: '🇵🇦', iso2: 'pa' },
}

export const TEAM_NAMES = Object.keys(TEAMS)

export function getTeam(name: string): TeamMeta {
  return TEAMS[name] ?? { code: name.slice(0, 3).toUpperCase(), flag: '🏳️', iso2: '' }
}

export function flagUrl(iso2: string) {
  return `https://flagcdn.com/w80/${iso2}.png`
}
