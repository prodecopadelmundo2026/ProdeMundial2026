-- =============================================================
-- Fixture oficial Mundial 2026 — Fase Eliminatoria (partidos 73-104)
-- IMPORTANTE: ejecutar DESPUÉS del seed de grupos (IDs 1-72)
-- Los nombres de equipos son placeholders hasta conocer clasificados
-- Horarios en UTC — conversión por sede:
--   EDT (Philadelphia, Miami, Atlanta, Houston-no, NY, Foxborough, Toronto) = UTC-4
--   CDT (Arlington, Houston, Kansas City) = UTC-5
--   PDT (Los Angeles, Santa Clara, Seattle, Vancouver) = UTC-7
--   México (CDMX, Monterrey) = UTC-6 (sin DST desde 2023)
--   Argentina = UTC-3 (sumar 3h al horario UTC)
-- =============================================================

INSERT INTO matches (home_team, away_team, scheduled_at, stage, "group", status) VALUES

-- ── ROUND OF 32 (32avos de final) ────────────────────────────

-- P73 | Dom 28/6 | SoFi Stadium, Los Angeles (15:00 PDT = 22:00 UTC)
('2° Grupo A',             '2° Grupo B',             '2026-06-28 22:00:00+00', 'round_of_32', NULL, 'upcoming'),

-- P74 | Lun 29/6 | Gillette Stadium, Foxborough (16:30 EDT = 20:30 UTC)
('1° Grupo E',             '3° Grupo A/B/C/D/F',     '2026-06-29 20:30:00+00', 'round_of_32', NULL, 'upcoming'),

-- P75 | Lun 29/6 | Estadio BBVA, Monterrey (21:00 UTC-6 = 03:00 UTC +1d)
('1° Grupo F',             '2° Grupo C',             '2026-06-30 03:00:00+00', 'round_of_32', NULL, 'upcoming'),

-- P76 | Lun 29/6 | NRG Stadium, Houston (13:00 CDT = 18:00 UTC)
('1° Grupo C',             '2° Grupo F',             '2026-06-29 18:00:00+00', 'round_of_32', NULL, 'upcoming'),

-- P77 | Mar 30/6 | MetLife Stadium, East Rutherford (17:00 EDT = 21:00 UTC)
('1° Grupo I',             '3° Grupo C/D/F/G/H',     '2026-06-30 21:00:00+00', 'round_of_32', NULL, 'upcoming'),

-- P78 | Mar 30/6 | AT&T Stadium, Arlington (13:00 CDT = 18:00 UTC)
('2° Grupo E',             '2° Grupo I',             '2026-06-30 18:00:00+00', 'round_of_32', NULL, 'upcoming'),

-- P79 | Mar 30/6 | Estadio Azteca, CDMX (21:00 UTC-6 = 03:00 UTC +1d)
('1° Grupo A',             '3° Grupo C/E/F/H/I',     '2026-07-01 03:00:00+00', 'round_of_32', NULL, 'upcoming'),

-- P80 | Mié 1/7 | Mercedes-Benz Stadium, Atlanta (12:00 EDT = 16:00 UTC)
('1° Grupo L',             '3° Grupo E/H/I/J/K',     '2026-07-01 16:00:00+00', 'round_of_32', NULL, 'upcoming'),

-- P81 | Mié 1/7 | Levi's Stadium, Santa Clara (20:00 PDT = 03:00 UTC +1d)
('1° Grupo D',             '3° Grupo B/E/F/I/J',     '2026-07-02 03:00:00+00', 'round_of_32', NULL, 'upcoming'),

-- P82 | Mié 1/7 | Lumen Field, Seattle (16:00 PDT = 23:00 UTC)
('1° Grupo G',             '3° Grupo A/E/H/I/J',     '2026-07-01 23:00:00+00', 'round_of_32', NULL, 'upcoming'),

-- P83 | Jue 2/7 | BMO Field, Toronto (19:00 EDT = 23:00 UTC)
('2° Grupo K',             '2° Grupo L',             '2026-07-02 23:00:00+00', 'round_of_32', NULL, 'upcoming'),

-- P84 | Jue 2/7 | SoFi Stadium, Los Angeles (15:00 PDT = 22:00 UTC)
('1° Grupo H',             '2° Grupo J',             '2026-07-02 22:00:00+00', 'round_of_32', NULL, 'upcoming'),

-- P85 | Jue 2/7 | BC Place, Vancouver (23:00 PDT = 06:00 UTC +1d)
('1° Grupo B',             '3° Grupo E/F/G/I/J',     '2026-07-03 06:00:00+00', 'round_of_32', NULL, 'upcoming'),

-- P86 | Vie 3/7 | Hard Rock Stadium, Miami (18:00 EDT = 22:00 UTC)
('1° Grupo J',             '2° Grupo H',             '2026-07-03 22:00:00+00', 'round_of_32', NULL, 'upcoming'),

