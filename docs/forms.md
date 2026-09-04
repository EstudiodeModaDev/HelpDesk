# Formatos/formularios

## Descripción general

Este módulo implementa los formularios de "solicitud" que no son tickets de soporte comunes sino trámites administrativos predefinidos (creación/gestión de permisos de red, permisos de perfil ERP, alta de usuario/servicios TI, y permisos de navegación web). En vez de escribir directamente en SharePoint, cada formulario invoca un flujo de **Power Automate** (vía `FlowClient`) que se encarga de la lógica de aprobación/creación del ticket asociado, y luego el hook local actualiza la fecha límite de ANS (acuerdo de nivel de servicio) del ticket recién creado. Es, en esencia, la capa de orquestación entre la UI de formularios dinámicos (filas repetibles) y los flujos externos que generan el ticket real.

## Archivos

- `src/Funcionalidades/forms/Formatos.ts`: contiene cuatro hooks de formulario — `useSolicitudesRed`, `useSolicitudServicios`, `usePermisosERP` y `usePermisosNavegacion` — cada uno con su propio reducer/estado, validación mínima, envío a un flujo de Power Automate distinto y actualización posterior del ticket con la fecha de solución calculada.

## Funciones y constantes clave

- `uuid()`: genera ids de fila usando `crypto.randomUUID()` si existe, con fallback manual basado en `Date.now()` + número aleatorio.
- `ActionOf<T>` / `FlowResponse`: tipos genéricos compartidos por los reducers de filas (`ADD`, `REMOVE`, `SET`, `ERROR`, `SENDING`, `RESET`) y por la respuesta esperada de los flujos (`{ok, message?, createdTicket?}`).

### `useSolicitudesRed(TicketSvc: TicketsRepository)`
- Gestiona filas de tipo `FilaSolicitudRed` (carpetas/subcarpetas de red, personas, permiso) vía `reducerRed`.
- `notifyFlow`: `FlowClient` apuntando al flujo de Power Automate de "Seguridad de red" (URL con firma SAS embebida).
- `requiredOk`: valida que cada fila tenga al menos `carpeta1`, `subcarpeta1` o `subcarpeta2` (`filaMinimaLlenaRed`).
- `submit(e)`: valida, arma el payload (`{filas, user, userEmail}` desde `account` de `useAuth`), invoca el flujo, calcula `fechaSolucion` con `calcularFechaSolucion(new Date(), 8, holidays)` (8 horas de ANS) y, si el flujo devolvió `createdTicket`, llama `TicketSvc.updateTicket(id, {FechaMaxima: toGraphDateTime(fechaSolucion)})`.

### `useSolicitudServicios(TicketSvc: TicketsRepository)`
- Formulario de un solo registro (`SolicitudUsuario`: datos de contratación, cargo, servicios a habilitar como `correo`, `office`, `erp`, etc.).
- `validate()`: exige casi todos los campos salvo `observaciones`.
- `sanitizeState(s)`: hace `trim()` de todos los campos string y normaliza `fechaIngreso` a los primeros 10 caracteres (`YYYY-MM-DD`) y `servicios` a booleanos explícitos.
- `handleSubmit(e)`: igual patrón que `useSolicitudesRed` (flujo → `fetchHolidays` → `calcularFechaSolucion` con 8 horas → `TicketSvc.updateTicket`), pero usa `alert()` para éxito/error en vez de propagar un estado de error reactivo.

### `usePermisosERP(TicketSvc: TicketsRepository)`
- Filas `FilaSolicitudERP` (perfil, método general/específico, permiso específico, usuario objetivo).
- `filaMinimaERPLlena`: exige `nombreperfil`, `metodogeneral`, `metodoespecifico`, `permisoespecifico` y `usuarioMail` no vacíos.
- `submit`: valida dos veces (una con `requiredOk`/`filaMinimaERPLlena`, otra manual con `faltantes` justo antes de enviar), mapea las filas a `FlowItemERP` (renombrando claves a inglés/mixto: `nombrePerfil`, `metodoGeneral`, etc.), invoca el flujo y repite el patrón de actualización de `FechaMaxima`.

