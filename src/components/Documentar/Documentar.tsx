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
import InfoActaEntrega from "./ActaEntrega/InformacionCaso/InfoActa";
import type { ComprasService } from "../../Services/Compras.service";

export default function Documentar({ ticket, tipo, onDone }: { ticket: Ticket; tipo: "solucion" | "seguimiento"; onDone?: () => void | Promise<void>}) {
  const { Tickets: TicketsSvc, Logs: LogsSvc, Plantillas: PlantillasSvc, Compras} =
    (useGraphServices() as ReturnType<typeof useGraphServices> & {
      Franquicias: FranquiciasService;
      Usuarios: UsuariosSPService;
      Tickets: TicketsService;
      Logs: LogService;
      Plantillas: PlantillasService;
      ComprasSvc: ComprasService
    });

  const { account } = useAuth();
  const { state, errors, submitting, setField, handleSubmit } = useDocumentarTicket({ Tickets: TicketsSvc, Logs: LogsSvc, ComprasSvc: Compras });

  // ⬇️ usamos también loading/error por si quieres feedback
  const { ListaPlantillas, loading: loadingPlantillas, error: errorPlantillas } = usePlantillas(PlantillasSvc);

  const [plantillaId, setPlantillaId] = React.useState<string>("");
  const [showEscalar, setShowEscalar] = React.useState<boolean>(false)
  const [showActaEntrega, setShowActaEntrega] = React.useState<boolean>(false)

  const onSelectPlantilla = (id: string) => {
    setPlantillaId(id);
    const p = (ListaPlantillas ?? []).find(pl => pl.Id === id);
    if (!p) return;
    // Asumimos que CamposPlantilla trae HTML listo para el editor
    setField("documentacion", p.CamposPlantilla ?? "");
  };

  return (
    <div className="ticket-form ticket-form--bleed">
      <h2 className="tf-title">
        {showEscalar
          ? "Escalamiento internet"
          : showActaEntrega
          ? "Nueva acta de entrega"
          : `Documentar ${tipo} del ticket #${ticket.ID}`}
      </h2>

      {/* === SOLO DOCUMENTACIÓN CUANDO showEscalar = false === */}
      {!showEscalar && !showActaEntrega ? (
        <form
          onSubmit={(e) => { handleSubmit(e, tipo, ticket, account!);  if (onDone) onDone();}}
          noValidate
          className="tf-grid"
        >
          {/* Selector de plantilla */}
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

          {/* Acciones (esquinas) */}
            <div className="tf-actions tf-col-2">
              <button type="submit" disabled={submitting} className="tf-submit btn-save">
                {submitting ? "Enviando..." : "Guardar documentación"}
              </button>

              {/* Escalar: esquina inferior izquierda (secundario) */}
              <button
                type="button"
                disabled={submitting}
                className="tf-secondary btn-escalar"
                onClick={() => setShowEscalar(true)}
              >
                Escalar a proveedor de internet
              </button>

              {/* Acta: misma esquina, pero un poco más arriba para no montarse */}
              <button
                type="button"
                disabled={submitting}
                className="tf-secondary btn-acta"
                onClick={() => setShowActaEntrega(true)}
              >
                Generar Acta de Entrega
              </button>
            </div>
          </form>
      ) : (
        <>
          {/* === SOLO ESCALAMIENTO CUANDO showEscalar = true === */}

          {showEscalar && <EscalamientoInternet ticket={ticket} />}
          {showActaEntrega && <InfoActaEntrega ticket={ticket}/>}

          {/* Botón para volver a documentación, en la misma esquina izquierda */}
          <div className="tf-actions tf-col-2">
            <button
              type="button"
              className="tf-secondary btn-escalar"
              onClick={() => {setShowEscalar(false); setShowActaEntrega(false)}}
            >
              Volver a documentación
            </button>
          </div>
        </>
      )}
    </div>
  );
}
