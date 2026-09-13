# Ejecucion P002 - Reglas funcionales V2

Fecha: 2026-09-13
Rama: main
Commit base verificado: 22bd94e3f85a71f678e1ab23b069f3e3093aed34

## Cambios

- Se vuelve / la portada diaria y /diario queda como alias.
- La antigua portada del Mundial se conserva en /historial/mundial.
- Se crea un modelo aislado para jornada, sala, participacion, evento, pronostico, resultado, fuente, auditoria y correccion.
- Se agregan puntajes configurables por deporte y ranking por sala.
- Se agrega contrato de proveedor futuro con deduplicacion por proveedor e identificador externo, revisiones idempotentes y conflictos con correcciones manuales.
- Se extiende la maqueta con futbol, eliminacion, tenis mejor de 3 y 5, boxeo KO y decision, estados excepcionales, carga, error, falta de participacion y empate final demo.

## Restricciones respetadas

No se hicieron migraciones, llamadas a proveedor, escrituras en Supabase, pagos, retiros, liquidacion real, deploy, push ni cambios externos. supabase/.temp/ se conserva sin tocar.

## Validacion

- TypeScript: npx tsc --noEmit --pretty false, correcto.
- ESLint dirigido a P002: sin errores. Permanece un warning heredado en la portada historica del Mundial por img HTML.
- Smoke test de reglas: exacto y general de futbol, tenis, boxeo, una entrada por sala y reparto por empate, correcto.
- Build de produccion: npm run build, correcto.
- git diff --check: correcto; solo avisos CRLF de Windows.
- Navegador local: /, /diario y /historial devolvieron 200 sin errores despues de corregir una hidratacion por formato locale de hora y fecha. /historial/mundial conserva la portada anterior, pero el entorno local no tiene SUPABASE_SERVICE_ROLE_KEY y esa pagina existente no puede completar sus consultas privilegiadas.
- Capturas responsive: 320, 390, 768, 1024 y 1366 px para la portada; 390 px para /diario e historial.
- Verificacion automatizada: los cinco anchos cargaron Prode diario sin errores de consola, overlay ni scroll horizontal. El recorrido de UI confirmo varias salas, sala sin participacion, futbol de eliminacion, tenis mejor de 3 y 5, boxeo, estados de evento y empate en primer puesto.
- Lint global: 20 errores preexistentes en BracketView, MiProdeTabs, SpecialsBanner, AdminMatchForm, WhitelistForm, MatchCard, ReferralShareButton, maintenance y prode-lock.
