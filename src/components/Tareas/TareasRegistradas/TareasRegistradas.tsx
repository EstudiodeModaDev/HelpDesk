import { useTareas } from "../../../Funcionalidades/Tareas";
import { useGraphServices } from "../../../graph/GrapServicesContext";
import type { TareasService } from "../../../Services/Tareas.service";
import "./TareasRegistradas.css";          

export default function ListaTareas() {
  const {Tareas} = useGraphServices() as ReturnType<typeof useGraphServices> & {Tareas: TareasService;};
  const {rows, setFilterMode, filterMode} = useTareas(Tareas);
  
  return (
      <div className="lt-scope">
        <section className="lt-card">
          <header className="lt-header">
            <nav className="lt-tabs" aria-label="Filtros de tareas" role="tablist">
              <button className={`lt-tab ${filterMode === "Pendientes" ? "is-active" : ""}`} role="tab" aria-selected={filterMode === "Pendientes"} onClick={() => setFilterMode("Pendientes")}>
                Pendientes
              </button>
              <button className={`lt-tab ${filterMode === "Iniciadas" ? "is-active" : ""}`} role="tab" aria-selected={filterMode === "Iniciadas"} onClick={() => setFilterMode("Iniciadas")}>
                Iniciadas
              </button>
              <button className={`lt-tab ${filterMode === "Finalizadas" ? "is-active" : ""}`} role="tab" aria-selected={filterMode === "Finalizadas"} onClick={() => setFilterMode("Finalizadas")}>
                Finalizadas
              </button>
            </nav>
            <h2 className="lt-title">Mis Tareas</h2>
          </header>

          <div className="lt-list" role="list">
            {rows.map((t) => (
              <article key={t.Id} className="lt-item" role="listitem">
                <div className="lt-item__head">
                  <h3 className="lt-item__title">{t.Title}</h3>
                  <span className={`lt-badge ${String(t.Estado ?? "").toLowerCase().replace(/\s+/g, "-")}`} title={t.Estado}>
                    ● {t.Estado ?? "—"}
                  </span>
                </div>

                <ul className="lt-meta">
                  <li><strong>Responsable:</strong> {t.Reportadapor}</li>
                  <li><strong>Solicitada por:</strong> {t.Quienlasolicita}</li>
                  {t.Fechadesolicitud && <li><strong>Fecha solicitada:</strong> {t.Fechadesolicitud}</li>}
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
