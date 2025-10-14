import * as React from "react";
import "./RelacionadorInline.css";

export type TicketLite = { ID: number | string; Title: string };

type Mode = "padre" | "hijo" | "masiva";

type Props = {
  /** Ticket actualmente abierto/seleccionado (para excluirlo de las opciones) */
  currentId: number | string;
  /** Lista de tickets disponibles (puedes paginar/inyectar desde fuera) */
  tickets: TicketLite[];

  /** Opcional: modo inicial (por defecto 'padre') */
  defaultMode?: Mode;

  /** Callbacks */
  onCancel: () => void;
  onConfirm: (payload: { mode: Mode; selected: TicketLite[] }) => void;
};

export default function RelacionadorInline({
  currentId,
  tickets,
  defaultMode = "padre",
  onCancel,
  onConfirm,
}: Props) {
  const [mode, setMode] = React.useState<Mode>(defaultMode);
  const [query, setQuery] = React.useState("");
  const [openList, setOpenList] = React.useState(false);

  // selección interna
  const [selectedOne, setSelectedOne] = React.useState<TicketLite | null>(null);
  const [selectedMany, setSelectedMany] = React.useState<TicketLite[]>([]);

  // tickets disponibles (excluye el actual)
  const baseOptions = React.useMemo(
    () => tickets.filter((t) => String(t.ID) !== String(currentId)),
    [tickets, currentId]
  );

  // filtrar por query
  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return baseOptions;
    return baseOptions.filter(
      (t) =>
        String(t.ID).toLowerCase().includes(q) ||
        (t.Title ?? "").toLowerCase().includes(q)
    );
  }, [baseOptions, query]);

  // reset de selección cuando cambia modo
  React.useEffect(() => {
    setSelectedOne(null);
    setSelectedMany([]);
    setQuery("");
    setOpenList(false);
  }, [mode]);

  function toggleMany(ticket: TicketLite) {
    const exists = selectedMany.some((x) => String(x.ID) === String(ticket.ID));
    setSelectedMany((prev) =>
      exists ? prev.filter((x) => String(x.ID) !== String(ticket.ID)) : [...prev, ticket]
    );
  }

  function handleConfirm() {
    const selected =
      mode === "masiva" ? selectedMany : selectedOne ? [selectedOne] : [];
    onConfirm({ mode, selected });
  }

  const isSingle = mode === "padre" || mode === "hijo";

  return (
    <div className="relc">
      {/* Barra de controles */}
      <div className="relc-row">
        {/* Select de modo */}
        <div className="relc-select">
          <button
            type="button"
            className="relc-select__btn"
            onClick={() => setOpenList(false)}
          >
            <span className="relc-select__label">
              {mode === "padre" ? "Padre de" : mode === "hijo" ? "Hijo de" : "Masiva"}
            </span>
            <span className="relc-caret">▾</span>
          </button>
          <div className="relc-select__menu">
            <button
              className={`relc-option ${mode === "padre" ? "is-active" : ""}`}
              onClick={() => setMode("padre")}
              type="button"
            >
              Padre de
            </button>
            <button
              className={`relc-option ${mode === "hijo" ? "is-active" : ""}`}
              onClick={() => setMode("hijo")}
              type="button"
            >
              Hijo de
            </button>
            <button
              className={`relc-option ${mode === "masiva" ? "is-active" : ""}`}
              onClick={() => setMode("masiva")}
              type="button"
            >
              Masiva
            </button>
          </div>
        </div>

        {/* Combo buscador/selector */}
        <div className="relc-combo">
          <input
            className="relc-input"
            placeholder="Buscar elementos"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setOpenList(true)}
          />
          <button
            className="relc-combo__caret"
            type="button"
            aria-label="Abrir lista"
            onClick={() => setOpenList((v) => !v)}
          >
            ▾
          </button>

          {openList && (
            <div className="relc-list" role="listbox">
              {filtered.length === 0 && (
                <div className="relc-empty">Sin resultados</div>
              )}

              {filtered.map((t) => {
                if (isSingle) {
                  const isSel = selectedOne && String(selectedOne.ID) === String(t.ID);
                  return (
                    <button
                      key={t.ID}
                      type="button"
                      className={`relc-item ${isSel ? "is-selected" : ""}`}
                      onClick={() => {
                        setSelectedOne(t);
                        setOpenList(false);
                      }}
                    >
                      <span className="relc-title">{t.Title}</span>
                      <span className="relc-id">ID: {t.ID}</span>
                    </button>
                  );
                }
                // Masiva
                const inSel = selectedMany.some(
                  (x) => String(x.ID) === String(t.ID)
                );
                return (
                  <label
                    key={t.ID}
                    className={`relc-item relc-item--check ${inSel ? "is-selected" : ""}`}
                  >
                    <input
                      type="checkbox"
                      checked={inSel}
                      onChange={() => toggleMany(t)}
                    />
                    <span className="relc-title">{t.Title}</span>
                    <span className="relc-id">ID: {t.ID}</span>
                  </label>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Chips de multi-selección */}
      {mode === "masiva" && selectedMany.length > 0 && (
        <div className="relc-chips">
          {selectedMany.map((s) => (
            <span key={s.ID} className="relc-chip">
              {s.Title} <span className="relc-chip__id">#{s.ID}</span>
              <button
                type="button"
                className="relc-chip__x"
                onClick={() => toggleMany(s)}
                aria-label="Quitar"
                title="Quitar"
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Acciones */}
      <div className="relc-actions">
        <button
          type="button"
          className="relc-btn relc-btn--circle relc-btn--danger"
          onClick={onCancel}
          title="Cancelar"
          aria-label="Cancelar"
        >
          ×
        </button>
        <button
          type="button"
          className="relc-btn relc-btn--circle relc-btn--ok"
          onClick={handleConfirm}
          title="Confirmar"
          aria-label="Confirmar"
        >
          ✓
        </button>
      </div>
    </div>
  );
}
