# Componentes de Documentación de casos

## Descripción general
Este grupo cubre el flujo de "documentar" un ticket (registrar la solución o un seguimiento, opcionalmente con una plantilla predefinida y un archivo adjunto), y dos sub-flujos especializados que se activan desde ese mismo formulario: generar un **Acta de Entrega** de equipos y generar un **Escalamiento a proveedor de internet**. Se accede típicamente desde el panel de seguimiento del detalle de un ticket (`TicketHistorial`/`Seguimiento`, fuera de este módulo) al marcar una acción como "solución" o "seguimiento".

## Archivos
| Archivo | Qué renderiza/hace |
|---|---|
| `Documentar/Documentar.tsx` | Formulario principal de documentación de un ticket: selector de plantilla, editor rich-text, adjunto de archivo, y botones para escalar a proveedor de internet o generar acta de entrega (alternan la vista completa del formulario). |
| `Documentar/ActaEntrega/InformacionCaso/InfoActa.tsx` (`InfoActaEntrega`) | Formulario de acta de entrega de equipos: datos del ticket/receptor, selección de qué se entrega (toggles dinámicos según tipo de usuario) y detalle por cada equipo seleccionado (marca, referencia, serial, propiedad, proveedor, etc.). |
| `Documentar/EscalamientoProveedor/Escalamiento.tsx` (`EscalamientoInternet`) | Formulario de escalamiento a proveedor de internet: buscador, datos de tienda/proveedor/contacto, selección de tipo de falla (lista fija) y adjuntos obligatorios. |

## Funciones y constantes clave

### Documentar.tsx
- Hooks de Funcionalidades: `useDocumentarTicket({ Tickets, Logs, ComprasSvc })` (`Funcionalidades/Tickets/Documentar`) expone `{state, errors, submitting, setField, handleSubmit}`; `usePlantillas(PlantillasSvc)` (`Funcionalidades/content/Plantillas`) expone `{ListaPlantillas, loading, error}`.
- Props: `{ticket, tipo, onDone}` donde `tipo: "solucion" | "seguimiento"` determina el texto de la etiqueta ("Descripción de solución/seguimiento") y probablemente el tipo de registro creado por `handleSubmit`.
- Estado local: `plantillaId`, `showEscalar`, `showActaEntrega` — controlan si se muestra el formulario base o uno de los dos sub-flujos (mutuamente excluyentes, pero nada impide activar ambos flags a la vez ya que se setean con botones independientes).
- Handler clave: `onSelectPlantilla(id)` — busca la plantilla en `ListaPlantillas` y vuelca su `CamposPlantilla` (HTML) directamente al campo `documentacion` del formulario, sobrescribiendo lo que el usuario haya escrito.
- El botón de envío ejecuta `handleSubmit(e, tipo, ticket, account!)` y luego `onDone()` (callback que sube hasta el detalle de ticket / seguimiento para refrescar).

### InfoActa.tsx (`InfoActaEntrega`)
- Hook de Funcionalidades: `useActaEntrega(ticket?.ID ?? "")` (`Funcionalidades/Tickets/ActaEntrega`) expone `{state, items, ITEMS_CON_TIPO_COMPUTADOR, errors, selectedKeys, setField, toggleEntrega, handleSubmit, updateDetalle}`.
- Constante UI: `TIPO_COMPUTADOR_OPTIONS` (mapa `TipoUsuario` → lista de opciones de tipo de computador: distinto set para "Usuario administrativo", "Usuario de diseño" y "Tienda").
- Estado derivado (no state, calculado en cada render): `tipoActual`, `opcionesTipoPC`, `mostrarTipoPC` (booleano que decide si mostrar el select de "Tipo de computador", condicionado a que al menos un ítem con `ITEMS_CON_TIPO_COMPUTADOR` esté marcado en `state.entregas` y haya un `tipoUsuario` elegido).
- Renderiza dinámicamente un formulario "maestro-detalle": por cada `key` en `selectedKeys` (equipos marcados como entregados) muestra una tarjeta con campos (Marca, Referencia, Serial, Propiedad, Proveedor, Descripción, Prueba de funcionamiento); el campo Proveedor se deshabilita salvo que `Propiedad === "Alquilado"`.
- Usa el componente `Toggle` (`components/Toggle/Toggle`) para cada ítem entregable.