### `usePermisosNavegacion(TicketSvc: TicketsRepository)`
- Filas `FilaPermisoNav` con claves literales en español y con espacios (`"Jefe / Quien autoriza"`, `"Google Anatytics"` (sic), `"Otro (Link de la pagina )"`), representando checkboxes de acceso a sitios (YouTube, Facebook, WhatsApp, etc.).
- `defaultFilaNav(jefe, seed)`: crea una fila nueva inyectando automáticamente el nombre del "jefe actual" (`account?.name`) en el campo autorizador.
- `submit`: mismo patrón (validar → flujo → `fetchHolidays` → `calcularFechaSolucion` → `updateTicket`).

## Flujo del módulo

1. Cada hook es consumido por un componente 1:1 bajo `src/components/Formatos/`: `ServiciosTI/ServiciosTI.tsx` → `useSolicitudServicios`, `"Seguridad de red"/SeguridadRed.tsx` → `useSolicitudesRed`, `SeguridadERP/SeguridadERP.tsx` → `usePermisosERP`, `PermisosNavegacion/PermisosNavegacion.tsx` → `usePermisosNavegacion`. Todos reciben `tickets`/`TicketsSvc` (implementación de `TicketsRepository`) desde el contexto de repositorios del componente padre.
2. Flujo típico de envío (idéntico en los cuatro hooks): (a) validar filas/campos mínimos → (b) tomar `account` (usuario autenticado) de `useAuth()` para armar `user`/`userEmail` → (c) `notifyFlow.invoke(payload)` hace `POST` al endpoint de Power Automate correspondiente → (d) si `flow.ok` es falso, se lanza error y se aborta; si es verdadero, se obtiene `holidays` de `fetchHolidays()` (Supabase, tabla `TBL_Festivos_Solvi` del año actual) y se calcula `fechaSolucion` con `calcularFechaSolucion` (8 horas hábiles, 7am–5pm hora Bogotá, saltando fines de semana y festivos) → (e) si el flujo devolvió `createdTicket`, se actualiza ese ticket en SharePoint (`TicketSvc.updateTicket`) con la fecha límite calculada → (f) se resetea el formulario y se notifica éxito/error con `alert()`.
3. El flujo de Power Automate es quien realmente **crea el ticket** en el sistema (a partir del payload enviado); este módulo solo se entera del `id` vía `flow.createdTicket` para hacer el ajuste posterior de fecha de solución — la creación del ticket en sí ocurre fuera del código del frontend.

## Dependencias

- **Repositorios**: `src/repositories/TicketsRepository/TicketRepository.ts` (interfaz `TicketsRepository`, método `updateTicket(id, payload)` usado por los cuatro hooks).
- **Cliente de flujos**: `src/Funcionalidades/shared/FlowClient.ts` (una instancia distinta por hook, cada una con su propia URL de Power Automate).
- **Utilidades de fecha/ANS**: `src/utils/ans.ts` (`calcularFechaSolucion`, usa `date-fns` y `@date-fns/tz` para trabajar en horario de Bogotá), `src/utils/Date.ts` (`toGraphDateTime`).
- **Festivos**: `Services/Festivos.ts` (`fetchHolidays`, consulta Supabase `TBL_Festivos_Solvi` filtrando por `source_year` = año actual).
- **Auth**: `src/auth/authContext.tsx` (`useAuth`, entrega `account` con `name`/`username`/claims).
- **Modelos**: `Models/Formatos.ts` (`FilaSolicitudRed`, `FilaSolicitudERP`, `SolicitudUsuario`, `FilaPermisoNav`, tipos de error), `Models/Holiday.ts` (`Holiday`).
- **Externas**: React (`useReducer`/`useState`/`useCallback`/`useMemo`), `crypto.randomUUID`.

## Oportunidades de mejora

