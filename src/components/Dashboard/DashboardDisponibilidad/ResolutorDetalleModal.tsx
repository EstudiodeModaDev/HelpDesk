import "./ResolutorDetalleModal.css";
import ResolutorInfoCard from "../../ResolutorInfoCard/ResolutorInfoCard";
import type { ResolutorDisponibilidadAgg } from "../../../Funcionalidades/dashboard/useDashboardDisponibilidad";
import { useDisponibilidadTeams } from "../../../Funcionalidades/dashboard/useDisponibilidadTeams";
import type { DateRange } from "../../../Models/Filtros";

type ResolutorDetalleModalProps = {
  open: boolean;
  resolutor: ResolutorDisponibilidadAgg | null;
  range: DateRange;
  onClose: () => void;
};

function formatHours(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return "0 h";
  return `${value.toLocaleString("es-CO", { minimumFractionDigits: 0, maximumFractionDigits: 1 })} h`;
}

function formatPercent(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return "0%";
  return `${value.toLocaleString("es-CO", { minimumFractionDigits: 0, maximumFractionDigits: 1 })}%`;
}

export function calcularPorcentajeDisponibilidad(horasProgramadas: number, horasRegistradasContador: number): number {
  if (!Number.isFinite(horasProgramadas) || horasProgramadas <= 0) return 0;
  const registradas = Number.isFinite(horasRegistradasContador) ? Math.max(0, horasRegistradasContador) : 0;
  return (registradas / horasProgramadas) * 100;
}

export default function ResolutorDetalleModal({ open, resolutor, range, onClose }: ResolutorDetalleModalProps) {
  const disponibilidadTeams = useDisponibilidadTeams({ correo: resolutor?.correo, range });

  if (!open || !resolutor) return null;

  const horasContador = resolutor.minutosTotales / 60;
  const porcentajeDisponibilidad = calcularPorcentajeDisponibilidad(disponibilidadTeams.horasProgramadas, horasContador);

  return (
    <div className="rdm-overlay" role="dialog" aria-modal="true" aria-label={`Detalle de ${resolutor.nombre}`}>
      <div className="rdm-card">
        <header className="rdm-head">
          <div>
            <span className="rdm-eyebrow">Detalle del resolutor</span>
            <h3 className="rdm-title">{resolutor.nombre}</h3>
            {resolutor.correo && <p className="rdm-subtitle">{resolutor.correo}</p>}
          </div>
          <button type="button" className="rdm-close" onClick={onClose} aria-label="Cerrar">x</button>
        </header>

        <div className="rdm-body">
          <div className="rdm-top">
            <ResolutorInfoCard
              className="rdm-metricCard"
              nombre={resolutor.nombre}
              minutos={{
                total: resolutor.minutosTotales / 60,
                normal: resolutor.minutosNormales / 60,
                nocturno: resolutor.minutosNocturnos / 60,
                dominical_festivo: (resolutor.minutosDominicales + resolutor.minutosFestivos) / 60,
                nocturno_dominical_festivo: resolutor.minutos_nocturno_dominical_festivo / 60,
              }}
            />

            <section className="rdm-dispoCard">
              <div className="rdm-dispoCard__head">
                <span className="rdm-eyebrow">Disponibilidad</span>
                <h4>Cobertura del contador</h4>
              </div>
              <div className="rdm-dispoCard__metric">
                <span className="rdm-dispoCard__value">{formatPercent(porcentajeDisponibilidad)}</span>
                <span className="rdm-dispoCard__label">disponibilidad</span>
              </div>
              <div className="rdm-dispoCard__bar">
                <div className="rdm-dispoCard__barFill" style={{ width: `${Math.min(100, Math.max(0, porcentajeDisponibilidad))}%` }} />
              </div>
              <p className="rdm-dispoCard__hint">
                {formatHours(horasContador)} registradas por el contador
                {disponibilidadTeams.loading
                  ? " (cargando turnos de Teams)"
                  : ` de ${formatHours(disponibilidadTeams.horasProgramadas)} programadas en Teams`}
              </p>
              {disponibilidadTeams.error && <p className="rdm-dispoCard__hint">{disponibilidadTeams.error}</p>}
            </section>
          </div>

          <div className="rdm-columns">
            <section className="rdm-section">
              <div className="rdm-section__head">
                <h4>Estado de contadores</h4>
                <span>{resolutor.totalTickets.toLocaleString("es-CO")} en total</span>
              </div>
              <div className="hint">Activas: {resolutor.sesionesActivas.toLocaleString("es-CO")}</div>
              <div className="hint">Pausadas: {resolutor.sesionesPausadas.toLocaleString("es-CO")}</div>
              <div className="hint">Finalizadas: {resolutor.sesionesFinalizadas.toLocaleString("es-CO")}</div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