### Escalamiento.tsx (`EscalamientoInternet`)
- Hook de Funcionalidades: `useEscalamiento(ticket?.CorreoSolicitante ?? "", ticket?.ID ?? "")` (`Funcionalidades/Tickets/Escalamiento`) expone `{loading, error, state, onSearch, setField, handleFiles, handleSubmit, errors}`.
- Estado local propio del componente: `search` (texto del buscador, independiente del `state` del hook) — se usa solo para armar el argumento de `onSearch(search)`.
- Constante UI: `DESCRIPCIONES` — lista fija de 10 motivos de falla de internet (p.ej. "Sin servicio (led LOS apagado)", "Caída total del servicio (Sin navegación)").
- El formulario tiene ~13 campos obligatorios (`required`, marcados con `*`) más adjuntos; `handleFiles(e.target.files)` delega el manejo de archivos al hook.
- `onSubmit` hace `preventDefault`/`stopPropagation` y delega en `handleSubmit()` del hook (sin pasarle el evento ni los datos, ya que están en `state` del hook).

## Flujo del módulo
1. Desde el panel de seguimiento de un ticket (`TicketHistorial`, componente externo a este módulo), el usuario elige documentar una "solución" o un "seguimiento", lo que monta `Documentar` con `tipo` y `ticket` correspondientes.
2. En `Documentar`, el usuario puede opcionalmente elegir una plantilla del `<select>` (cargada vía `usePlantillas`), lo que precarga el campo de descripción con HTML de la plantilla.
3. El usuario escribe/edita la descripción con `RichTextBase64` (editor rich-text propio) y opcionalmente adjunta un archivo.
4. Al hacer click en "Guardar documentación", se ejecuta `handleSubmit` del hook `useDocumentarTicket` y luego `onDone()`, que normalmente dispara el refresco del ticket en el componente padre (patrón igual al de los modales del módulo de Tickets: `onDone`/`onAdd`/`onAddClick`).
5. Alternativamente, el usuario puede hacer click en "Escalar a proveedor de internet" (`setShowEscalar(true)`) o "Generar Acta de Entrega" (`setShowActaEntrega(true)`); esto reemplaza completamente el formulario de documentación por `EscalamientoInternet` o `InfoActaEntrega` respectivamente (no son modales, son vistas alternativas dentro del mismo contenedor `documentar-form`).
6. En `InfoActaEntrega`, el usuario completa los datos del receptor, selecciona con toggles qué equipos se entregan (`toggleEntrega`), y si corresponde, el tipo de computador; por cada equipo marcado aparece una tarjeta de detalle (`updateDetalle`) para capturar marca/serial/proveedor/etc. Al enviar (`handleSubmit`, controlado por el hook `useActaEntrega`), el botón dice "Siguiente", sugiriendo un flujo de varios pasos no visible en este archivo.
7. En `EscalamientoInternet`, el usuario puede primero "Buscar" (`onSearch(search)`, probablemente para autocompletar datos de tienda/proveedor desde el hook), luego completa el formulario extenso, adjunta archivos y envía con "Generar Reporte" (`handleSubmit`).
8. Ninguno de los tres componentes vuelve explícitamente al formulario de `Documentar` tras completar Acta/Escalamiento en este código (no hay botón "volver" visible ni callback `onDone`/`onCancel` recibido por `InfoActaEntrega` o `EscalamientoInternet`); el retorno depende de lo que haga `handleSubmit` de cada hook o de un componente padre no incluido en este módulo.

Navegación entre componentes: exclusivamente por props (`ticket`) y estado local booleano en `Documentar.tsx` (`showEscalar`/`showActaEntrega`); no hay Context ni modales anidados (`ModalShell` no se usa aquí, a diferencia del módulo de Tickets).

## Dependencias

| Componente | Funcionalidades / Models | Librerías / componentes propios |
|---|---|---|
| Documentar.tsx | `Funcionalidades/Tickets/Documentar` (useDocumentarTicket), `Funcionalidades/content/Plantillas` (usePlantillas), `Models/Tickets`, `auth/authContext`, `graph/GrapServicesContext`, `repositories/repositoriesContext` | `RichTextBase64` (`components/RichTextBase64`) |
| InfoActa.tsx | `Funcionalidades/Tickets/ActaEntrega` (useActaEntrega), `Models/ActasEntrega` (FormStateActa, TipoUsuario), `Models/Tickets` | `Toggle` (`components/Toggle/Toggle`) |
| Escalamiento.tsx | `Funcionalidades/Tickets/Escalamiento` (useEscalamiento), `Models/Tickets` | — (inputs nativos) |

