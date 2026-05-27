-- =============================================================
-- Fixture oficial Mundial 2026 — Fase de Grupos (72 partidos)
-- Fuente: ESPN / Infobae / FIFA
-- Horarios en UTC (Argentina = UTC-3, sumar 3h para convertir)
-- locked_at se calcula automáticamente via trigger
-- =============================================================

-- Limpiar datos previos si existen
TRUNCATE TABLE predictions, matches RESTART IDENTITY CASCADE;

INSERT INTO matches (home_team, away_team, scheduled_at, stage, "group", status) VALUES

-- ── GRUPO A: México · Sudáfrica · Corea del Sur · República Checa ─────
-- J1 Jue 11/6
('México',        'Sudáfrica',   '2026-06-11 19:00:00+00', 'group', 'A', 'upcoming'),
('Corea del Sur', 'República Checa', '2026-06-12 02:00:00+00', 'group', 'A', 'upcoming'),
-- J2 Jue 18/6
('República Checa', 'Sudáfrica',   '2026-06-18 16:00:00+00', 'group', 'A', 'upcoming'),
('México',        'Corea del Sur','2026-06-19 01:00:00+00', 'group', 'A', 'upcoming'),
-- J3 Mié 24/6 (simultáneos)
('República Checa', 'México',      '2026-06-25 01:00:00+00', 'group', 'A', 'upcoming'),
('Sudáfrica',     'Corea del Sur','2026-06-25 01:00:00+00', 'group', 'A', 'upcoming'),

-- ── GRUPO B: Canadá · Bosnia y Herz. · Qatar · Suiza ──────────
-- J1 Vie 12/6 y Sáb 13/6
('Canadá',            'Bosnia y Herzegovina', '2026-06-12 19:00:00+00', 'group', 'B', 'upcoming'),
('Qatar',             'Suiza',               '2026-06-13 19:00:00+00', 'group', 'B', 'upcoming'),
-- J2 Jue 18/6
('Suiza',             'Bosnia y Herzegovina', '2026-06-18 19:00:00+00', 'group', 'B', 'upcoming'),
('Canadá',            'Qatar',               '2026-06-18 22:00:00+00', 'group', 'B', 'upcoming'),
-- J3 Mié 24/6 (simultáneos)
('Suiza',             'Canadá',              '2026-06-24 19:00:00+00', 'group', 'B', 'upcoming'),
('Bosnia y Herzegovina','Qatar',             '2026-06-24 19:00:00+00', 'group', 'B', 'upcoming'),

-- ── GRUPO C: Brasil · Marruecos · Haití · Escocia ────────────
-- J1 Sáb 13/6
('Brasil',    'Marruecos', '2026-06-13 22:00:00+00', 'group', 'C', 'upcoming'),
('Haití',     'Escocia',   '2026-06-14 01:00:00+00', 'group', 'C', 'upcoming'),
-- J2 Vie 19/6
('Escocia',   'Marruecos', '2026-06-19 22:00:00+00', 'group', 'C', 'upcoming'),
('Brasil',    'Haití',     '2026-06-20 01:00:00+00', 'group', 'C', 'upcoming'),
-- J3 Mié 24/6 (simultáneos)
('Escocia',   'Brasil',    '2026-06-24 22:00:00+00', 'group', 'C', 'upcoming'),
('Marruecos', 'Haití',     '2026-06-24 22:00:00+00', 'group', 'C', 'upcoming'),

-- ── GRUPO D: Estados Unidos · Paraguay · Australia · Turquía ──
-- J1 Vie 12/6 y Dom 14/6
('Estados Unidos', 'Paraguay',  '2026-06-13 01:00:00+00', 'group', 'D', 'upcoming'),
('Australia',      'Turquía',   '2026-06-14 04:00:00+00', 'group', 'D', 'upcoming'),
-- J2 Vie 19/6
('Estados Unidos', 'Australia', '2026-06-19 19:00:00+00', 'group', 'D', 'upcoming'),
('Turquía',        'Paraguay',  '2026-06-20 04:00:00+00', 'group', 'D', 'upcoming'),
-- J3 Jue 25/6 (simultáneos)
('Turquía',        'Estados Unidos', '2026-06-26 02:00:00+00', 'group', 'D', 'upcoming'),
('Paraguay',       'Australia', '2026-06-26 02:00:00+00', 'group', 'D', 'upcoming'),

