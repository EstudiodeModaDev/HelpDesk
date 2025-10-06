import * as React from "react";
import "./Seguimiento.css";
import HtmlContent from "../Renderizador/Renderizador";
import { useGraphServices } from "../../graph/GrapServicesContext";
import type { Log } from "../../Models/Log";

type Tab = "seguimiento" | "solucion";

type Props = {
  role: string;
  ticketId: string | number;
  onVolver?: () => void;
  onAddClick?: (m: Log) => void;
  onViewClick?: (m: Log) => void;
  defaultTab?: Tab;
  className?: string;
};

const tipoToClass = (tipo?: string) => {
  const t = (tipo ?? "").toLowerCase();
  if (t.includes("solución") || t.includes("solucion")) return "solucion";
  if (t.includes("creacion") || t.includes("creacion")) return "creacion";
  return "default";
};

export default function TicketHistorial({
  role,
  ticketId,
  onVolver,
  defaultTab = "solucion",
  className,
}: Props) {
  const [tab, setTab] = React.useState<Tab>(defaultTab);
  const isPrivileged = role === "Administrador" || role === "Tecnico"; 

  const { Logs } = useGraphServices();

  const [mensajes, setMensajes] = React.useState<Log[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancel = false;
    const load = async () => {
      setLoading(true); setError(null);
      try {
        const items = await Logs.getAll({
          filter: `fields/Title eq '${String(ticketId).replace(/'/g, "''")}'`,
          orderby: "fields/Created desc",
          top: 2000,
        });
        if (cancel) return;
        const mapped = mapItemsToMensajes(items);
        setMensajes(mapped);
      } catch (e: any) {
        if (cancel) return;
        setError(e?.message ?? "No se pudo cargar el historial");
        setMensajes([]);
      } finally {
        if (!cancel) setLoading(false);
      }
    };
    load();
    return () => { cancel = true; };
  }, [ticketId, Logs]);

  return (
    <div className={className ?? ""} style={{ padding: 16 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", marginBottom: 12 }}>
        <span style={{ fontSize: 22, fontWeight: 700, marginRight: 12 }}>
          Agregar :
        </span>

        {/* 👇 Tabs SOLO para admins */}
        {isPrivileged && (
          <div style={{ display: "flex", gap: 8 }}>
            <button
              type="button"
              onClick={() => setTab("seguimiento")}
              className={`th-tab ${tab === "seguimiento" ? "th-tab--active" : ""}`}
            >
              Seguimiento
            </button>
            <button
              type="button"
              onClick={() => setTab("solucion")}
              className={`th-tab ${tab === "solucion" ? "th-tab--active" : ""}`}
            >
              Solución
            </button>
          </div>
        )}

        <div style={{ marginLeft: "auto" }}>
          <button type="button" className="th-back" onClick={onVolver}>
            <span className="th-back-icon" aria-hidden>←</span> Volver
          </button>
        </div>
      </div>

      {/* Caja principal */}
      <div className="th-box">
        {loading && mensajes.length === 0 && (
          <p style={{ opacity: 0.7, padding: 16 }}>Cargando mensajes…</p>
        )}
        {error && <p style={{ color: "#b91c1c", padding: 16 }}>{error}</p>}
        {!loading && !error && mensajes.length === 0 && (
          <p style={{ opacity: 0.7, padding: 16 }}>No hay mensajes.</p>
        )}

        {mensajes.map((m) => (
          <div key={m.Id} className="th-row">
            <div className="th-left">
              <div className="th-avatar">
                <div className="th-avatar-fallback" aria-hidden>👤</div>
              </div>
              <div className="th-meta">
                <div className="th-nombre">{m.Actor}</div>
                <div className="th-fecha">{formatDateTime(m.Created ?? "")}</div>
              </div>
            </div>

            <div className="th-right">
            <div className={`th-bubble th-${tipoToClass(m.Tipo_de_accion)}`} aria-label={`Mensaje tipo ${m.Tipo_de_accion ?? "general"}`}>
                {m.Title && <HtmlContent className="th-title" html={m.Title} />}
                <HtmlContent className="th-text" html={m.Descripcion} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------------- helpers ---------------- */

function mapItemsToMensajes(items: any[]): Log[] {
  return (Array.isArray(items) ? items : []).map((it: any) => ({
    Id: String(it.Id),
    Actor: it.Actor ?? "Sistema",
    Created: normalizeToISO(it.Created),
    Title: it.Title ?? undefined,
    Descripcion: it.Descripcion ?? "",
    Tipo_de_accion: it.Tipo_de_accion,
    CorreoActor: it.CorreoActor
  }));
}

function normalizeToISO(v: string | undefined): string {
  if (!v) return new Date().toISOString();
  if (/^\d{4}-\d{2}-\d{2}t/i.test(v)) return v;
  const m = v.match(/^(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2})$/);
  if (m) {
    const [, dd, mm, yyyy, HH, MM] = m;
    return `${yyyy}-${mm}-${dd}T${HH}:${MM}:00`;
  }
  const d = new Date(v);
  return isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
}

function formatDateTime(iso: string) {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
