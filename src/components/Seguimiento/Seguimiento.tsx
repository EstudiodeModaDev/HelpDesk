import * as React from "react";
import "./Seguimiento.css";
import HtmlContent from "../Renderizador/Renderizador";
import { useGraphServices } from "../../graph/GrapServicesContext";
import type { Log } from "../../Models/Log";
import type { Ticket } from "../../Models/Tickets";
import { useUserPhoto } from "../../Funcionalidades/Workers";
import Documentar from "../Documentar/Documentar";

type Tab = "seguimiento" | "solucion";
type Mode = "detalle" | "documentar";

type Props = {
  role: string;
  ticket?: Ticket;          // <- si ya lo tienes, pásalo y evitas fetch
  onVolver?: () => void;
  defaultTab?: Tab;
  className?: string;
};

export default function TicketHistorial({
  role,
  ticket,
  onVolver,
  defaultTab = "solucion",
  className,
}: Props) {
  const [tab, setTab] = React.useState<Tab>(defaultTab);
  const [mode, setMode] = React.useState<Mode>("detalle"); // <- modo actual
  const isPrivileged = role === "Administrador" || role === "Tecnico" || role === "Técnico";

  const { Logs } = useGraphServices();

  // Historial (solo se monta en modo "detalle")
  const [mensajes, setMensajes] = React.useState<Log[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (mode !== "detalle") return; // <- si no estamos en detalle, NO cargues nada
    let cancel = false;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const items = await Logs.getAll({
          filter: `fields/Title eq '${ticket!.ID ?? ""}'`,
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
  }, [Logs, mode]);

  /* =========================
     MODO DOCUMENTAR (solo Documentar + Volver)
     ========================= */
  if (mode === "documentar") {
    return (
      <div className={className ?? ""} style={{ padding: 16 }}>
        <div style={{ display: "flex", alignItems: "center", marginBottom: 12, gap: 8 }}>
          <button type="button" className="th-back" onClick={() => setMode("detalle")}>
            <span className="th-back-icon" aria-hidden>←</span> Volver al detalle
          </button>
        </div>
        {ticket && (
          <Documentar
            key={`doc-${tab}-${ticket.ID}`}        // fuerza remontar al cambiar tipo
            ticket={ticket}
            tipo={tab}                             // "solucion" | "seguimiento"
          />
        )}
      </div>
    );
  }

  /* =========================
     MODO DETALLE (historial + botones)
     ========================= */
  return (
    <div className={className ?? ""} style={{ padding: 16 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", marginBottom: 12 }}>
        <span style={{ fontSize: 22, fontWeight: 700, marginRight: 12 }}>Historial</span>

        {isPrivileged && (
          <div style={{ display: "flex", gap: 8 }}>
            <button
              type="button"
              onClick={() => { setTab("seguimiento"); setMode("documentar"); }}
              className="th-tab"
            >
              + Seguimiento
            </button>
            <button
              type="button"
              onClick={() => { setTab("solucion"); setMode("documentar"); }}
              className="th-tab"
            >
              + Solución
            </button>
          </div>
        )}

        <div style={{ marginLeft: "auto" }}>
          <button type="button" className="th-back" onClick={onVolver}>
            <span className="th-back-icon" aria-hidden>←</span> Volver
          </button>
        </div>
      </div>

      {/* Caja principal (historial) */}
      <div className="th-box">
        {loading && mensajes.length === 0 && <p style={{ opacity: 0.7, padding: 16 }}>Cargando mensajes…</p>}
        {error && <p style={{ color: "#b91c1c", padding: 16 }}>{error}</p>}
        {!loading && !error && mensajes.length === 0 && <p style={{ opacity: 0.7, padding: 16 }}>No hay mensajes.</p>}

        {mensajes.map((m) => (<HistRow key={m.Id} m={m} />))}
      </div>
    </div>
  );
}

/* ---------- Subcomponente: una fila del historial ---------- */

function HistRow({ m }: { m: Log }) {
  const upn = m.CorreoActor || undefined;
  const photoUrl = useUserPhoto(upn);

  return (
    <div className="th-row">
      <div className="th-left th-left--stack">
        <div className="th-avatar">
          {photoUrl ? (
            <img src={photoUrl} alt={m.Actor ?? "Usuario"} className="th-avatar-img" />
          ) : (
            <div className="th-avatar-fallback" aria-hidden>👤</div>
          )}
        </div>
        <div className="th-nombre">{m.Actor}</div>
        <div className="th-fecha">{formatDateTime(m.Created ?? "")}</div>
      </div>

      <div className="th-right">
        <div className={`th-bubble th-${tipoToClass(m.Tipo_de_accion)}`}>
          {m.Title && <HtmlContent className="th-title" html={m.Title} />}
          <HtmlContent className="th-text" html={m.Descripcion} />
        </div>
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
    CorreoActor: it.CorreoActor,
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
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(
    d.getMinutes()
  )}`;
}

function tipoToClass(tipo?: string) {
  const t = (tipo ?? "").toLowerCase();
  if (t.includes("solución") || t.includes("solucion")) return "solucion";
  if (t.includes("seguimiento")) return "seguimiento";
  if (t.includes("reasign")) return "reasignacion";
  if (t.includes("cierre") || t.includes("cerrado")) return "cierre";
  if (t.includes("sistema")) return "sistema";
  return "default";
}
