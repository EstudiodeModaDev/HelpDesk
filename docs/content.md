# Contenido (anuncios y plantillas)

## Descripción general

Este módulo cubre dos tipos de contenido editorial administrado desde la mesa de ayuda: los **avisos/tips** que se muestran a los usuarios (incluso antes de iniciar sesión, en la pantalla de login) y las **plantillas de texto** (HTML) reutilizables para respuestas o documentación de casos. Ambos son listas de SharePoint administradas vía Microsoft Graph, con hooks que encapsulan carga, alta y (para los tips) activación/desactivación.

## Archivos

- `src/Funcionalidades/content/Anuncementes.ts`: hook `useTips`, gestiona la lista SharePoint "TipsInicio" (avisos mostrados en la app y en la pantalla de login) y expone además una vía alterna de lectura pública vía Power Automate para el login.
- `src/Funcionalidades/content/Plantillas.ts`: hook `usePlantillas`, gestiona la lista SharePoint "Plantillas" (plantillas HTML reutilizables).

## Funciones y constantes clave

### `Anuncementes.ts`
- Constante `notifyFlow = new FlowClient(<URL de Power Automate con firma SAS embebida>)`: cliente HTTP hacia un flujo de Power Automate que devuelve los anuncios activos **sin requerir sesión** (se usa en la pantalla de login, antes de tener un token de Graph).
- `useTips(TipsSvc?: TipsService)`:
  - Estado: `tips` (`Tip[]` crudos de SharePoint), `tipsUI` (`TipUI[]`, forma reducida para la tarjeta de UI: `title`, `subtitle`, `TipoAnuncio`), `state`/`errors` (formulario de alta).
  - `fromSp(a: Tip): TipUI`: mapea un `Tip` a `TipUI`.
  - `validate()`: exige `Subtitulo` y `Title`.
  - `handleSubmit(e)`: valida y llama a `TipsSvc.create(payload)` con `Activa: true` fijo; el `catch` está vacío (no reporta el error).
  - `loadTips()`: llama a `TipsSvc.getAll()` (requiere `TipsSvc`, o sea, sesión autenticada) y llena `tips`.
  - `onToggle(id)`: obtiene el tip (`TipsSvc.get(id)`), invierte su campo `Activa` (`TipsSvc.update`), muestra `alert("Se han ajustado los tips")` y recarga la lista.
  - `obtenerTipsLogOut()`: invoca `notifyFlow.invoke({})` (POST a Power Automate), toma `resp.announcements.value`, filtra por `a.Activa` y llena `tipsUI` — ruta alterna para mostrar tips **sin autenticación**.

### `Plantillas.ts`
- `usePlantillas(PlantillasSvc: PlantillasService)`:
  - Estado: `ListaPlantillas` (`Plantillas[]`), `state: FormPlantillas` (`{Titulo, HTLM}` — nótese la sigla `HTLM`, no `HTML`), `submiting`/`error`.
  - `loadPlantillas()`: llama a `PlantillasSvc.getAll()`; se ejecuta automáticamente en un `useEffect` al montar.
  - `createPlantilla()`: mapea `state` (`{Titulo, HTLM}`) al modelo `Plantillas` (`{Title, CamposPlantilla}`) y llama a `PlantillasSvc.create(payload)`; limpia el formulario en éxito.
  - `setField`: setter genérico tipado por clave de `FormPlantillas`.

## Flujo del módulo

1. **Tips en la app autenticada**: `components/TipsTable/TipsTable.tsx` usa `useTips(TipsInicio)` (el servicio inyectado desde `useGraphServices().TipsInicio`) para listar y alternar (`onToggle`) el estado activo/inactivo de cada aviso; `components/TipsTable/ModalAgregar/ModalAgregar.tsx` usa el mismo hook para el formulario de alta (`handleSubmit`).
2. **Tips en la pantalla de login**: `components/Welcome/Welcome.tsx` (`SolviAuthLanding`) llama `useTips()` **sin** `TipsSvc` (porque aún no hay token de Graph) y usa solo `obtenerTipsLogOut()` en un `useEffect` al montar, que llega a los datos vía el flujo de Power Automate en lugar de Graph directo.
3. **Plantillas**: `components/NuevaPlantilla/NuevaPlantilla.tsx` usa `usePlantillas` para el formulario de creación; `components/Documentar/Documentar.tsx` lo usa para listar plantillas disponibles al documentar un caso (`ListaPlantillas`).
4. En ambos hooks, la creación (`handleSubmit`/`createPlantilla`) termina disparando una recarga manual (`loadTips()`) o dejando que el componente decida cuándo releer la lista.

## Dependencias

