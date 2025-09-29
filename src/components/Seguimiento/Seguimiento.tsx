import * as React from "react";
import "./Seguimiento.css";

type Rol = "admin" | "tecnico" | "usuario";
type Tab = "seguimiento" | "solucion";

export type Mensaje = {
  id: string | number;
  autorNombre: string;
  autorAvatarUrl?: string; // opcional; si no viene, renderiza un avatar por defecto
  fechaISO: string;        // ej. "2025-09-29T10:23:00Z"
  titulo?: string;         // bold en la burbuja
  texto: string;
  tipo: Tab | "sistema";   // se muestra en la pestaña que corresponda; "sistema" aparece en ambas
};

type Props = {
  role: Rol;
  mensajes: Mensaje[];
  onVolver?: () => void;
  onAddClick?: (m: Mensaje) => void;   // handler del botón ➕
  onViewClick?: (m: Mensaje) => void;  // handler del botón 🔍
  defaultTab?: Tab;
  className?: string;
};

export default function TicketHistorial({
  role,
  mensajes,
  onVolver,
  onAddClick,
  onViewClick,
  defaultTab = "solucion",
  className,
}: Props) {
  const [tab, setTab] = React.useState<Tab>(defaultTab);
  const isPrivileged = role === "admin" || role === "tecnico";

  const visibles = React.useMemo(
    () =>
      mensajes.filter((m) => m.tipo === tab || m.tipo === "sistema"),
    [mensajes, tab]
  );

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
        {visibles.length === 0 ? (
          <p style={{ opacity: 0.7, padding: 16 }}>No hay mensajes.</p>
        ) : (
          visibles.map((m) => (
            <div key={m.id} className="th-row">
              {/* Columna izquierda: avatar + nombre + fecha */}
              <div className="th-left">
                <div className="th-avatar">
                  {m.autorAvatarUrl ? (
                    <img src={m.autorAvatarUrl} alt={m.autorNombre} />
                  ) : (
                    <div className="th-avatar-fallback" aria-hidden>
                      👤
                    </div>
                  )}
                </div>
                <div className="th-meta">
                  <div className="th-nombre">{m.autorNombre}</div>
                  <div className="th-fecha">{formatDateTime(m.fechaISO)}</div>
                </div>
              </div>

              {/* Columna derecha: burbuja verde + acciones */}
              <div className="th-right">
                <div className="th-bubble">
                  {m.titulo && <div className="th-title">{m.titulo}</div>}
                  <div className="th-text">{m.texto}</div>
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
          ))
        )}
      </div>

      <button className="th-history-link" type="button">
        Historial completo
      </button>
    </div>
  );
}

function formatDateTime(iso: string) {
  // Render local DD/MM/YYYY HH:mm
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  const pad = (n: number) => String(n).padStart(2, "0");
  const dd = pad(d.getDate());
  const mm = pad(d.getMonth() + 1);
  const yyyy = d.getFullYear();
  const hh = pad(d.getHours());
  const mi = pad(d.getMinutes());
  return `${dd}/${mm}/${yyyy} ${hh}:${mi}`;
}
