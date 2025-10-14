import * as React from "react";
import "./RelacionadorInline.css";

export type TicketLite = { ID: number | string; Title: string };
type Mode = "padre" | "hijo";

type Props = {
  currentId: number | string;
  tickets: TicketLite[];
  defaultMode?: Mode;
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
  const [open, setOpen] = React.useState(false);
  const [activeIndex, setActiveIndex] = React.useState<number>(-1); // item resaltado en la lista
  const [selectedOne, setSelectedOne] = React.useState<TicketLite | null>(null);

  // Excluir el ticket actual
  const baseOptions = React.useMemo(
    () => tickets.filter((t) => String(t.ID) !== String(currentId)),
    [tickets, currentId]
  );

  // Filtrado (si query vacío => todos)
  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return baseOptions;
    return baseOptions.filter(
      (t) =>
        String(t.ID).toLowerCase().includes(q) ||
        (t.Title ?? "").toLowerCase().includes(q)
    );
  }, [baseOptions, query]);

  // Reset selección al cambiar modo
  React.useEffect(() => {
    setSelectedOne(null);
    setQuery("");
    setActiveIndex(-1);
  }, [mode]);

  // Si cambia el filtro, reajustar el índice activo
  React.useEffect(() => {
    if (filtered.length === 0) setActiveIndex(-1);
    else if (activeIndex >= filtered.length) setActiveIndex(0);
  }, [filtered.length]); // eslint-disable-line react-hooks/exhaustive-deps

  // Abrir/cerrar control con click fuera
  const wrapRef = React.useRef<HTMLDivElement | null>(null);
  React.useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!wrapRef.current) return;
      if (!wrapRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  function chooseItem(item: TicketLite) {
    setSelectedOne(item);
    setQuery(`${item.Title} — ID: ${item.ID}`);
    setOpen(false);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
      setOpen(true);
      setActiveIndex(0);
      e.preventDefault();
      return;
    }
    if (!open) return;

    if (e.key === "ArrowDown") {
      setActiveIndex((i) => (filtered.length ? (i + 1) % filtered.length : -1));
      e.preventDefault();
    } else if (e.key === "ArrowUp") {
      setActiveIndex((i) =>
        filtered.length ? (i <= 0 ? filtered.length - 1 : i - 1) : -1
      );
      e.preventDefault();
    } else if (e.key === "Enter") {
      if (activeIndex >= 0 && filtered[activeIndex]) {
        chooseItem(filtered[activeIndex]);
      }
      e.preventDefault();
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  function handleConfirm() {
    if (!selectedOne) return;
    onConfirm({ mode, selected: [selectedOne] });
  }

  return (
    <div className="relc relc--native">
      <div className="relc-row">
        {/* Select modo (nativo) */}
        <label className="relc-field">
          <span className="relc-field__label">Relación</span>
          <select
            className="relc-native"
            value={mode}
            onChange={(e) => setMode(e.target.value as Mode)}
          >
            <option value="padre">Padre de</option>
            <option value="hijo">Hijo de</option>
          </select>
        </label>

        {/* Combobox de tickets (input + lista) */}
        <div className="relc-field relc-field--grow" ref={wrapRef}>
          <span className="relc-field__label">Ticket</span>

          <div
            className="relc-combobox"
            role="combobox"
            aria-haspopup="listbox"
            aria-expanded={open}
            aria-owns="relc-listbox"
          >
            <input
              className="relc-input"
              placeholder="Buscar o seleccionar"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setOpen(true);
                setActiveIndex(0);
                // si el usuario empieza a escribir, des-seleccionamos
                setSelectedOne(null);
              }}
              onFocus={() => setOpen(true)}
              onKeyDown={handleKeyDown}
              aria-autocomplete="list"
              aria-controls="relc-listbox"
            />

            <button
              type="button"
              className="relc-combo__caret"
              aria-label={open ? "Cerrar" : "Abrir"}
              onClick={() => setOpen((v) => !v)}
            >
              ▾
            </button>
          </div>

          {open && (
            <ul id="relc-listbox" role="listbox" className="relc-list">
              {filtered.length === 0 ? (
                <li className="relc-empty" aria-disabled="true">
                  Sin resultados
                </li>
              ) : (
                filtered.map((t, idx) => {
                  const isActive = idx === activeIndex;
                  return (
                    <li
                      key={String(t.ID)}
                      role="option"
                      aria-selected={isActive}
                      className={`relc-item ${isActive ? "is-selected" : ""}`}
                      onMouseDown={(e) => {
                        // mousedown para no perder el foco del input antes del click
                        e.preventDefault();
                        chooseItem(t);
                      }}
                      onMouseEnter={() => setActiveIndex(idx)}
                    >
                      <span className="relc-title">{t.Title}</span>
                      <span className="relc-id">ID: {t.ID}</span>
                    </li>
                  );
                })
              )}
            </ul>
          )}
        </div>
      </div>

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
          disabled={!selectedOne}
        >
          ✓
        </button>
      </div>
    </div>
  );
}
