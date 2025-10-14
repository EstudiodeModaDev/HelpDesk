// TicketsAsociados.tsx
import * as React from "react";
import { useTicketsRelacionados } from "../../../Funcionalidades/Tickets";
import { useGraphServices } from "../../../graph/GrapServicesContext";
import type { Ticket } from "../../../Models/Tickets";
import "./TicketsAsociados.css";

type Props = {
  title?: string;
  ticket: Ticket;                         // ticket actualmente seleccionado
  emptyChildrenText?: string;
  onSelect?: (t: Ticket) => void;         // ✅ nuevo: callback al seleccionar
  buildHref?: (id: number | string) => string; // opcional: si también quieres navegar
};

export default function TicketsAsociados({
  title = "Tickets Asociados",
  ticket,
  emptyChildrenText = "No es hijo de ningun caso",
  onSelect,
  buildHref, // opcional
}: Props) {
  const { Tickets } = useGraphServices();
  const { padres, hijos, loading, error } = useTicketsRelacionados(Tickets, ticket);

  // helper para click: prioriza onSelect; si no existe, usa href si lo pasaron
  function handleClick(e: React.MouseEvent, t: Ticket) {
    if (onSelect) {
      e.preventDefault();
      onSelect(t);
    }
    // si no hay onSelect pero sí buildHref, dejamos que el <a> navegue
  }

  const href = (id: number | string) => (buildHref ? buildHref(id) : "#");

  return (
    <section className="ta-panel" aria-label={title}>
      <header className="ta-header">
        <div className="ta-header__left">
          <h2 className="ta-title">{title}</h2>
          <button type="button" className="ta-iconbtn" aria-label="Agregar ticket asociado" title="Agregar">
            <svg className="ta-icon" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </button>
        </div>
        <a className="ta-seeall" href="#" aria-label="Ver todos los tickets asociados">Ver todos</a>
      </header>

      {loading && <div className="ta-skeleton" aria-hidden />}
      {error && <p className="ta-error">Error cargando tickets</p>}

      <div className="ta-body">
        {/* Padres */}
        <section className="ta-column">
          <p className="ta-label">Padre de {padres.length}:</p>
          <ul className="ta-list">
            {padres.length === 0 ? (
              <li className="ta-empty">No tiene ticket padre</li>
            ) : padres.map((t) => (
              <li key={t.ID} className="ta-list__item">
                <span className="ta-list__dash" aria-hidden>-</span>

                {onSelect ? (
                  // ✅ Botón con apariencia de link (no navega, llama onSelect)
                  <button
                    type="button"
                    className="ta-link ta-link--button"
                    onClick={(e) => handleClick(e, t)}
                  >
                    {t.Title} <span className="ta-link__muted">- ID: {t.ID}</span>
                  </button>
                ) : (
                  // Opción: link real si no pasas onSelect
                  <a className="ta-link" href={href(t.ID ?? "")}>
                    {t.Title} <span className="ta-link__muted">- ID: {t.ID}</span>
                  </a>
                )}
              </li>
            ))}
          </ul>
        </section>

        {/* Hijos */}
        <section className="ta-column">
          <p className="ta-label">Hijo de {hijos.length}:</p>
          {hijos.length === 0 ? (
            <p className="ta-empty">{emptyChildrenText}</p>
          ) : (
            <ul className="ta-list">
              {hijos.map((t) => (
                <li key={t.ID} className="ta-list__item">
                  <span className="ta-list__dash" aria-hidden>-</span>

                  {onSelect ? (
                    <button
                      type="button"
                      className="ta-link ta-link--button"
                      onClick={(e) => handleClick(e, t)}
                    >
                      {t.Title} <span className="ta-link__muted">- ID: {t.ID}</span>
                    </button>
                  ) : (
                    <a className="ta-link" href={href(t.ID ?? "")}>
                      {t.Title} <span className="ta-link__muted">- ID: {t.ID}</span>
                    </a>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </section>
  );
}
