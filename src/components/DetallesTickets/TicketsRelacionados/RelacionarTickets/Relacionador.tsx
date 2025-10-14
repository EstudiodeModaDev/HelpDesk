import * as React from "react";
import "./RelacionadorInline.css";

export type TicketLite = { ID: number | string; Title: string };
type Mode = "padre" | "hijo" | "masiva";

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

  // Excluir el ticket actual
  const baseOptions = React.useMemo(
    () => tickets.filter((t) => String(t.ID) !== String(currentId)),
    [tickets, currentId]
  );

  // Filtrar por texto
  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return baseOptions;
    return baseOptions.filter(
      (t) =>
        String(t.ID).toLowerCase().includes(q) ||
        (t.Title ?? "").toLowerCase().includes(q)
    );
  }, [baseOptions, query]);

  // Estado de selección
  const [selectedOne, setSelectedOne] = React.useState<string>("");
  const [selectedMany, setSelectedMany] = React.useState<string[]>([]);

  // Reset cuando cambia el modo
  React.useEffect(() => {
    setSelectedOne("");
    setSelectedMany([]);
  }, [mode]);

  function handleConfirm() {
    const selectedIds = mode === "masiva" ? selectedMany : selectedOne ? [selectedOne] : [];
    const map = new Map(filtered.map((t) => [String(t.ID), t]));
    const selected = selectedIds.map((id) => map.get(id)!).filter(Boolean);
    onConfirm({ mode, selected });
  }

  return (
    <div className="relc relc--native">
      <div className="relc-row">
        {/* Select modo */}
        <label className="relc-field">
          <span className="relc-field__label">Relación</span>
          <select
            className="relc-native"
            value={mode}
            onChange={(e) => setMode(e.target.value as Mode)}
          >
            <option value="padre">Padre de</option>
            <option value="hijo">Hijo de</option>
            <option value="masiva">Masiva</option>
          </select>
        </label>

        {/* Buscar */}
        <label className="relc-field relc-field--grow">
          <span className="relc-field__label">Buscar</span>
          <input
            className="relc-input"
            placeholder="Buscar elementos"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>

        {/* Select tickets */}
        <label className="relc-field relc-field--grow">
          <span className="relc-field__label">Tickets</span>
          {mode === "masiva" ? (
            <select
              className="relc-native"
              multiple
              size={Math.min(8, Math.max(3, filtered.length))}
              value={selectedMany}
              onChange={(e) => {
                const vals = Array.from(e.target.selectedOptions).map((o) => o.value);
                setSelectedMany(vals);
              }}
            >
              {filtered.map((t) => (
                <option key={String(t.ID)} value={String(t.ID)}>
                  {t.Title} — ID: {t.ID}
                </option>
              ))}
            </select>
          ) : (
            <select
              className="relc-native"
              value={selectedOne}
              onChange={(e) => setSelectedOne(e.target.value)}
            >
              <option value="" disabled>
                {filtered.length ? "Selecciona un ticket" : "Sin resultados"}
              </option>
              {filtered.map((t) => (
                <option key={String(t.ID)} value={String(t.ID)}>
                  {t.Title} — ID: {t.ID}
                </option>
              ))}
            </select>
          )}
        </label>
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
          disabled={
            (mode !== "masiva" && !selectedOne) ||
            (mode === "masiva" && selectedMany.length === 0)
          }
        >
          ✓
        </button>
      </div>
    </div>
  );
}
