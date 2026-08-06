import * as React from "react";
import { useRepositories } from "../../../repositories/repositoriesContext";
import { useDashboardDisponibilidad } from "../../../Funcionalidades/dashboard/useDashboardDisponibilidad";
import type { ResolutorDisponibilidadAgg } from "../../../Funcionalidades/dashboard/useDashboardDisponibilidad";
import ResolutorInfoCard from "../../ResolutorInfoCard/ResolutorInfoCard";
import ResolutorDetalleModal from "./ResolutorDetalleModal";
import "../DashboardGeneral/DashboardResumen.css";
import "./DashboardDisponibilidadDemo.css";

export default function DashboardDisponibilidad() {
  const { tickets } = useRepositories();
  const { loading, range, setRange, resetFilters, selectedResolutor, setSelectedResolutor, resolutores, resolutorOptions, totalTickets } = useDashboardDisponibilidad(tickets!);

  const [resolutorDetalle, setResolutorDetalle] = React.useState<ResolutorDisponibilidadAgg | null>(null);

  if (loading) {
    return (
      <section className="dash">
        <div className="dash-loading" role="status" aria-live="polite">
          Cargando tablero de disponibilidad…
        </div>
      </section>
    );
  }

  return (
    <section className="dash dispo-board">
      <main className="dash-center">
        <header className="center-head dispo-head">
          <div className="dash-filters dispo-filters">
            <input 
              className="date"
              type="date"
              value={range.from}
              onChange={(e) => setRange((prev) => ({ ...prev, from: e.target.value }))}
            />
            <input
              className="date"
              type="date"
              value={range.to}
              onChange={(e) => setRange((prev) => ({ ...prev, to: e.target.value }))}
            />
            <select value={selectedResolutor} onChange={(e) => setSelectedResolutor(e.target.value)}>
              <option value="all">Todos los resolutores</option>
              {resolutorOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <button type="button" className="btn btn-transparent-final btn-m dispo-reset" onClick={resetFilters}>
              Limpiar
            </button>
          </div>
        </header>

        <section className="panel dispo-panel">
          <div className="dispo-panel__head">
            <h4>Distribución por resolutor</h4>
            <span>{totalTickets} tickets filtrados</span>
          </div>
          {!resolutores.length ? (
            <div className="hint">No hay tickets cerrados de disponibilidad con los filtros actuales.</div>
          ) : (
            <div className="dispo-resList">
              {resolutores.map((item) => (
                <ResolutorInfoCard
                  key={item.correo || item.nombre}
                  nombre={item.nombre}
                  onClick={() => setResolutorDetalle(item)}
                  minutos={{
                    total: item.minutosTotales/60,
                    normal: item.minutosNormales/60,
                    nocturno: item.minutosNocturnos/60,
                    dominical_festivo: item.minutosDominicales + item.minutosFestivos,
                    nocturno_dominical_festivo: item.minutos_nocturno_dominical_festivo/60,
                  }}
                />
              ))}
            </div>
          )}
        </section>
      </main>

      <ResolutorDetalleModal
        open={Boolean(resolutorDetalle)}
        resolutor={resolutorDetalle}
        range={range}
        onClose={() => setResolutorDetalle(null)}
      />
    </section>
  );
}