## Oportunidades de mejora
- **Props de callback inconsistentes/ausentes entre subformularios**: `Documentar.tsx` recibe y usa `onDone: () => void | Promise<void>` para el flujo principal, pero al montar `EscalamientoInternet` e `InfoActaEntrega` no les pasa ningún `onDone`/`onCancel` (`<EscalamientoInternet ticket={ticket} />`, `<InfoActaEntrega ticket={ticket}/>`), y ambos tampoco lo declaran en sus props. Esto deja sin resolver cómo el usuario vuelve al formulario de documentación o cómo se notifica al padre que el sub-flujo terminó — riesgo de UX incompleta o de lógica de "volver" oculta en los hooks.
- **Estado mutuamente excluyente sin garantía**: `showEscalar` y `showActaEntrega` en `Documentar.tsx` se controlan con dos botones independientes; nada impide que ambos terminen en `true` simultáneamente (aunque el render actual solo muestra uno u otro por el orden del ternario, sería más robusto usar un único estado tipo `"form" | "escalar" | "acta"`).
- **Plantilla sobrescribe contenido sin confirmación**: `onSelectPlantilla` en `Documentar.tsx` reemplaza `state.documentacion` inmediatamente al cambiar el `<select>`, sin advertir si el usuario ya había escrito texto propio — riesgo de pérdida de datos accidental.
- **Título del modal condicionado con `null` implícito**: en `Documentar.tsx`, `<h2>{showEscalar ? "..." : showActaEntrega ? "..." : null}</h2>` deja el título vacío cuando se muestra el formulario base, en vez de mostrar algo como "Documentar ticket"; es una pista de que el título fue pensado solo para los dos sub-flujos.
- **Lista fija de fallas hardcodeada en el componente**: `DESCRIPCIONES` en `Escalamiento.tsx` (10 strings) está embebida en el componente de UI en vez de venir de `Funcionalidades`/una lista de SharePoint, dificultando su mantenimiento si cambian los motivos de escalamiento sin tocar código.
- **Mapa de opciones dependiente de tipo de usuario hardcodeado**: `TIPO_COMPUTADOR_OPTIONS` en `InfoActa.tsx` mezcla datos de configuración de negocio (qué computador aplica a qué tipo de usuario) dentro del componente; si cambia el catálogo de equipos habría que tocar el `.tsx` en vez de una fuente de datos o el hook `useActaEntrega`.
- **Sin manejo visible de error/loading en Acta de Entrega**: a diferencia de `Documentar.tsx` (que sí muestra `loadingPlantillas`/`errorPlantillas`) y `Escalamiento.tsx` (que muestra `loading`/`error` del hook), `InfoActaEntrega` no desestructura ni muestra ningún estado de carga o error de `useActaEntrega`, aunque el hook podría tener llamadas asíncronas (creación del acta) — si `handleSubmit` falla, el usuario no tendría feedback visible en este componente.
- **Formulario extenso sin agrupación semántica**: `Escalamiento.tsx` tiene ~13 campos de texto obligatorios en un único `esc-grid` sin `fieldset`/agrupación visual o de accesibilidad (p.ej. separar "Datos de la tienda" de "Datos de contacto"), lo que dificulta la navegación por teclado/lector de pantalla en un formulario largo.
- **Accesibilidad**: ninguno de los tres componentes usa `aria-live` para comunicar errores de validación (`errors.*` se muestran como `<small>` simple, sin `role="alert"` ni asociación explícita vía `aria-describedby` con su `<input>`); los inputs de tipo `number` para "Número de ticket" y "Número de cédula" en `InfoActa.tsx` no tienen `min`/`pattern`, y como son `type="number"` no permiten formatos con guiones o puntos que una cédula real podría requerir.
- **Nombres ES/EN e inconsistencias menores**: el archivo se llama `Escalamiento.tsx` pero exporta `EscalamientoInternet`; la carpeta es `EscalamientoProveedor` (genérico) mientras el componente asume siempre "proveedor de internet" (podría no generalizar a otros proveedores pese al nombre de carpeta). El campo de acta `sedeDestino` usa camelCase en español mezclado con términos como `Propiedad`/`Detalle`/`Prueba` en el tipado de detalle de equipo, aceptable pero sin una convención documentada.
- **Componente `Documentar.tsx` con responsabilidad doble**: además de ser el formulario de documentación, actúa como "router" local entre tres vistas (documentar/escalar/acta) sin extraer esa lógica de composición a un componente contenedor separado (p.ej. `DocumentarRouter`), lo que mezcla la lógica del formulario de documentación con la de navegación entre sub-flujos en el mismo archivo.
