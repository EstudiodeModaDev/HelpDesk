import { useTicketsRelacionados } from "../../../Funcionalidades/Tickets";
import { useGraphServices } from "../../../graph/GrapServicesContext";
import type { Ticket } from "../../../Models/Tickets";
import "./TicketsAsociados.css";

type Props = {
  title?: string;
  ticket: Ticket;
  emptyChildrenText?: string;
};

export default function TicketsAsociados({title = "Tickets Asociados", ticket, emptyChildrenText = "No es hijo de ningun caso"}: Props) {

  const { Tickets } = useGraphServices(); 
  const {padres, hijos} = useTicketsRelacionados(Tickets, ticket);

  return (
    <section className="ta-panel" aria-label={title}>
      {/* Header */}
      <header className="ta-header">
        <div className="ta-header__left">
          <h2 className="ta-title">{title}</h2>
          <button type="button" className="ta-iconbtn" aria-label="Agregar ticket asociado" title="Agregar">
            <svg className="ta-icon" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        <a className="ta-seeall" href="#" aria-label="Ver todos los tickets asociados">
          Ver todos
        </a>
      </header>

      {/* Body: dos columnas */}
      <div className="ta-body">
        {/* Columna izquierda: Padres */}
        <section className="ta-column">
          <p className="ta-label">Padre de {padres.length}</p>
          <ul className="ta-list">
            {padres.map((t) => (
              <li key={t.ID} className="ta-list__item">
                <span className="ta-list__dash" aria-hidden>-</span>
                <a className="ta-link" href={t.ID || "#"}>
                  {t.Title} <span className="ta-link__muted">- ID: {t.ID}</span>
                </a>
              </li>
            ))}
          </ul>
        </section>

        {/* Columna derecha: Hijos */}
        <section className="ta-column">
          <p className="ta-label">Hijo de {hijos.length}</p>

          {hijos.length === 0 ? (
            <p className="ta-empty">{emptyChildrenText}</p>
          ) : (
            <ul className="ta-list">
              {hijos.map((t) => (
                <li key={t.ID} className="ta-list__item">
                  <span className="ta-list__dash" aria-hidden>-</span>
                  <a className="ta-link" href={t.ID || "#"}>
                    {t.Title} <span className="ta-link__muted">- ID: {t.ID}</span>
                  </a>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </section>
  );
}
