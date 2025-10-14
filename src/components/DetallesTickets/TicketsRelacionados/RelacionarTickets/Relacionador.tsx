import * as React from "react";
import "./RelacionadorInline.css";

export type TicketLite = { ID: number | string; Title: string };

type Mode = "padre" | "hijo" | "masiva";

type Props = {
  /** ID del ticket actual (se excluye de la lista) */
  currentId: number | string;
  /** Opciones disponibles para relacionar */
  tickets: TicketLite[];
  /** Modo inicial del relacionador */
  defaultMode?: Mode;
  /** Cerrar sin cambios */
  onCancel: () => void;
  /** Confirmar relación */
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
  const [openMode, setOpenMode] = React.useState(false);

  // selección
  const [selectedOne, setSelectedOne] = React.useState<TicketLite | null>(null);
  const [selectedMany, setSelectedMany] = React.useState<TicketLite[]>([]);

  // opciones base (excluye el actual)
  const baseOptions = React.useMemo(
    () => tickets.filter((t) => String(t.ID) !== String(currentId)),
    [tickets, currentId]
  );

  // filtrado por texto
  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return baseOptions;
    return baseOptions.filter(
      (t) =>
        String(t.ID).toLowerCase().includes(q) ||
        (t.Title ?? "").toLowerCase().includes(q)
    );
  }, [baseOptions, query]);

  // reset de selección al cambiar modo
  React.useEffect(() => {
    setSelectedOne(null);
    setSelectedMany([]);
    setQuery("");
    setOpenList(false);
  }, [mode]);

  const isSingle = mode === "padre" || mode === "hijo";

  function toggleMany(ticket: TicketLite) {
    const exists = selectedMany.some((x) => String(x.ID) === String(ticket.ID));
    setSelectedMany((prev) =>
      exists ? prev.filter((x) => String(x.ID) !== String(ticket.ID)) : [...prev, ticket]
    );
  }

  function handleConfirm() {
    const selected = isSingle ? (selectedOne ? [selectedOne] : []) : selectedMany;
    onConfirm({ mode, selected });
  }

  return (
    <div className="relc">
      {/* Fila superior */}
      <div className="relc-row">
        {/* Select de modo */}
        <div className="relc-select">
          <button
            type="button"
            className="relc-select__btn"
            onClick={() => {
              setOpenMode((v) => !v);
              setOpenList(false);
            }}
            aria-haspopup="listbox"
            aria-expanded={openMode}
          >
            <span className="relc-select__label">
              {mode === "padre" ? "Padre de" : mode === "hijo" ? "Hijo de" : "Masiva"}
            </span>
            <span className="relc-caret">▾</span>
          </button>

          {openMode && (
            <div className="relc-select__menu" role="listbox">
              <button
                className={`relc-option ${mode === "padre" ? "is-active" : ""}`}
                onClick={() => {
                  setMode("padre");
                  setOpenMode(false);
                }}
                type="button"
              >
                Padre de
              </button>
              <button
                className={`relc-option ${mode === "hijo" ? "is-active" : ""}`}
                onClick={() => {
                  setMode("hijo");
                  setOpenMode(false);
                }}
                type="button"
              >
                Hijo de
              </button>
              <button
                className={`relc-option ${mode === "masiva" ? "is-active" : ""}`}
                onClick={() => {
                  setMode("masiva");
                  setOpenMode(false);
                }}
                type="button"
              >
                Masiva
              </button>
            </div>
          )}
        </div>

        {/* Combo buscador / selector */}
        <div className="relc-combo">
          <input
            className="relc-input"
            placeholder="Buscar elementos"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => {
              setOpenList(true);
              setOpenMode(false);
            }}
          />
          <button
            className="relc-combo__caret"
            type="button"
            aria-label="Abrir lista"
            onClick={() => {
              setOpenList((v) => !v);
              setOpenMode(false);
            }}
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

                // masiva
                const inSel = selectedMany.some((x) => String(x.ID) === String(t.ID));
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

      {/* Chips (solo masiva) */}
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
