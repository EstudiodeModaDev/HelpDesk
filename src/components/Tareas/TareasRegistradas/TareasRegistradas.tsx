import type { Tarea } from "../../../Models/Tareas";
import "./TareasRegistradas.css";          // base
import "./ListaTareas.force-light.css";    // (si lo separaste) IMPORTA DESPUÉS

export default function ListaTareas({ tareas }: { tareas: Tarea[] }) {
  return (
    <div className="lt-scope">{/* ⬅️ wrapper que fija tokens y color-scheme */}
      <section className="lt-card">
        <header className="lt-header">
          <nav className="lt-tabs" aria-label="Filtros de tareas">
            <button className="lt-tab is-active">Pendientes</button>
            <button className="lt-tab" disabled>Iniciadas</button>
            <button className="lt-tab" disabled>Finalizadas</button>
          </nav>
          <h2 className="lt-title">Mis Tareas</h2>
        </header>

        <div className="lt-list" role="list">
          {tareas.map((t) => (
            <article key={t.id} className="lt-item" role="listitem">
              <div className="lt-item__head">
                <h3 className="lt-item__title">{t.titulo}</h3>
                <span className={`lt-badge ${String(t.estado).toLowerCase()}`} title={t.estado}>
                  ● {t.estado ?? "—"}
                </span>
              </div>

              <ul className="lt-meta">
                <li><strong>Responsable:</strong> {t.responsable}</li>
                <li><strong>Solicitada por:</strong> {t.solicitante}</li>
                {t.fechaSolicitada && <li><strong>Fecha solicitada:</strong> {t.fechaSolicitada}</li>}
              </ul>

              <div className="lt-actions">
                <button className="lt-link">Editar</button>
                <button className="lt-link danger">Eliminar</button>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
