# Plan móvil

## Etapa 1
Web mobile-first y PWA instalable: manifest, iconos, colores, viewport, safe areas, rutas estables y estados de conexión. El proyecto ya aporta manifest e iconos; falta service worker/offline explícito antes de declararlo instalable completo.

P017 conserva la web como único producto móvil: navegación táctil, controles de al menos 40 px, safe areas y enlaces profundos existentes. No agrega permisos, notificaciones, pagos, compras ni una envoltura Capacitor hasta validar el flujo en dispositivos reales.

## Etapa 2
Empaquetado Android mediante Capacitor o Trusted Web Activity, después de validar navegación, sesiones y enlaces profundos.

## Etapa 3
Empaquetado iOS mediante Capacitor/Xcode, con pruebas de safe area, login y navegación.

## Etapa 4
Pruebas en dispositivos reales Android e iPhone.

## Etapa 5
Publicación Play Store/App Store. Con dinero real o apuestas se requieren entidad legal, licencia, edad, geolocalización, términos, privacidad, juego responsable, políticas de tienda y derechos sobre datos/logos deportivos.

No hay pagos, notificaciones ni permisos de notificación implementados.
