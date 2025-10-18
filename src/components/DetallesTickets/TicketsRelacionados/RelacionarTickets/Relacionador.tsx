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
  reload: () => void;
  userMail: string;
  isAdmin: boolean;
};

export default function RelacionadorInline({currentId, onCancel, userMail, isAdmin, reload}: Props) {
  const [mode, setMode] = React.useState<Mode>("padre");
  const [tickets, setTickets] = React.useState<ticketOption[]>([]);
  const { Tickets } = useGraphServices();
  const {toTicketOptions, state, setField, handleConfirm} = useTickets(Tickets, userMail, isAdmin);

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


  const wrapRef = React.useRef<HTMLDivElement | null>(null);

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

          <div className="relc-combobox" role="combobox" aria-haspopup="listbox" aria-owns="relc-listbox">

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
          onClick={() => {handleConfirm(currentId, state.TicketRelacionar?.value ?? "", mode); reload()}}
          title="Confirmar"
          aria-label="Confirmar"
        >
          ✓
        </button>
      </div>
    </div>
  );
}
