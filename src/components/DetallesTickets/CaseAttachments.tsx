import type { TicketAttachment } from "../../Funcionalidades/Tickets/AttachmentsTickets";
import { getPreviewKind, openAttachmentDownload } from "./DetallesTickets.helpers";
import Trunc from "../Trunc/trunc";

type CaseAttachmentsProps = {
  rows: TicketAttachment[];
  selected: TicketAttachment | null;
  onSelect: (attachment: TicketAttachment) => void;
};

export default function CaseAttachments({ rows, selected, onSelect }: CaseAttachmentsProps) {
  const previewKind = getPreviewKind(selected);

  return (
    <section className="cd-attachments">
      <h3 className="cd-subtitle">Adjuntos ({rows.length})</h3>

      {rows.length === 0 ? (
        <p className="cd-empty">Sin adjuntos.</p>
      ) : (
        <ul className="cd-files" role="list">
          {rows.map((row, i) => {
            const canPreview = getPreviewKind(row) !== "unsupported";
            return (
              <li key={`${row.link}-${i}`} className="cd-file">
                <button
                  type="button"
                  className={`cd-file-link ${selected?.link === row.link ? "is-active" : ""}`}
                  onClick={() => (canPreview ? onSelect(row) : openAttachmentDownload(row))}
                  title={row.name}
                >
                  <span className={`cd-file-ico ext-${row.name}`} aria-hidden />
                  <Trunc text={row.name} lines={1} />
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {selected && previewKind !== "unsupported" && (
        <div className="cd-attachment-viewer">
          <div className="cd-attachment-viewer-head">
            <strong>{selected.name}</strong>
            <a
              href={selected.link}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-primary cd-attachment-download"
            >
              Descargar
            </a>
          </div>

          <div className="cd-attachment-frame">
            {previewKind === "image" && (
              <img src={selected.link} alt={selected.name} className="cd-attachment-image" />
            )}

            {(previewKind === "pdf" || previewKind === "text") && (
              <iframe src={selected.link} title={selected.name} className="cd-attachment-iframe" />
            )}

            {previewKind === "video" && (
              <video controls className="cd-attachment-media">
                <source src={selected.link} />
                Tu navegador no pudo reproducir este video.
              </video>
            )}

            {previewKind === "audio" && (
              <audio controls className="cd-attachment-audio">
                <source src={selected.link} />
                Tu navegador no pudo reproducir este audio.
              </audio>
            )}
          </div>
        </div>
      )}

      {selected && previewKind === "unsupported" && (
        <div className="cd-attachment-fallback">
          <p>Este archivo no se puede visualizar dentro de la página.</p>
          <a
            href={selected.link}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-primary cd-attachment-download"
          >
            Descargar archivo
          </a>
        </div>
      )}
    </section>
  );
}
