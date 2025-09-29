import * as React from "react";
import "./Seguimiento.css";

// Ajusta esta import si tu contexto/servicio está en otra ruta:
import { useGraphServices } from "../../graph/GrapServicesContext";
import type { Log } from "../../Models/Log";

type Rol = "admin" | "tecnico" | "usuario";
type Tab = "seguimiento" | "solucion";


type Props = {role: Rol; ticketId: string | number; onVolver?: () => void; onAddClick?: (m: Log) => void; onViewClick?: (m: Log) => void; defaultTab?: Tab; className?: string;};

export default function TicketHistorial({
  role,
  ticketId,
  onVolver,
  onAddClick,
  onViewClick,
  defaultTab = "solucion",
  className,
}: Props) {
  const [tab, setTab] = React.useState<Tab>(defaultTab);
  const isPrivileged = role === "admin" || role === "tecnico";

  const { Logs } = useGraphServices(); // debe exponer tu LogService

  const [mensajes, setMensajes] = React.useState<Log[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Cargar primera página
  React.useEffect(() => {
    let cancel = false;
    const load = async () => {
      setLoading(true); setError(null);
      try {
        const id = String(ticketId).replace(/'/g, "''");
        const { items } = await Logs.getAll({
          filter: `fields/IdCaso eq '${id}'`,
          orderby: "fields/Created asc, id asc", // ajusta el nombre real
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
            {/* izquierda: avatar + nombre + fecha */}
            <div className="th-left">
              <div className="th-avatar">
                {/*m.autorAvatarUrl ? (
                  <img src={m.autorAvatarUrl} alt={m.autorNombre} />
                ) : (
                  <div className="th-avatar-fallback" aria-hidden>
                    👤
                  </div>
                )*/}
              </div>
              <div className="th-meta">
                <div className="th-nombre">{m.Actor}</div>
                <div className="th-fecha">{formatDateTime(m.Created ?? "")}</div>
              </div>
            </div>

            {/* derecha: burbuja + acciones */}
            <div className="th-right">
              <div className="th-bubble">
                <div className="th-text">{m.Descripcion}</div>
              </div>

              {isPrivileged && (
                <div className="th-actions">
                  <button
                    type="button"
                    className="th-action-btn"
                    title="Agregar"
                    onClick={() => onAddClick?.(m)}
                  >
                    +
                  </button>
                  <button
                    type="button"
                    className="th-action-btn"
                    title="Ver detalle"
                    onClick={() => onViewClick?.(m)}
                  >
                    🔍
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 8 }}>
        <button className="th-history-link" type="button" onClick={() => setTab("seguimiento")}>
          Historial completo
        </button>
      </div>
    </div>
  );
}

/* ---------------- helpers ---------------- */

function mapItemsToMensajes(items: any[]): Log[] {
  return items.map((it: any) => ({
    Id: String(it.id ?? cryptoRandom()),
    Actor: it.fields?.Autor ?? "Sistema",
    //autorAvatarUrl: it.fields?.AvatarUrl ?? undefined,
    Created: normalizeToISO(it.fields?.FechaCreacion),
    Title: it.fields?.Titulo ?? undefined,
    Descripcion: it.fields?.Texto ?? "",
    Tipo_de_accion: mapTipo(it.fields?.Tipo),
    CorreoActor: it.fields?.CorreoAutor ?? undefined,
  }));
}

function mapTipo(v: any): "seguimiento" | "solucion" | "sistema" {
  const t = String(v ?? "").toLowerCase();
  if (t === "seguimiento" || t === "solucion" || t === "sistema") return t;
  return "seguimiento";
}

function normalizeToISO(v: string | undefined): string {
  if (!v) return new Date().toISOString();
  if (/^\d{4}-\d{2}-\d{2}t/i.test(v)) return v; // ya es ISO
  // Soporta "DD/MM/YYYY HH:mm"
  const m = v.match(/^(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2})$/);
  if (m) {
    const [, dd, mm, yyyy, HH, MM] = m;
    return `${yyyy}-${mm}-${dd}T${HH}:${MM}:00`;
  }
  // Último recurso: Date parse
  const d = new Date(v);
  return isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
}

function formatDateTime(iso: string) {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function cryptoRandom() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    // @ts-ignore
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2);
}
