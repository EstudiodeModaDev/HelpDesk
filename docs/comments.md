# Comentarios

## Descripción general

Este módulo expone los comentarios ("Solvi comments") asociados a un ticket: listarlos, crearlos y eliminarlos, con notificaciones a los participantes/menciones involucrados. A diferencia de los módulos de Acceso/Auth (que hablan con SharePoint/Graph), este módulo se apoya en **Supabase** como backend de datos conversacionales, y usa **TanStack Query** (`@tanstack/react-query`) para cache/estado de servidor en lugar de `useState`/`useEffect` manuales. Es consumido por el panel de mensajes de un ticket en detalle.

## Archivos

- `src/Funcionalidades/comments/hooks/useSolviComments.ts`: define los tipos `SolviAuthor`/`SolviComment` y tres hooks de React Query — `useSolviComments` (consulta), `useCreateSolviComment` y `useDeleteSolviComment` (mutaciones) — que delegan el acceso a datos en el repositorio de mensajes.

## Funciones y constantes clave

- `SolviAuthor` / `SolviComment` (tipos exportados): forma de un comentario y su autor tal como se muestran en la UI (`Comment_ID`, `Comment_Text`, `Comment_Created_At`, `author: {User_ID, User_Name, User_Avatar_url}`).
- `useSolviComments(ticketId: number)`: `useQuery` con `queryKey: ['solvi-comments', ticketId]`, `queryFn: () => messages.fetchSolviComments(ticketId)`, `staleTime: 0` (siempre se considera obsoleto, favorece refetch) y `retry: 1`. `messages` proviene de `useRepositories()` (contexto de repositorios).
- `useCreateSolviComment()`: `useMutation` que llama a `messages.createSolviComment(ticketId, text, userMail, mentionedUserIds)`. En éxito invalida la query `['solvi-comments', ticketId]` (fuerza recarga de la lista) y muestra un `toast.success`; en error muestra `toast.error` con `error.message`.
- `useDeleteSolviComment()`: `useMutation` que llama a `messages.deleteSolviComment(commentId)`, invalida la misma `queryKey` en éxito y usa toasts de éxito/error igual que la anterior.

El hook en sí es deliberadamente delgado: **toda la lógica de negocio pesada vive en el repositorio**, no aquí (ver "Dependencias").

## Flujo del módulo

1. `src/components/DetallesTickets/Modals/Messages/Mensajes.tsx` es el único consumidor: usa `useSolviComments(ticketId)` para renderizar la lista, `useCreateSolviComment()` para el formulario de nuevo comentario (con soporte de menciones vía `mentionedUserIds`) y `useDeleteSolviComment()` para borrar un comentario propio.
2. Al crear un comentario, el flujo real ocurre en `SupabaseMessageRepository.createSolviComment` (`src/repositories/ParticipantsRepository/SupabaseMessageRepository.ts`):
   - Resuelve el usuario autor por correo (`TBL_Users`, `ilike User_Email`).
   - Verifica autorización: el autor debe ser admin, o ser el solicitante/resolutor del ticket (`TBL_Ticket_Solvi`), o ya ser participante (`TBL_Solvi_Participants`); si no cumple ninguna condición, lanza `"No autorizado para comentar en este ticket"`.
   - Inserta el comentario en `TBL_Solvi_Comments` y trae el autor embebido (`author:TBL_Users!Comment_User_ID`).
   - Si hay menciones, inserta filas en `TBL_Solvi_Comment_Mentions` y hace `upsert` de los mencionados como participantes en `TBL_Solvi_Participants` (`onConflict: "Ticket_ID,User_ID", ignoreDuplicates: true`).
   - Envía notificaciones: `notifyConversationComment` a todos los participantes/solicitante/resolutor (excluyendo al autor) y `notifyCommentMention` solo a los usuarios mencionados (ambas funciones viven en `Funcionalidades/Tickets/utils/notifications`).
3. Al eliminar, `SupabaseMessageRepository.deleteSolviComment` simplemente hace `DELETE` sobre `TBL_Solvi_Comments` filtrando por `Comment_ID`.
4. `useSolviComments`/`useCreateSolviComment`/`useDeleteSolviComment` obtienen su implementación concreta a través de `useRepositories()` → `repositoriesContext.tsx`, que inyecta `messages: new SupabaseMessageRepository()` (patrón repositorio: el hook solo conoce la interfaz `MessagesRepository`).