-- ── GRUPO E: Alemania · Costa de Marfil · Ecuador · Curazao ───
-- J1 Dom 14/6
('Alemania',        'Curazao',        '2026-06-14 17:00:00+00', 'group', 'E', 'upcoming'),
('Costa de Marfil', 'Ecuador',        '2026-06-14 23:00:00+00', 'group', 'E', 'upcoming'),
-- J2 Sáb 20/6
('Alemania',        'Costa de Marfil','2026-06-20 20:00:00+00', 'group', 'E', 'upcoming'),
('Ecuador',         'Curazao',        '2026-06-21 02:00:00+00', 'group', 'E', 'upcoming'),
-- J3 Mié 25/6 (simultáneos)
('Curazao',         'Costa de Marfil','2026-06-25 20:00:00+00', 'group', 'E', 'upcoming'),
('Ecuador',         'Alemania',       '2026-06-25 20:00:00+00', 'group', 'E', 'upcoming'),

-- ── GRUPO F: Países Bajos · Japón · Suecia · Túnez ───────────
-- J1 Dom 14/6
('Países Bajos', 'Japón',        '2026-06-14 20:00:00+00', 'group', 'F', 'upcoming'),
('Suecia',       'Túnez',        '2026-06-15 02:00:00+00', 'group', 'F', 'upcoming'),
-- J2 Sáb 20/6
('Países Bajos', 'Suecia',       '2026-06-20 17:00:00+00', 'group', 'F', 'upcoming'),
('Túnez',        'Japón',        '2026-06-21 04:00:00+00', 'group', 'F', 'upcoming'),
-- J3 Mié 25/6 (simultáneos)
('Japón',        'Suecia',       '2026-06-25 23:00:00+00', 'group', 'F', 'upcoming'),
('Túnez',        'Países Bajos', '2026-06-25 23:00:00+00', 'group', 'F', 'upcoming'),

-- ── GRUPO G: Bélgica · Egipto · Irán · Nueva Zelanda ─────────
-- J1 Lun 15/6
('Bélgica',       'Egipto',        '2026-06-15 19:00:00+00', 'group', 'G', 'upcoming'),
('Irán',          'Nueva Zelanda', '2026-06-16 01:00:00+00', 'group', 'G', 'upcoming'),
-- J2 Dom 21/6
('Bélgica',       'Irán',          '2026-06-21 19:00:00+00', 'group', 'G', 'upcoming'),
('Nueva Zelanda', 'Egipto',        '2026-06-22 01:00:00+00', 'group', 'G', 'upcoming'),
-- J3 Vie 26/6 (simultáneos)
('Egipto',        'Irán',          '2026-06-26 03:00:00+00', 'group', 'G', 'upcoming'),
('Nueva Zelanda', 'Bélgica',       '2026-06-26 03:00:00+00', 'group', 'G', 'upcoming'),

-- ── GRUPO H: España · Cabo Verde · Arabia Saudita · Uruguay ───
-- J1 Lun 15/6
('España',        'Cabo Verde',    '2026-06-15 16:00:00+00', 'group', 'H', 'upcoming'),
('Arabia Saudita','Uruguay',       '2026-06-15 22:00:00+00', 'group', 'H', 'upcoming'),
-- J2 Dom 21/6
('España',        'Arabia Saudita','2026-06-21 16:00:00+00', 'group', 'H', 'upcoming'),
('Uruguay',       'Cabo Verde',    '2026-06-21 22:00:00+00', 'group', 'H', 'upcoming'),
-- J3 Vie 26/6 (simultáneos)
('Cabo Verde',    'Arabia Saudita','2026-06-27 00:00:00+00', 'group', 'H', 'upcoming'),
('Uruguay',       'España',        '2026-06-27 00:00:00+00', 'group', 'H', 'upcoming'),