- **Secretos embebidos en el código fuente**: las cuatro URLs de Power Automate (`useSolicitudesRed`, `useSolicitudServicios`, `usePermisosERP`, `usePermisosNavegacion`) incluyen tokens de firma (`sig=...`) hardcodeados directamente en `Formatos.ts`. Al ser código de cliente (se envía al navegador), cualquiera puede extraer y reutilizar esas URLs para invocar los flujos sin pasar por la UI ni por la autenticación de la app. Deberían vivir en variables de entorno y, preferiblemente, detrás de un backend propio que valide la sesión antes de reenviar al flujo.
- **Duplicación masiva de la misma secuencia de envío**: los cuatro `submit`/`handleSubmit` repiten casi línea por línea el patrón "validar → construir userEmail con triple `??` → invocar flujo → `fetchHolidays` → `calcularFechaSolucion(new Date(), 8, holidays)` → `updateTicket` → `alert`". Es candidato claro a extraer una función compartida (p. ej. `enviarSolicitudYActualizarANS(TicketSvc, notifyFlow, payload)`), reduciendo el archivo de ~650 líneas y el riesgo de que una corrección se aplique a tres hooks pero se olvide en el cuarto.
- **8 horas de ANS hardcodeadas en cuatro lugares**: el valor `8` (horas de ANS) se repite literal en cada llamada a `calcularFechaSolucion` en vez de usar una constante compartida como `HORAS_POR_ANS['ANS 2']` (definida en `utils/ans.ts` pero no reutilizada aquí) — si el ANS de estos trámites cambia, hay que editar cuatro sitios.
- **`fetchHolidays()` filtra solo por el año en curso**: `Services/Festivos.ts` hace `.eq("source_year", year)` con `year = new Date().getFullYear()`. Una solicitud enviada a finales de diciembre cuyo cálculo de horas hábiles cruce al 1 de enero no encontrará los festivos del año siguiente (la tabla `TBL_Festivos_Solvi` no se consulta para `year + 1`), pudiendo calcular mal `fechaSolucion` cerca del cambio de año.
- **`alert()`/`console.error` como única capa de feedback y logging**: los cuatro hooks usan `alert()` para éxito y error (bloqueante, no estilizado, no accesible) y `console.error` para depuración, en vez de un sistema de notificaciones consistente con el resto de la app (el módulo de Comentarios, por ejemplo, usa `react-hot-toast`). Es una inconsistencia de UX entre módulos del mismo proyecto.
- **Validación duplicada e inconsistente entre hooks**: `usePermisosERP.submit` valida dos veces (`requiredOk` vía `filaMinimaERPLlena` y luego `faltantes` con una condición ligeramente distinta pero equivalente), mientras que `useSolicitudesRed` y `usePermisosNavegacion` validan una sola vez. No hay una función de validación de filas compartida entre los tres formularios "de filas", pese a que la forma del reducer (`ActionOf<T>`) sí es genérica.
- **Nombres de campos con espacios y símbolos como claves de objeto**: `FilaPermisoNav` (`Models/Formatos.ts`) usa claves literales como `"Jefe / Quien autoriza"`, `"Otro (Link de la pagina )"` y `"Google Anatytics"` (con errata de "Analytics"). Usar estas claves de texto libre como identificadores de propiedad (en vez de nombres normalizados con una etiqueta de presentación aparte) es frágil: un error tipográfico al referenciarlas no se detecta con la misma fuerza que un identificador normal, y la errata ya presente se propagará al payload enviado al flujo de Power Automate y potencialmente a la columna de SharePoint resultante.
- **Mezcla ES/EN en el mismo payload**: `usePermisosERP` traduce las claves de español (`nombreperfil`) a una mezcla de inglés/español al construir `FlowItemERP` (`nombrePerfil`, `metodoGeneral`, pero `Usuario` y `observaciones` quedan en español) — no hay un criterio único de idioma para los contratos con los flujos externos.
- **`PayloadNav.filas` tipado como `Array<{}>`**: en `usePermisosNavegacion` (`Formatos.ts`, línea 481), el tipo declarado para las filas del payload es `Array<{}>` (objeto vacío), es decir, sin ninguna forma real — cualquier campo faltante o mal escrito en `filasPayload` pasaría el chequeo de tipos sin error, anulando la utilidad de TypeScript justo en el payload que se envía a un sistema externo.
- **Actualización de ticket sin manejo de fallo diferenciado**: si `TicketSvc.updateTicket` falla después de que el flujo ya creó el ticket (`flow.ok === true` pero el `updateTicket` lanza), el `catch` general del `submit` reporta el mismo mensaje genérico de "no pudimos enviar la solicitud", aunque en este caso el ticket sí se creó — puede confundir al usuario, que reintentará el envío completo pese a que el trámite ya existe en el sistema.
