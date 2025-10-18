import * as React from "react";
import "./RelacionadorInline.css";
import Select from "react-select";
import type { ticketOption } from "../../../../Models/Tickets";
import { useTickets } from "../../../../Funcionalidades/Tickets";
import { useGraphServices } from "../../../../graph/GrapServicesContext";

export type TicketLite = { ID: number | string; Title: string };
type Mode = "padre" | "hijo" | "masiva";

type Props = {
  currentId: number | string;
  onCancel: () => void;
  onConfirm: (payload: { mode: Mode; selected: TicketLite[] }) => void;
  userMail: string;
  isAdmin: boolean
};

export default function RelacionadorInline({/*currentId,*/ onCancel, onConfirm, userMail, isAdmin}: Props) {
  const [mode, setMode] = React.useState<Mode>("padre");
  const [query, setQuery] = React.useState("");
  const [open, setOpen] = React.useState(false);
  const [tickets, setTickets] = React.useState<ticketOption[]>([]);
  const [selectedOne, setSelectedOne] = React.useState<TicketLite | null>(null);

  const { Tickets } = useGraphServices();
  const {toTicketOptions, state, setField} = useTickets(Tickets, userMail, isAdmin);

  React.useEffect(() => {
    setSelectedOne(null);
    setQuery("");
  }, [mode]);

  React.useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const charged = await toTicketOptions(); 
        if (alive) setTickets(charged);
      } catch (e: any) {
      } 
  })();

  return () => { alive = false; };
}, [toTicketOptions]); // si toTicketOptions viene de useCallback, inclúyelo


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
          <select className="relc-native" value={mode} onChange={(e) => setMode(e.target.value as Mode)}>
            <option value="padre">Padre de</option>
            <option value="hijo">Hijo de</option>
            <option value="masiva">Masiva</option>
          </select>
        </label>

        {/* Combobox de tickets */}
        <div className="relc-field relc-field--grow" ref={wrapRef}>
          <span className="relc-field__label">Ticket</span>

          <div className="relc-combobox" role="combobox" aria-haspopup="listbox" aria-expanded={open} aria-owns="relc-listbox">
            <input className="relc-input" placeholder="Buscar o seleccionar" value={query} onChange={(e) => {setQuery(e.target.value);setOpen(true); setSelectedOne(null);}}
              onFocus={() => setOpen(true)} aria-autocomplete="list" aria-controls="relc-listbox"/>

            <button type="button" className="relc-combo__caret" aria-label={open ? "Cerrar" : "Abrir"} onClick={() => setOpen((v) => !v)}>
              ▾
            </button>

            {/* Ticket */}
            <div className="tf-field">
              <label className="tf-label">Ticket</label>
              <Select<ticketOption, false>
                options={tickets}
                placeholder={"Buscar ticket"}
                value={state.TicketRelacionar}
                onChange={(opt) => setField("TicketRelacionar", opt ?? null)}
                classNamePrefix="rs"
                isClearable
              />
            </div>
          </div>

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
