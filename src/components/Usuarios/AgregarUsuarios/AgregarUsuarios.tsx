import * as React from "react";
import "./NuevoTecnico.css";
import { useGraphServices } from "../../../graph/GrapServicesContext";
import { useUsuarios } from "../../../Funcionalidades/Usuarios";

type Props = {
  onCancel: () => void;
  tipo: string
};

export default function NuevoTecnico({onCancel, tipo}: Props) {
    const { Usuarios } = useGraphServices();
    const {state, addUser, setField, submitting, errors} = useUsuarios(Usuarios)  
    
    React.useEffect(() => {
        setField("Rol", tipo);
    }, [tipo]);

  return (
    <section className="users-page nt-scope" aria-label="Alta de técnico">
      <div className="nt-card">
        <header className="nt-header">
          <h2>Nuevo Técnico</h2>
        </header>

        <form className="nt-form" onSubmit={addUser} noValidate>
          <div className="nt-field">
            <label htmlFor="nt-nombre" className="nt-label">Nombre Completo</label>
            <input id="nt-nombre" className={`nt-input ${errors.Title ? "is-invalid" : ""}`} placeholder="Ingrese Nombre Completo" value={state.Title} onChange={(e) => setField("Title", e.target.value)} autoComplete="name"/>
            {errors.Title && <p className="nt-error">{errors.Title}</p>}
          </div>

          <div className="nt-field">
            <label htmlFor="nt-correo" className="nt-label">Correo Electrónico</label>
            <input id="nt-correo" className={`nt-input ${errors.Correo ? "is-invalid" : ""}`} placeholder="nombre@estudiodemoda.com" value={state.Correo} onChange={(e) => setField("Correo",e.target.value)} inputMode="email" autoComplete="email"/>
            {errors.Correo && <p className="nt-error">{errors.Correo}</p>}
          </div>

          <div className="nt-actions">
            <button type="button" className="nt-btn ghost" onClick={onCancel}>
              Cancelar
            </button>

            <button type="submit" className="nt-btn primary" disabled={submitting === true}>
              {submitting ? "Guardando..." : "Guardar Cambios"}
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}
