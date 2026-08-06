import * as React from "react";
import "./ResolutorInfoCard.css";

export type ResolutorMinutos = {
  total: number;
  normal: number;
  nocturno: number;
  dominical_festivo: number;
  nocturno_dominical_festivo: number;
};

export type ResolutorInfoCardProps = {
  nombre: string;
  minutos: ResolutorMinutos;
  className?: string;
  onClick?: () => void;
};

function formatMinutos(value: number): string {
  const safeValue = Number.isFinite(value) ? Math.max(0, value) : 0;
  return safeValue.toLocaleString("es-CO");
}

function getIniciales(nombre: string): string {
  const palabras = nombre.trim().split(/\s+/).filter(Boolean);

  if (palabras.length === 0) return "?";

  const primera = palabras[0]?.[0] ?? "";
  const segunda = palabras.length > 1 ? palabras[1]?.[0] ?? "" : "";

  return (primera + segunda).toUpperCase();
}

export default function ResolutorInfoCard({ nombre, minutos, className = "", onClick }: ResolutorInfoCardProps) {
  const stats = [
    { label: "Horas normales", value: minutos.normal },
    { label: "Horas nocturnos", value: minutos.nocturno },
    { label: "Horas dominicales/festivos", value: minutos.dominical_festivo },
    { label: "Horas nocturnos dominicales/festivos", value: minutos.nocturno_dominical_festivo },
  ];

  const interactiveProps = onClick
    ? {
        role: "button" as const,
        tabIndex: 0,
        onClick,
        onKeyDown: (e: React.KeyboardEvent) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onClick();
          }
        },
      }
    : {};

  return (
    <article className={`ric-card ${onClick ? "ric-card--clickable" : ""} ${className}`.trim()} {...interactiveProps}>
      <header className="ric-header">
        <div className="ric-avatar" aria-hidden="true">{getIniciales(nombre)}</div>
        <div className="ric-header__text">
          <span className="ric-eyebrow">Resolutor</span>
          <h3 className="ric-nombre" title={nombre}>{nombre}</h3>
        </div>
      </header>

      <div className="ric-total">
        <span className="ric-total__value">{formatMinutos(minutos.total)}</span>
        <span className="ric-total__label">Horas totales</span>
      </div>

      <ul className="ric-stats">
        {stats.map((stat) => (
          <li key={stat.label} className="ric-stat">
            <span className="ric-stat__value">{formatMinutos(stat.value)} Horas</span>
            <span className="ric-stat__label">{stat.label}</span>
          </li>
        ))}
      </ul>
    </article>
  );
}