-- P87 | Vie 3/7 | Arrowhead Stadium, Kansas City (21:30 CDT = 02:30 UTC +1d)
('1° Grupo K',             '3° Grupo D/E/I/J/L',     '2026-07-04 02:30:00+00', 'round_of_32', NULL, 'upcoming'),

-- P88 | Vie 3/7 | AT&T Stadium, Arlington (14:00 CDT = 19:00 UTC)
('2° Grupo D',             '2° Grupo G',             '2026-07-03 19:00:00+00', 'round_of_32', NULL, 'upcoming'),

-- ── OCTAVOS DE FINAL ──────────────────────────────────────────

-- P89 | Sáb 4/7 | Lincoln Financial Field, Philadelphia (17:00 EDT = 21:00 UTC)
('Ganador P74',            'Ganador P77',            '2026-07-04 21:00:00+00', 'round_of_16', NULL, 'upcoming'),

-- P90 | Sáb 4/7 | NRG Stadium, Houston (13:00 CDT = 18:00 UTC)
('Ganador P73',            'Ganador P75',            '2026-07-04 18:00:00+00', 'round_of_16', NULL, 'upcoming'),

-- P91 | Dom 5/7 | MetLife Stadium, East Rutherford (16:00 EDT = 20:00 UTC)
('Ganador P76',            'Ganador P78',            '2026-07-05 20:00:00+00', 'round_of_16', NULL, 'upcoming'),

-- P92 | Dom 5/7 | Estadio Azteca, CDMX (20:00 UTC-6 = 02:00 UTC +1d)
('Ganador P79',            'Ganador P80',            '2026-07-06 02:00:00+00', 'round_of_16', NULL, 'upcoming'),

-- P93 | Lun 6/7 | AT&T Stadium, Arlington (15:00 CDT = 20:00 UTC)
('Ganador P83',            'Ganador P84',            '2026-07-06 20:00:00+00', 'round_of_16', NULL, 'upcoming'),

-- P94 | Lun 6/7 | Lumen Field, Seattle (20:00 PDT = 03:00 UTC +1d)
('Ganador P81',            'Ganador P82',            '2026-07-07 03:00:00+00', 'round_of_16', NULL, 'upcoming'),

-- P95 | Mar 7/7 | Mercedes-Benz Stadium, Atlanta (12:00 EDT = 16:00 UTC)
('Ganador P86',            'Ganador P88',            '2026-07-07 16:00:00+00', 'round_of_16', NULL, 'upcoming'),

-- P96 | Mar 7/7 | BC Place, Vancouver (16:00 PDT = 23:00 UTC)
('Ganador P85',            'Ganador P87',            '2026-07-07 23:00:00+00', 'round_of_16', NULL, 'upcoming'),

-- ── CUARTOS DE FINAL ──────────────────────────────────────────

-- P97 | Jue 9/7 | Gillette Stadium, Foxborough (16:00 EDT = 20:00 UTC)
('Ganador P89',            'Ganador P90',            '2026-07-09 20:00:00+00', 'quarter', NULL, 'upcoming'),

-- P98 | Vie 10/7 | SoFi Stadium, Los Angeles (15:00 PDT = 22:00 UTC)
('Ganador P93',            'Ganador P94',            '2026-07-10 22:00:00+00', 'quarter', NULL, 'upcoming'),

-- P99 | Sáb 11/7 | Hard Rock Stadium, Miami (17:00 EDT = 21:00 UTC)
('Ganador P91',            'Ganador P92',            '2026-07-11 21:00:00+00', 'quarter', NULL, 'upcoming'),

-- P100 | Sáb 11/7 | Arrowhead Stadium, Kansas City (21:00 CDT = 02:00 UTC +1d)
('Ganador P95',            'Ganador P96',            '2026-07-12 02:00:00+00', 'quarter', NULL, 'upcoming'),

-- ── SEMIFINALES ───────────────────────────────────────────────

-- P101 | Mar 14/7 | AT&T Stadium, Arlington (15:00 CDT = 20:00 UTC)
('Ganador P97',            'Ganador P98',            '2026-07-14 20:00:00+00', 'semi', NULL, 'upcoming'),

-- P102 | Mié 15/7 | Mercedes-Benz Stadium, Atlanta (15:00 EDT = 19:00 UTC)
('Ganador P99',            'Ganador P100',           '2026-07-15 19:00:00+00', 'semi', NULL, 'upcoming'),

-- ── TERCER PUESTO ─────────────────────────────────────────────

-- P103 | Sáb 18/7 | Hard Rock Stadium, Miami (17:00 EDT = 21:00 UTC)
('Perdedor P101',          'Perdedor P102',          '2026-07-18 21:00:00+00', 'third_place', NULL, 'upcoming'),

-- ── FINAL ─────────────────────────────────────────────────────

-- P104 | Dom 19/7 | MetLife Stadium, East Rutherford (15:00 EDT = 19:00 UTC)
('Ganador P101',           'Ganador P102',           '2026-07-19 19:00:00+00', 'final', NULL, 'upcoming');
