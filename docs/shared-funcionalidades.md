# Compartido / infraestructura

## Descripción general
Dos utilidades transversales usadas por múltiples módulos de negocio: un cliente HTTP delgado para invocar flujos de Power Automate (webhooks HTTP-trigger) con reintentos y timeout, y un par de funciones para subir archivos/imágenes a Supabase Storage y obtener su URL pública. No contienen estado de React; son funciones/clases puras de infraestructura reutilizadas desde varios hooks de `Funcionalidades`.

## Archivos
- `src/Funcionalidades/shared/FlowClient.ts` — clase `FlowClient`, wrapper de `fetch` para invocar un flujo de Power Automate vía POST, con timeout y reintentos configurables.
- `src/Funcionalidades/shared/UploadFileToSupabase.ts` — funciones `uploadImageToSupabase` y `getPubliURLFromSupabase` para subir archivos al bucket de Supabase Storage y obtener su URL pública.

## Funciones y constantes clave

### `FlowClient` (FlowClient.ts)
- Constructor `new FlowClient(flowUrl: string)`: valida que la URL sea `http(s)://...`, si no, lanza `Error("FlowClient: URL inválida")`.
- `invoke<TIn extends object, TOut = unknown>(payload: TIn, opts?: FlowInvokeOptions): Promise<TOut>`
  - `opts.headers` (default `{}`), `opts.timeoutMs` (default `30_000`), `opts.retries` (default `0`).
  - Internamente usa `AbortController` para forzar el timeout y hace `POST` con `Content-Type: application/json`.
  - Si la respuesta no es `res.ok`, intenta parsear el cuerpo como JSON para extraer `error`/`message`, y lanza `Error("Flow <status>: <msg>")`.
  - Reintenta (`while(true)` con backoff `250ms * intento`) solo si el error es "transitorio": mensaje que matchea `/abort/i`, `/timed out/i`, `/network/i`, o `/Flow 5\d{2}/` (errores 5xx del flujo); de lo contrario relanza inmediatamente.

### `uploadImageToSupabase(file, bucket, path)` (UploadFileToSupabase.ts)
- `getFileExtension(file)`: intenta obtener la extensión desde `file.name`; si no existe, la deriva del `file.type` (MIME); si tampoco hay, usa `"png"` por defecto.
- Genera el nombre final como `` `${path}.${crypto.randomUUID()}.${extension}` `` y sube con `supabase.storage.from(bucket).upload(finalPath, file, { cacheControl: "3600", upsert: false })`.
- En error: `toast.error(...)` y relanza `Error`.
- Retorna `{ ok: true, url }` obteniendo la URL pública vía `getPubliURLFromSupabase`.

### `getPubliURLFromSupabase(bucket, path)`
- Envuelve `supabase.storage.from(bucket).getPublicUrl(path)`; si `data.publicUrl` no existe, hace `toast.error(...)` y lanza `Error`.

## Flujo del módulo
- `FlowClient` se instancia (normalmente con `useMemo` o directamente en el cuerpo del hook) en numerosos módulos de `Funcionalidades`: `Tickets/Documentar.ts`, `Tickets/NuevoTicket.ts`, `Tickets/ActaEntrega.ts`, `Tickets/Escalamiento.ts`, `Tickets/Reasignar.ts`, `Tickets/hooks/useTicketActions.ts`, `forms/Formatos.ts`, `content/Anuncementes.ts`, `operations/CajerosPos.ts` y `loans/prestamos.ts`. Cada uno crea su propia instancia apuntando a una URL de flujo distinta (una por automatización de Power Automate) y llama `.invoke(payload)` típicamente después de crear/actualizar un ticket, para disparar una notificación por correo o una automatización externa.
- `uploadImageToSupabase` se usa desde `src/components/RichTextBase64/RichTextBase64.tsx` (y potencialmente otros formularios que adjuntan imágenes) para subir contenido embebido en un editor enriquecido antes de guardar la URL resultante en el ticket/registro correspondiente.

## Dependencias
- Internas: `Services/Supabase.service` (cliente Supabase compartido).
- Externas: `fetch`/`AbortController` (nativos del navegador), `crypto.randomUUID` (nativo), `react-hot-toast`, `@supabase/supabase-js` (a través del cliente ya inicializado).

## Oportunidades de mejora
- **Acoplamiento a UI en una capa de infraestructura**: `UploadFileToSupabase.ts` llama directamente a `toast.error(...)` antes de lanzar la excepción. Esto mezcla la responsabilidad de "subir archivo" con la de "mostrar notificación", forzando a cualquier consumidor (tests, otro contexto sin `react-hot-toast` montado) a convivir con ese efecto secundario de UI aunque prefiera manejar el error a su manera.
- **Secretos embebidos en URLs versionadas**: cada archivo que instancia `FlowClient` lo hace con una URL de Power Automate hardcodeada que incluye un parámetro `sig=...` (firma de acceso). Al estar repetido en ~10 archivos y en el control de versiones, cualquier rotación de esas firmas requiere tocar código fuente en múltiples lugares, y el secreto queda expuesto a quien tenga acceso al repositorio.
- **Reintentos condicionados a `String(err?.message)` con regex**: `FlowClient.invoke` decide si reintentar analizando el texto del mensaje de error (`/network/i`, `/Flow 5\d{2}/`, etc.) en lugar de inspeccionar el código de estado HTTP real o un tipo de error estructurado; un cambio en el texto de un mensaje (por ejemplo, de un proxy corporativo) podría hacer que un error transitorio deje de reintentarse, o que uno permanente se reintente innecesariamente.
- **`retries` por defecto en 0**: si el llamador no pasa `opts.retries`, no hay ningún reintento pese a que la lógica de backoff existe; sería fácil pasar por alto esta configuración y asumir que ya hay resiliencia incorporada.
- **`getFileExtension` asume sesgo a imágenes** (fallback `"png"`) aunque la función se usa genéricamente para "archivos"; para adjuntos que no sean imagen el nombre final podría llevar una extensión incorrecta.
- **Sin control de tamaño/tipo de archivo** antes de subir a Supabase Storage en `uploadImageToSupabase`, dejando esa validación (si existe) enteramente a cargo del llamador o de las reglas del bucket.