- **Servicios**: `Services/Tips.service.ts` (`TipsService`, CRUD sobre lista SharePoint "TipsInicio" vía `GraphRest`), `Services/Plantillas.service.ts` (`PlantillasService`, CRUD sobre lista SharePoint "Plantillas").
- **Cliente de flujos**: `src/Funcionalidades/shared/FlowClient.ts` (`FlowClient.invoke`, POST genérico con timeout/reintentos configurables a una URL de Power Automate).
- **Modelos**: `Models/Tips.ts` (`Tip`, `TipFlowResponse`, `TipUI`), `Models/Plantilla.ts` (`Plantillas`, `FormPlantillas`).
- **Contexto**: `src/graph/GrapServicesContext.tsx` (provee `TipsInicio: TipsService` y `Plantillas: PlantillasService` ya configurados con el sitio/lista de SharePoint por defecto).
- **Externas**: React (`useState`/`useCallback`/`useEffect`).

## Oportunidades de mejora

- **Nombre de archivo engañoso y colisión conceptual con "Anuncios"**: `Anuncementes.ts` (nombre con errata, aparentemente por "Anuncios") implementa en realidad el dominio de **"Tips"** (tipo `Tip`, lista SharePoint `TipsInicio`, servicio `TipsService`). Existe además un servicio **distinto y no relacionado** `Services/Anuncios.service.ts` (`AnunciosService`, lista `Anuncios`) registrado en `GrapServicesContext.tsx`, que este módulo no usa. Esto genera confusión real: dos conceptos de "aviso" (Tips vs. Anuncios) coexisten en el código con nombres que se pisan.
- **URL de Power Automate con firma de acceso embebida en el código fuente**: la constante `notifyFlow` en `Anuncementes.ts` contiene una URL completa con parámetros `sig=...` (SAS token) hardcodeada en el archivo TypeScript versionado. Cualquiera con acceso al repositorio (o al bundle compilado, ya que se ejecuta en el cliente) puede invocar ese flujo directamente. Lo mismo ocurre, de forma más extensa, en `Funcionalidades/forms/Formatos.ts` (cuatro URLs de flujos distintos). Deberían moverse a variables de entorno (`import.meta.env`) o a un proxy backend.
- **Manejo de errores silencioso**: en `useTips.handleSubmit`, el bloque `catch (e: any) { }` está vacío — un fallo al crear un tip no se comunica al usuario ni se registra en consola, dejando `errors`/`loading` sin actualizar y al usuario sin retroalimentación de que la creación falló.
- **`onToggle` usa `alert()` para feedback**: `alert("Se han ajustado los tips")` es una interrupción bloqueante de UX; además, si `TipsSvc.update` falla, el `catch` vacía `setTips([])`, borrando de la vista **todos** los tips ya cargados en vez de solo señalar el error puntual del ítem que falló.
- **Tipo `FormPlantillas` con nombres inconsistentes respecto al modelo final**: el formulario usa `{Titulo, HTLM}` (con la errata "HTLM" en vez de "HTML") mientras el modelo persistido usa `{Title, CamposPlantilla}` (`Models/Plantilla.ts`); el mapeo entre ambos ocurre a mano dentro de `createPlantilla`, con nombres de campo que no se corresponden ni siquiera fonéticamente, dificultando rastrear un campo del formulario hasta la columna real de SharePoint.
- **Sin sanitización de HTML**: `CamposPlantilla`/`HTLM` se guardan y presumiblemente se renderizan como HTML de plantilla; ni `usePlantillas` ni el servicio validan o sanean ese contenido antes de guardarlo, lo que es un vector potencial de XSS si en algún componente se inyecta con `dangerouslySetInnerHTML` (no verificado en este módulo, pero el dato nace sin ningún control aquí).
- **Duplicación de la lógica CRUD de SharePoint**: `TipsService` y `PlantillasService` (y también `FranquiciasService`/`UsuariosSPService`, vistos en otros módulos) repiten palabra por palabra los mismos métodos privados (`loadCache`, `saveCache`, `ensureIds`, normalización de `$filter`/`$orderby`) sin una clase base compartida — cualquier corrección a esa lógica (por ejemplo, un bug en el escape de OData) debe replicarse manualmente en cada servicio.
- **Doble camino de lectura de tips sin caché compartida**: `loadTips()` (vía Graph) y `obtenerTipsLogOut()` (vía Power Automate) mantienen estados separados (`tips` vs `tipsUI`) para esencialmente los mismos datos; si un aviso se activa/desactiva desde la tabla de administración, el flujo de Power Automate podría tardar en reflejarlo si depende de una caché propia en Power Automate/SharePoint (no verificable desde este código).
