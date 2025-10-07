import "./Documentar.css";
import type { FranquiciasService } from "../../Services/Franquicias.service";
import { useGraphServices } from "../../graph/GrapServicesContext";
import { UsuariosSPService } from "../../Services/Usuarios.Service";
import type { TicketsService } from "../../Services/Tickets.service";
import RichTextBase64 from "../RichTextBase64/RichTextBase64";
import type { LogService } from "../../Services/Log.service";
import { useAuth } from "../../auth/authContext";
import type { Ticket } from "../../Models/Tickets";
import { useDocumentarTicket } from "../../Funcionalidades/Documentar";

export default function Documentar({ ticket, tipo }: { ticket: Ticket; tipo: "solucion" | "seguimiento" }) {
  const { Tickets: TicketsSvc, Logs: LogsSvc } =
    (useGraphServices() as ReturnType<typeof useGraphServices> & {
      Franquicias: FranquiciasService;
      Usuarios: UsuariosSPService;
      Tickets: TicketsService;
      Logs: LogService;
    });

  const { account } = useAuth(); // usuario logueado
  const { state, errors, submitting, setField, handleSubmit } =
    useDocumentarTicket({ Tickets: TicketsSvc, Logs: LogsSvc });

  return (
    <div className="ticket-form">
      <h2 className="tf-title">Documentar {tipo} del ticket #{ticket.ID}</h2>

      <form
        onSubmit={(e) => handleSubmit(e, tipo, ticket, account!)}
        noValidate
        className="tf-grid"
      >
        {/* Documentación */}
        <div className="tf-field tf-col-2">
          <label className="tf-label">Descripción de {tipo}</label>
          <RichTextBase64
            value={state.documentacion}
            onChange={(html) => setField("documentacion", html)}
            placeholder="Describe el problema y pega capturas (Ctrl+V)…"
          />
          {errors.documentacion && <small className="error">{errors.documentacion}</small>}
        </div>

        {/* Archivo */}
        <div className="tf-field tf-col-2">
          <label className="tf-label" htmlFor="archivo">Adjuntar archivo</label>
          <input
            id="archivo"
            type="file"
            onChange={(e) => setField("archivo", e.target.files?.[0] ?? null)}
            disabled={submitting}
            className="tf-input"
          />
          {errors.archivo && <small className="error">{errors.archivo}</small>}
        </div>

        {/* Submit */}
        <div className="tf-actions tf-col-2">
          <button type="submit" disabled={submitting} className="tf-submit">
            {submitting ? "Enviando..." : "Guardar documentación"}
          </button>
        </div>
      </form>
    </div>
  );
}