## Dependencias

- **Repositorios**: `src/repositories/ParticipantsRepository/MessagesRepository.ts` (interfaz `MessagesRepository`, incluye además `fetchSolviParticipants` y `fetchAllUsers`, no usados por este hook) y su implementación `SupabaseMessageRepository.ts`; `src/repositories/repositoriesContext.tsx` (`useRepositories`) para la inyección de dependencias.
- **Servicios**: `Services/Supabase.service.ts` (cliente `supabase` creado con `VITE_SUPABASE_URL`/`VITE_SUPABASE_PUBLISHABLE_KEY`, usado indirectamente por el repositorio).
- **Modelos**: `Models/Supabase/useSolviParticipants.ts` (`SolviParticipant`, usado por el repositorio, no directamente por el hook).
- **Notificaciones**: `Funcionalidades/Tickets/utils/notifications` (`notifyConversationComment`, `notifyCommentMention`).
- **Externas**: `@tanstack/react-query` (`useQuery`, `useMutation`, `useQueryClient`), `react-hot-toast`.

## Oportunidades de mejora

- **Autorización crítica implementada en el cliente**: el chequeo `allowed` (admin / solicitante / resolutor / participante) en `SupabaseMessageRepository.createSolviComment` corre en el navegador, contra un cliente Supabase inicializado con una clave pública (`VITE_SUPABASE_PUBLISHABLE_KEY`, ver `Services/Supabase.service.ts`). Si las tablas `TBL_Solvi_Comments`/`TBL_Solvi_Comment_Mentions`/`TBL_Solvi_Participants` no tienen Row Level Security (RLS) equivalente en Supabase, cualquier usuario podría insertar comentarios directamente contra la API de Supabase saltándose esta validación por completo. Esto no se puede confirmar solo desde el frontend, pero es un riesgo de seguridad real que merece verificación explícita de las políticas RLS en el proyecto Supabase.
- **Manejo de errores inconsistente entre operaciones del mismo archivo**: `fetchSolviComments`/`createSolviComment` envuelven el error de Supabase en `new Error(error.message)`, mientras que `fetchSolviParticipants`/`fetchAllUsers` relanzan el objeto `error` original (`throw error`) sin normalizar — un consumidor que espere siempre `Error` con `.message` legible puede recibir un objeto distinto según el método.
- **Falla dura si el comentario no tiene autor**: `fetchSolviComments` lanza una excepción (`El comentario ${id} no tiene un autor asociado`) si el `join` con `TBL_Users` no resuelve el autor (por ejemplo, un usuario eliminado). Esto tira abajo **toda la lista** de comentarios de un ticket por un solo registro huérfano, en vez de degradar ese comentario puntual (p. ej. mostrar "Usuario desconocido").
- **Notificaciones "best effort" pero silenciosas**: el bloque de notificaciones en `createSolviComment` está en un `try/catch` que solo hace `console.error` (líneas ~102-192); si `notifyConversationComment`/`notifyCommentMention` fallan, el comentario ya se creó pero nadie se entera del fallo de notificación desde la UI (ni siquiera un toast informativo), dificultando detectar problemas de notificación en producción.
- **Llamadas Supabase no paralelizadas de forma completa**: dentro de `createSolviComment` hay dos bloques de `Promise.all` separados (uno para `ticket`+`participant`, otro para `ticketInfo`+`participantIdsResult`+`mentionedUsersResult`) que en parte repiten la misma consulta a `TBL_Ticket_Solvi` (una vez para autorizar, otra para notificar) — dos round-trips a la misma tabla para el mismo ticket en una sola operación de "crear comentario".
- **Nombres mixtos ES/EN y snake_case/PascalCase**: los nombres de tabla y columna de Supabase (`TBL_Solvi_Comments`, `Comment_ID`, `ticket_solvi_correo_solicitante`) mezclan snake_case en minúscula con PascalCase, y el dominio combina español (tickets, correo) con el prefijo "Solvi"; no hay una convención única, lo que puede confundir a quien escriba nuevas consultas.
- **`useDeleteSolviComment` no valida pertenencia**: el hook y el repositorio permiten borrar cualquier `commentId` sin verificar que el usuario que ejecuta la mutación sea el autor (o admin) del comentario — la restricción de "quién puede borrar" no está en este módulo; si tampoco está en RLS de Supabase, cualquier usuario autenticado podría borrar comentarios ajenos.
