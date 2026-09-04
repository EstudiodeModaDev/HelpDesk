# Componentes de Formatos

## Descripción general
Este módulo cubre la pantalla de "Formatos" del help desk: un selector inicial de tipo de solicitud administrativa (servicios de TI, seguridad de red, seguridad ERP, permisos de navegación) que muestra sus términos y condiciones, y luego enruta a uno de cuatro formularios especializados. Cada formulario es una tabla editable de filas (excepto Servicios de TI, que es un formulario de una sola entidad) que al enviarse dispara un flujo de Power Automate y crea/actualiza un ticket en SharePoint. Es el punto de entrada para que un jefe/responsable de área solicite accesos o servicios de TI para un usuario.

## Archivos
- `src/components/Formatos/Formatos.tsx`: pantalla inicial con `<select>` de tipo de solicitud, texto de términos y condiciones (HTML embebido por opción) y checkbox de aceptación; al confirmar, renderiza condicionalmente uno de los cuatro formularios hijos.
- `src/components/Formatos/PermisosNavegacion/PermisosNavegacion.tsx`: formulario tabular para solicitar permisos de navegación a redes sociales/herramientas (YouTube, Facebook, Twitter, Instagram, WhatsApp, Wetransfer, Pinterest, Google Analytics, Google Drive, "Otro").
- `src/components/Formatos/Seguridad de red/SeguridadRed.tsx`: formulario tabular para solicitar permisos (lectura/escritura) sobre carpetas/subcarpetas de red para personas específicas.
- `src/components/Formatos/SeguridadERP/SeguridadERP.tsx`: formulario tabular para solicitar perfiles/métodos/permisos específicos del ERP para un usuario (nombre y correo).
- `src/components/Formatos/ServiciosTI/ServiciosTI.tsx`: formulario extenso (dos columnas) de alta de usuario nuevo, con datos personales/organizacionales, tipo de equipo y checklist de servicios (correo, office, ERP, pedidos, POS, impresoras, generic transfer).

## Funciones y constantes clave

| Componente | Props | Hook de Funcionalidades | Estado local | Handlers clave |
|---|---|---|---|---|
| `Formatos` (default export) | ninguna | ninguno (orquesta solo los sub-formularios) | `opcion` (`OpcionSolicitud \| null`), `acepta` (bool), `confirmado` (bool) | `confirmar()` habilita el paso al formulario si hay opción y aceptación; `onChange` del `<select>` resetea `acepta`/`confirmado` |
| `PermisosNavegacion` | ninguna | `usePermisosNavegacion(TicketsSvc)` de `Funcionalidades/forms/Formatos.ts` | ninguno propio (todo viene del hook vía `filas`) | `toggle(id, key)` (memoizado con `useCallback`) invierte un checkbox de una fila; `setCampoNav` delega a `setCampo` del hook |
| `SeguridadRed` | ninguna | `useSolicitudesRed(tickets)` | ninguno propio | `submit`, `addFila`, `removeFila`, `setCampo` vienen todos del hook |
| `SolicitudERP` (SeguridadERP.tsx) | ninguna | `usePermisosERP(tickets)` | ninguno propio | ídem, delegado al hook |
| `SolicitudUsuarioForm` (ServiciosTI.tsx) | ninguna | `useSolicitudServicios(tickets)` | ninguno propio | `setField`, `handleSubmit` del hook |

Constantes de UI relevantes:
- `OPCIONES` y `TYC_BY_OPCION` en `Formatos.tsx`: catálogo de tipos de solicitud y su HTML de términos y condiciones (inyectado con `dangerouslySetInnerHTML`).
- `COLS` en `PermisosNavegacion.tsx`: columnas tipadas (`as const satisfies ReadonlyArray<{ key: keyof FilaPermisoNav; label: string }>`) que generan dinámicamente los checkboxes de la tabla.
- `PERMISOS` en `SeguridadRed.tsx`: opciones del `<select>` de permiso (`Lectura`, `Escritura`, `Lectura y escritura`).
- `SERVICIOS_CATALOG` y `ciudades` en `ServiciosTI.tsx`: catálogo de checkboxes de servicios y lista fija de ciudades.

