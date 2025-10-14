import "./TicketsAsociados.css";

type TicketLink = {
  id: number | string;
  title: string;
  href?: string;
};

type Props = {
  title?: string;
  parentsLabel?: string;   // Ej: "Padre de 2/10:"
  childrenLabel?: string;  // Ej: "Hijo de: 0/0"
  parents?: TicketLink[];
  children?: TicketLink[];
  emptyChildrenText?: string;
};

export default function TicketsAsociados({
  title = "Tickets Asociados",
  parentsLabel = "Padre de 2/10:",
  childrenLabel = "Hijo de: 0/0",
  parents = [
    { id: 288, title: "Problemas con usuario POS - Hacer pruebas", href: "#" },
    { id: 417, title: "Problemas con usuarios POS", href: "#" },
  ],
  children = [],
  emptyChildrenText = "No es hijo de ningun caso",
}: Props) {
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
          <p className="ta-label">{parentsLabel}</p>
          <ul className="ta-list">
            {parents.map((t) => (
              <li key={t.id} className="ta-list__item">
                <span className="ta-list__dash" aria-hidden>-</span>
                <a className="ta-link" href={t.href || "#"}>
                  {t.title} <span className="ta-link__muted">- ID: {t.id}</span>
                </a>
              </li>
            ))}
          </ul>
        </section>

        {/* Columna derecha: Hijos */}
        <section className="ta-column">
          <p className="ta-label">{childrenLabel}</p>

          {children.length === 0 ? (
            <p className="ta-empty">{emptyChildrenText}</p>
          ) : (
            <ul className="ta-list">
              {children.map((t) => (
                <li key={t.id} className="ta-list__item">
                  <span className="ta-list__dash" aria-hidden>-</span>
                  <a className="ta-link" href={t.href || "#"}>
                    {t.title} <span className="ta-link__muted">- ID: {t.id}</span>
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