-- ── GRUPO I: Francia · Senegal · Irak · Noruega ──────────────
-- J1 Mar 16/6
('Francia',  'Senegal', '2026-06-16 19:00:00+00', 'group', 'I', 'upcoming'),
('Irak',     'Noruega', '2026-06-16 22:00:00+00', 'group', 'I', 'upcoming'),
-- J2 Lun 22/6
('Francia',  'Irak',    '2026-06-22 21:00:00+00', 'group', 'I', 'upcoming'),
('Noruega',  'Senegal', '2026-06-23 00:00:00+00', 'group', 'I', 'upcoming'),
-- J3 Vie 26/6 (simultáneos)
('Noruega',  'Francia', '2026-06-26 19:00:00+00', 'group', 'I', 'upcoming'),
('Senegal',  'Irak',    '2026-06-26 19:00:00+00', 'group', 'I', 'upcoming'),

-- ── GRUPO J: Argentina · Argelia · Austria · Jordania ─────────
-- J1 Mar 16/6 y Mié 17/6
('Argentina', 'Argelia',  '2026-06-17 01:00:00+00', 'group', 'J', 'upcoming'),
('Austria',   'Jordania', '2026-06-17 04:00:00+00', 'group', 'J', 'upcoming'),
-- J2 Lun 22/6
('Argentina', 'Austria',  '2026-06-22 17:00:00+00', 'group', 'J', 'upcoming'),
('Jordania',  'Argelia',  '2026-06-23 03:00:00+00', 'group', 'J', 'upcoming'),
-- J3 Sáb 27/6 (simultáneos)
('Argelia',   'Austria',  '2026-06-28 02:00:00+00', 'group', 'J', 'upcoming'),
('Jordania',  'Argentina','2026-06-28 02:00:00+00', 'group', 'J', 'upcoming'),

-- ── GRUPO K: Portugal · Colombia · Uzbekistán · RD Congo ──────
-- J1 Mié 17/6
('Portugal',    'RD Congo',   '2026-06-17 17:00:00+00', 'group', 'K', 'upcoming'),
('Uzbekistán',  'Colombia',   '2026-06-18 02:00:00+00', 'group', 'K', 'upcoming'),
-- J2 Mar 23/6
('Portugal',    'Uzbekistán', '2026-06-23 17:00:00+00', 'group', 'K', 'upcoming'),
('Colombia',    'RD Congo',   '2026-06-24 02:00:00+00', 'group', 'K', 'upcoming'),
-- J3 Sáb 27/6 (simultáneos)
('Colombia',    'Portugal',   '2026-06-27 23:30:00+00', 'group', 'K', 'upcoming'),
('RD Congo',    'Uzbekistán', '2026-06-27 23:30:00+00', 'group', 'K', 'upcoming'),

-- ── GRUPO L: Inglaterra · Croacia · Ghana · Panamá ───────────
-- J1 Mié 17/6
('Inglaterra', 'Croacia', '2026-06-17 20:00:00+00', 'group', 'L', 'upcoming'),
('Ghana',      'Panamá',  '2026-06-17 23:00:00+00', 'group', 'L', 'upcoming'),
-- J2 Mar 23/6
('Inglaterra', 'Ghana',   '2026-06-23 20:00:00+00', 'group', 'L', 'upcoming'),
('Panamá',     'Croacia', '2026-06-23 23:00:00+00', 'group', 'L', 'upcoming'),
-- J3 Sáb 27/6 (simultáneos)
('Croacia',    'Ghana',   '2026-06-27 21:00:00+00', 'group', 'L', 'upcoming'),
('Panamá',     'Inglaterra','2026-06-27 21:00:00+00', 'group', 'L', 'upcoming');