Todos los formularios tabulares comparten el mismo patrón de hook (definidos en `src/Funcionalidades/forms/Formatos.ts`):
- Estado manejado con `React.useReducer` y una acción genérica `ActionOf<T>` (`ADD`, `REMOVE`, `SET`, `ERROR`, `SENDING`, `RESET`).
- Devuelven `{ filas, sending, error, requiredOk, addFila, removeFila, setCampo, submit }` (excepto `useSolicitudServicios`, que maneja una sola entidad y devuelve `{ state, errors, sending, setField, handleSubmit }`).
- `submit`/`handleSubmit` validan campos mínimos, arman un payload, lo envían a un `FlowClient` (Power Automate) hard-codeado con URL propia por formulario, calculan la fecha de solución vía `calcularFechaSolucion` + `fetchHolidays`, y actualizan el ticket creado (`TicketsRepository.updateTicket`) con `FechaMaxima`.
- Usan `useAuth()` para obtener `account.name`/`account.username` como solicitante.

## Flujo del módulo
1. El usuario abre "Formatos" y ve el `<select>` de `Formatos.tsx` con las 4 opciones (`OPCIONES`).
2. Al elegir una opción se muestran sus términos y condiciones (`TYC_BY_OPCION`) y debe marcar el checkbox "Acepto…".
3. Al pulsar "Continuar" (`confirmar()`), si `opcion && acepta`, se fija `confirmado = true` y el componente renderiza el sub-formulario correspondiente (`SolicitudUsuarioForm`, `SolicitudesRed`, `SolicitudERP` o `PermisosNavegacion`). El botón "Cancelar" reinicia todo el estado.
4. Dentro de cada sub-formulario tabular (Red, ERP, Navegación) el usuario agrega filas (`addFila`), llena campos (`setCampo`) y puede eliminar filas (`removeFila`, deshabilitado si solo queda una).
5. Al enviar (`submit`), se valida que las filas tengan datos mínimos; si falta algo se muestra `error` en pantalla y un `alert()`. Si todo es válido, se invoca el flujo de Power Automate, se crea un ticket en el backend del flujo, se calcula la fecha máxima de solución (ANS de 8 horas hábiles) y se actualiza el ticket vía `TicketsRepository`.
6. En caso de éxito se resetea el formulario (`RESET`) y se muestra un `alert()` de confirmación; en caso de error se muestra `alert()` y se guarda el mensaje en `error`.
7. `ServiciosTI.tsx` sigue un flujo similar pero de una sola entidad: se valida con `validate()`, se sanitiza (`sanitizeState`) y se envía en un único payload `{ Datos, User, userEmail }`.

## Dependencias
- **Funcionalidades**: `src/Funcionalidades/forms/Formatos.ts` (hooks `usePermisosNavegacion`, `useSolicitudesRed`, `usePermisosERP`, `useSolicitudServicios`), que a su vez usa `src/auth/authContext.ts` (`useAuth`), `src/Funcionalidades/shared/FlowClient.ts`, `src/utils/ans.ts` (`calcularFechaSolucion`), `src/Services/Festivos.ts` (`fetchHolidays`), `src/utils/Date.ts` (`toGraphDateTime`).
- **Repositorios**: `src/repositories/repositoriesContext.tsx` (`useRepositories()` → `tickets: TicketsRepository`) inyectado en los 4 hooks para `updateTicket`.
- **Models**: `src/Models/Formatos.ts` (`OpcionSolicitud`, `FilaPermisoNav`, `FilaSolicitudRed`, `FilaSolicitudERP`, `Servicios`, `SolicitudUsuario`, `SolicitudUsuarioErrors`, `PermisoRed`), `src/Models/Holiday.ts`.
- **Externas**: ninguna librería de UI de terceros; solo React y CSS por componente (`Formatos.css`, `PermisosNavegacion.css`, `SeguridadRed.css`, `SeguridadERP.css`, `ServiciosTI.css`).

