import React from "react";
import "./TimeCounter.css";
import { useContador } from "../../Funcionalidades/timeCounter/hooks/useCounter";
import { useAuth } from "../../auth/authContext";
import { useGraphServices } from "../../graph/GrapServicesContext";
import toast from "react-hot-toast";

type TimeCounterProps = {
  title?: string;
  subtitle?: string;
  initialSeconds?: number;
  autoStart?: boolean;
  className?: string;
  ticketId?: number;
  resolutorId?: number;
};

type ActiveSession = {
  sesion_id: string;
};

function formatTime(totalSeconds: number) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return [hours, minutes, seconds].map((value) => String(value).padStart(2, "0")).join(":");
}

export default function TimeCounter({
  subtitle = "Cronometra una sesión activa.",
  initialSeconds = 0,
  autoStart = false,
  className = "",
  ticketId,
}: TimeCounterProps) {
  const controller = useContador();
  const { Usuarios } = useGraphServices();
  const [seconds, setSeconds] = React.useState(initialSeconds);
  const [isRunning, setIsRunning] = React.useState(autoStart);
  const [activeSession, setActiveSession] = React.useState<ActiveSession | null>(null);
  const auth = useAuth();

  React.useEffect(() => {
    setSeconds(initialSeconds);
  }, [initialSeconds]);

  React.useEffect(() => {
    if (!isRunning) return;

    const interval = window.setInterval(() => {
      setSeconds((current) => current + 1);
    }, 1000);

    return () => window.clearInterval(interval);
  }, [isRunning]);

  React.useEffect(() => {
    const loadActiveSession = async () => {
      if (!ticketId) {
        setActiveSession(null);
        return;
      }

      const result = await controller.getTicketSessions(ticketId);
      if (!result?.ok) {
        setActiveSession(null);
        return;
      }

      const lastSession = result.sesiones.at(-1) ?? null;
      setActiveSession(lastSession ? { sesion_id: lastSession.sesion_id, } : null);
      setIsRunning(lastSession?.estado === "activa");
    };

    void loadActiveSession();
  }, [ticketId]);

  const getResolutorId = React.useCallback(async () => {
    const rows = await Usuarios.getAll({ filter: `fields/Correo eq '${auth.account?.username}'` });
    const id = Number(rows?.[0]?.Id);
    return Number.isFinite(id) && id > 0 ? id : null;
  }, [Usuarios, auth.account?.username]);

  const handleStart = async () => {
    if (controller.isBusy || isRunning) {

      return;
    };
    if (!ticketId) return;

    const currentResolutorId = await getResolutorId();
    if (!currentResolutorId) {
      toast.error("No se encontró el resolutor actual.");
      return;
    }

    const lastSessionResult = await controller.hasAnySession(ticketId);
    if (lastSessionResult.exists) {
      await controller.resumeCounter(lastSessionResult.data.sesion_id, String(currentResolutorId));
      return
    }

    const started = await controller.startCounter({
      p_ticket_id: ticketId,
      p_resolutor_id: currentResolutorId,
    });

    if (!started?.ok) {
      toast.error(started?.mensaje ?? "Error al iniciar el contador");
      return;
    }

    setActiveSession({
      sesion_id: started.sesion.sesion_id,
    });
    setIsRunning(true);
  };

  const handlePause = async () => {
    if (controller.isBusy || !isRunning) return;

    const currentResolutorId = await getResolutorId();
    if (!currentResolutorId) {
      toast.error("No se encontró el resolutor actual.");
      return;
    }

    if (!activeSession?.sesion_id) {
      toast.error("No hay una sesión activa para pausar.");
      return;
    }

    const paused = await controller.pauseCounter({
      p_sesion_id: activeSession.sesion_id,
      p_resolutor_id: currentResolutorId,
    });

    if (!paused?.ok) {
      toast.error(paused?.mensaje ?? "Error al pausar el contador");
      return;
    }

    setActiveSession((current) => (current ? { ...current, } : current));
    setIsRunning(false);
  };

  const canStart = !controller.isBusy && !isRunning;
  const canPause = !controller.isBusy && isRunning;

  return (
    <section className={`time-counter-widget ${className}`.trim()}>
      <div
        className="time-counter"
      >
        <div className="time-counter__content">
          <div className="time-counter__copy">
            <p className="time-counter__subtitle">{subtitle}</p>
          </div>

          <div className="time-counter__display" aria-live="polite" aria-atomic="true">
            {formatTime(seconds)}
          </div>

          <div className="time-counter__actions">
            <button type="button" className="btn btn-primary-final btn-xs" onClick={handleStart} disabled={!canStart}>
              {controller.isStarting ? "Iniciando..." : "Iniciar"}
            </button>

            <button type="button" className="btn btn-secondary-final btn-xs" onClick={handlePause} disabled={!canPause}>
              {controller.isPausing ? "Pausando..." : "Pausar"}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
