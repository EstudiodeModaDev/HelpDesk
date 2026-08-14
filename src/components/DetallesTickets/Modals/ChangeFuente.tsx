import * as React from "react";
import Select from "react-select";
import "./ModalsStyles.css";
import type { Ticket } from "../../../Models/Tickets";
import { useAuth } from "../../../auth/authContext";
import { useRepositories } from "../../../repositories/repositoriesContext";
import { useCambiarFuenteSolicitante } from "../../../Funcionalidades/Tickets/CambiarFuente";

type SelectOptions = {
  label: string,
  value: string
}

export default function CambiarFuente({ ticket, onDone}: { ticket: Ticket, onDone: () => void }) {
  const {tickets, logs, } = useRepositories()
  const {account} = useAuth()
  const {handleCambiarCategoria, fuente, submitting, setFuente, errors} = useCambiarFuenteSolicitante({ticket, Tickets: tickets})

  const fuentes: SelectOptions[] = [
    {label: "Aplicativo", value: "Aplicativo"},
    {label: "Correo", value: "Correo"},
    {label: "Disponibilidad", value: "Disponibilidad"},
    {label: "Teams", value: "Teams"},
  ]

  const selectedOption = fuentes.find((f) => f.value === fuente)

  const handleConfirm = async (e: React.FormEvent): Promise<boolean> => {
    const canContinue = await handleCambiarCategoria(e)

    if (!canContinue) return false;

    await logs?.createLog({
      seguimientos_solvi_actor: account?.name ?? "",
      seguimientos_solvi_correo_actor: account?.username ?? "",
      seguimientos_solvi_descripcion: "El resolutor cambió la fuente solicitante a: " + fuente,
      seguimientos_solvi_tipo_de_accion: "Recategorización",
      seguimientos_solvi_id_ticket: Number(ticket.ID ?? ""),
      seguimientos_solvi_action_date: new Date()
    });

    return true;
  };

  const disable = submitting;

  return (
    <div className="dta-form">
      <h2 className="dta-title">Recategorizar Ticket</h2>

      <form
        onSubmit={async (e) => {
          const success = await handleConfirm(e);
          if (success) onDone();
        }}
        noValidate
        className="dta-grid"
      >

        {/*Fuentes solicitantes */}
          <div className="tf-row tf-row--cats tf-col-2"> 
            <div className="tf-field">
              <label className="tf-label">Categoría</label>
                <Select<SelectOptions, false>
                  classNamePrefix="rs"
                  placeholder={""}
                  options={fuentes}
                  value={selectedOption}
                  onChange={(option) => {
                    setFuente(option?.value ?? "")
                  }}
                  isDisabled={disable}
                  isClearable
                  menuPortalTarget={typeof document !== "undefined" ? document.body : null}
                  menuPosition="fixed"
                  styles={{
                    menuPortal: (base) => ({ ...base, zIndex: 9999 }),
                  }}
                />

              {errors.fuente && <small className="error">{errors.fuente}</small>}
            </div>
          </div>
        {/* Submit */}
        <div className="dta-actions dta-col-2">
          <button type="submit" disabled={submitting} className="btn-primary">
            {submitting ? "Enviando..." : "Confirmar"}
          </button>
        </div>
      </form>
    </div>
  );
}