## Oportunidades de mejora
- **Carpeta con espacio en el nombre**: `src/components/Formatos/Seguridad de red/` rompe convenciones de rutas (requiere comillas en imports, `import SolicitudesRed from "./Seguridad de red/SeguridadRed"` en `Formatos.tsx`) y puede causar fricción en tooling/CI multiplataforma. Debería renombrarse a `SeguridadRed` como sus hermanas (`SeguridadERP`, `ServiciosTI`).
- **Inconsistencia de nombres de export vs. archivo**: `Formatos/SeguridadERP/SeguridadERP.tsx` exporta `SolicitudERP`, y `Formatos/ServiciosTI/ServiciosTI.tsx` exporta `SolicitudUsuarioForm` — ninguno coincide con el nombre de archivo/carpeta, dificultando la navegación por "ir a definición".
- **`dangerouslySetInnerHTML` con contenido hard-codeado** (`TYC_BY_OPCION` en `Formatos.tsx`): innecesario ya que el contenido no viene de datos externos; podría reemplazarse por JSX normal y eliminar el riesgo de XSS/lint warnings.
- **Secretos/URLs de Power Automate hard-codeadas en el código fuente**: cada hook en `Funcionalidades/forms/Formatos.ts` instancia `new FlowClient("https://...sig=...")` directamente en el cuerpo del hook (se recrea en cada render, ya que no usa `useMemo`/`useRef`), exponiendo firmas SAS en el bundle de cliente y regenerando el cliente innecesariamente.
- **Lógica de negocio dentro del hook de UI**: el cálculo de ANS (`calcularFechaSolucion`, `fetchHolidays`) y la orquestación del flujo + actualización de ticket están mezclados en el mismo hook que gestiona el estado del formulario; sería más testeable extraerlo a un servicio de dominio.
- **Uso de `alert()` para éxito/error**: en los 4 hooks, la única retroalimentación al usuario es `alert()`/mensajes de bloque `error`; no hay manejo consistente de estados de carga con spinners, ni componentes de notificación (toast) como sí se usa en `TimeCounter` (`react-hot-toast`), generando inconsistencia de UX entre módulos.
- **Duplicación de lógica entre los 3 formularios tabulares** (`PermisosNavegacion`, `SeguridadRed`, `SeguridadERP`): patrón de reducer + `addFila`/`removeFila`/`setCampo`/`submit` casi idéntico repetido 3 veces en `Funcionalidades/forms/Formatos.ts` (además de una cuarta vez análoga para "state" único en `ServiciosTI`); es candidato a un hook genérico `useFilasForm<T>()`.
- **Typo conocido y documentado en el propio código**: la clave `"Google Anatytics"` en `FilaPermisoNav` (Models/Formatos.ts) y su uso en `PermisosNavegacion.tsx`/`Funcionalidades/forms/Formatos.ts` tiene un error ortográfico que se propaga hasta el payload enviado al flujo; los propios comentarios en el código ya lo señalan ("ojo al nombre exacto" / "ojo al nombre original") pero no se ha corregido.
- **Accesibilidad**: las tablas de `PermisosNavegacion`, `SeguridadRed` y `SeguridadERP` usan `div`/`role="table"` en vez de elementos `<table>` nativos, lo que reduce la compatibilidad con lectores de pantalla; los inputs de fila no tienen `aria-label` (solo `placeholder` vacío en varios casos, p.ej. `placeholder=""` en `PermisosNavegacion.tsx`).
- **Falta de indicador de carga en `Formatos.tsx`**: no hay manejo de estado "cargando" mientras se resuelve la navegación entre pantallas (es instantáneo porque no hace fetch, pero no valida que `TicketsRepository` esté disponible antes de renderizar: `usePermisosNavegacion(TicketsSvc!)` usa `!` para forzar el tipo, lo que puede causar errores en tiempo de ejecución si `tickets` es `undefined` durante la carga inicial del contexto).
