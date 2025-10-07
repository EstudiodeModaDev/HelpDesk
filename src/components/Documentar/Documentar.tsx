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
import { usePlantillas } from "../../Funcionalidades/Plantillas";
import type { PlantillasService } from "../../Services/Plantillas.service";
import React from "react";
import EscalamientoInternet from "./EscalamientoProveedor/Escalamiento";

export default function Documentar({ ticket, tipo }: { ticket: Ticket; tipo: "solucion" | "seguimiento" }) {
  const { Tickets: TicketsSvc, Logs: LogsSvc, Plantillas: PlantillasSvc } =
    (useGraphServices() as ReturnType<typeof useGraphServices> & {
      Franquicias: FranquiciasService;
      Usuarios: UsuariosSPService;
      Tickets: TicketsService;
      Logs: LogService;
      Plantillas: PlantillasService;
    });

  const { account } = useAuth();
  const { state, errors, submitting, setField, handleSubmit } = useDocumentarTicket({ Tickets: TicketsSvc, Logs: LogsSvc });

  // ⬇️ usamos también loading/error por si quieres feedback
  const { ListaPlantillas, loading: loadingPlantillas, error: errorPlantillas } = usePlantillas(PlantillasSvc);

  const [plantillaId, setPlantillaId] = React.useState<string>("");
  const [showEscalar, setShowEscalar] = React.useState<boolean>(false)

  const onSelectPlantilla = (id: string) => {
    setPlantillaId(id);
    const p = (ListaPlantillas ?? []).find(pl => pl.Id === id);
    if (!p) return;
    // Asumimos que CamposPlantilla trae HTML listo para el editor
    setField("documentacion", p.CamposPlantilla ?? "");
  };

  return (
    <div className="ticket-form">
      <h2 className="tf-title">Documentar {tipo} del ticket #{ticket.ID}</h2>

      <form onSubmit={(e) => handleSubmit(e, tipo, ticket, account!)} noValidate className="tf-grid">

        {/* === NUEVO: Selector de plantilla === */}
        <div className="tf-field tf-col-2">
          <label className="tf-label" htmlFor="plantilla">Usar plantilla</label>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <select
              id="plantilla"
              className="tf-input"
              value={plantillaId}
              onChange={(e) => onSelectPlantilla(e.target.value)}
              disabled={submitting || loadingPlantillas || !ListaPlantillas?.length}
            >
              <option value="">{loadingPlantillas ? "Cargando plantillas..." : "— Selecciona una plantilla —"}</option>
              {(ListaPlantillas ?? []).map(p => (
                <option key={p.Id} value={p.Id}>{p.Title}</option>
              ))}
            </select>
            {errorPlantillas && <small className="error">{errorPlantillas}</small>}
          </div>
          <small className="hint">Al seleccionar, se insertará el contenido de la plantilla en el editor.</small>
        </div>
        {/* === /NUEVO === */}

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
          
          <button type="button" disabled={submitting} className="tf-submit" onClick={() => setShowEscalar(!showEscalar)}>
            {showEscalar ? "Ocultar escalamiento" : "Escalar a proveedor"}
          </button>
        </div>
      </form>

      {showEscalar && <EscalamientoInternet ticket={ticket}/>}
    </div>
  );
}
