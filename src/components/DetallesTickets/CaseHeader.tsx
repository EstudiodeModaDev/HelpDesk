import type { Ticket } from "../../Models/Tickets";

const badgeClassByEstado = (estado?: string | null) => {
  if (estado === "Cerrado") return "is-closed";
  if (estado === "En Atención") return "is-open";
  return "is-out";
};

type CaseHeaderProps = {
  ticket: Ticket;
  onVolver: () => void;
};

export default function CaseHeader({ ticket, onVolver }: CaseHeaderProps) {
  return (
    <header className="cd-header">
      <h2 className="cd-title">Caso – ID {ticket.ID} </h2>
      <span
        className={`cd-badge ${badgeClassByEstado(ticket.Estadodesolicitud)}`}
        title={ticket.Estadodesolicitud ?? ""}
      >
        {ticket.Estadodesolicitud}
      </span>
      <button type="button" className="btn-primary" onClick={onVolver}>
        ← Volver
      </button>
    </header>
  );
}
