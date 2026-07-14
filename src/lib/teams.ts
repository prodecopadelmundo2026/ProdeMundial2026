export type TeamMeta = { code: string; displayCode: string; flag: string; iso2: string }

function team(code: string, flag: string, iso2: string, displayCode = code): TeamMeta {
  return { code, displayCode, flag, iso2 }
}

const TEAMS: Record<string, TeamMeta> = {
  'República Checa':      team('CZE', '🇨🇿', 'cz', 'RCH'),
  // Grupo A
  'México':               team('MEX', '🇲🇽', 'mx'),
  'Sudáfrica':            team('RSA', '🇿🇦', 'za', 'SUD'),
  'Corea del Sur':        team('KOR', '🇰🇷', 'kr', 'CDS'),
  // Grupo B
  'Canadá':               team('CAN', '🇨🇦', 'ca'),
  'Bosnia y Herzegovina': team('BIH', '🇧🇦', 'ba', 'BYH'),
  'Qatar':                team('QAT', '🇶🇦', 'qa'),
  'Suiza':                team('SUI', '🇨🇭', 'ch'),
  // Grupo C
  'Brasil':               team('BRA', '🇧🇷', 'br'),
  'Marruecos':            team('MAR', '🇲🇦', 'ma'),
  'Haití':                team('HAI', '🇭🇹', 'ht'),
  'Escocia':              team('SCO', '🏴󠁧󠁢󠁳󠁣󠁴󠁿', 'gb-sct', 'ESC'),
  'Gales':                team('WAL', '🏴󠁧󠁢󠁷󠁬󠁳󠁿', 'gb-wls', 'GAL'),
  'Irlanda del Norte':    team('NIR', '🇬🇧', 'gb-nir', 'IDN'),
  // Grupo D
  'Estados Unidos':       team('USA', '🇺🇸', 'us', 'EUA'),
  'Paraguay':             team('PAR', '🇵🇾', 'py'),
  'Australia':            team('AUS', '🇦🇺', 'au'),
  'Turquía':              team('TUR', '🇹🇷', 'tr'),
  // Grupo E
  'Alemania':             team('GER', '🇩🇪', 'de', 'ALE'),
  'Curazao':              team('CUW', '🇨🇼', 'cw', 'CUR'),
  'Costa de Marfil':      team('CIV', '🇨🇮', 'ci', 'CDM'),
  'Ecuador':              team('ECU', '🇪🇨', 'ec'),
  // Grupo F
  'Países Bajos':         team('NED', '🇳🇱', 'nl', 'HOL'),
  'Japón':                team('JPN', '🇯🇵', 'jp', 'JAP'),
  'Suecia':               team('SWE', '🇸🇪', 'se', 'SUE'),
  'Túnez':                team('TUN', '🇹🇳', 'tn'),
  // Grupo G
  'Bélgica':              team('BEL', '🇧🇪', 'be'),
  'Egipto':               team('EGY', '🇪🇬', 'eg', 'EGI'),
  'Irán':                 team('IRN', '🇮🇷', 'ir'),
  'Nueva Zelanda':        team('NZL', '🇳🇿', 'nz'),
  // Grupo H
  'España':               team('ESP', '🇪🇸', 'es'),
  'Cabo Verde':           team('CPV', '🇨🇻', 'cv', 'CVE'),
  'Arabia Saudita':       team('KSA', '🇸🇦', 'sa', 'ASA'),
  'Uruguay':              team('URU', '🇺🇾', 'uy'),
  // Grupo I
  'Francia':              team('FRA', '🇫🇷', 'fr'),
  'Senegal':              team('SEN', '🇸🇳', 'sn'),
  'Irak':                 team('IRQ', '🇮🇶', 'iq', 'IRK'),
  'Noruega':              team('NOR', '🇳🇴', 'no'),
  // Grupo J
  'Argentina':            team('ARG', '🇦🇷', 'ar'),
  'Argelia':              team('ALG', '🇩🇿', 'dz'),
  'Austria':              team('AUT', '🇦🇹', 'at'),
  'Jordania':             team('JOR', '🇯🇴', 'jo'),
  // Grupo K
  'Portugal':             team('POR', '🇵🇹', 'pt'),
  'Colombia':             team('COL', '🇨🇴', 'co'),
  'Uzbekistán':           team('UZB', '🇺🇿', 'uz'),
  'RD Congo':             team('COD', '🇨🇩', 'cd', 'RDC'),
  // Grupo L
  'Inglaterra':           team('ENG', '🏴󠁧󠁢󠁥󠁮󠁧󠁿', 'gb-eng', 'ING'),
  'Croacia':              team('CRO', '🇭🇷', 'hr'),
  'Ghana':                team('GHA', '🇬🇭', 'gh'),
  'Panamá':               team('PAN', '🇵🇦', 'pa'),
}

const TEAM_ALIASES: Record<string, string> = {
  Chequia: 'República Checa',
  Czechia: 'República Checa',
}

export const TEAM_NAMES = Object.keys(TEAMS)

const TEAMS_BY_CODE = Object.fromEntries(
  Object.values(TEAMS).map((meta) => [meta.code, meta])
) as Record<string, TeamMeta>

function fallbackTeam(value: string): TeamMeta {
  const technicalCode = value.trim().slice(0, 3).toUpperCase()
  return { code: technicalCode, displayCode: technicalCode, flag: '🌐', iso2: '' }
}

export function getTeam(name: string): TeamMeta {
  const trimmed = name.trim()
  const canonicalName = TEAM_ALIASES[trimmed] ?? trimmed
  return TEAMS[canonicalName] ?? TEAMS_BY_CODE[canonicalName.toUpperCase()] ?? fallbackTeam(trimmed)
}

export function getTeamByCode(code: string): TeamMeta {
  const normalizedCode = code.trim().toUpperCase()
  return TEAMS_BY_CODE[normalizedCode] ?? fallbackTeam(normalizedCode)
}

export function getTeamDisplayCode(name: string): string {
  const team = getTeam(name)
  return team.displayCode || team.code
}

export function flagUrl(iso2: string) {
  return `https://flagcdn.com/w80/${iso2}.png`
}
