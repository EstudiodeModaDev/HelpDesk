import type { TicketAttachment } from "../../Funcionalidades/Tickets/AttachmentsTickets";

export type PreviewKind = "image" | "pdf" | "text" | "video" | "audio" | "unsupported";

export const hasRecatRole = (r?: string) => {
  const v = (r ?? "").trim().toLowerCase();
  return v === "administrador" || v === "tecnico" || v === "técnico";
};

const getFileExtension = (value?: string) => {
  if (!value) return "";
  const cleanValue = value.split("?")[0].split("#")[0];
  const parts = cleanValue.split(".");
  return parts.length > 1 ? parts.pop()?.toLowerCase() ?? "" : "";
};

export const getPreviewKind = (file?: TicketAttachment | null): PreviewKind => {
  const ext = getFileExtension(file?.name) || getFileExtension(file?.link);

  if (["png", "jpg", "jpeg", "gif", "bmp", "webp", "svg"].includes(ext)) return "image";
  if (ext === "pdf") return "pdf";
  if (["txt", "csv", "log", "json", "xml"].includes(ext)) return "text";
  if (["mp4", "webm", "ogg", "mov"].includes(ext)) return "video";
  if (["mp3", "wav", "ogg", "m4a"].includes(ext)) return "audio";

  return "unsupported";
};

export const openAttachmentDownload = (file: TicketAttachment) => {
  window.open(file.link, "_blank", "noopener,noreferrer");
};
