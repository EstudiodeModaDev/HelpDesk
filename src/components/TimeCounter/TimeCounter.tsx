import React from "react";
import toast from "react-hot-toast";

import "./TimeCounter.css";

import { useContador } from "../../Funcionalidades/timeCounter/hooks/useCounter";
import type { Sesiones } from "../../Funcionalidades/timeCounter/hooks/useGetSessions";
import { useAuth } from "../../auth/authContext";
import { useGraphServices } from "../../graph/GrapServicesContext";
import type { Ticket } from "../../Models/Tickets";

type TimeCounterProps = {
  title?: string;
  subtitle?: string;
  initialSeconds?: number;
  autoStart?: boolean;
  className?: string;
  ticket?: Ticket;
  resolutorId?: number;
};

type ActiveSession = {
  sesion_id: string;
  estado: string;
};

function formatTime(totalSeconds: number): string {
  const safeSeconds = Math.max(0, Math.floor(totalSeconds));

  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const seconds = safeSeconds % 60;

  return [hours, minutes, seconds]
    .map((value) => String(value).padStart(2, "0"))
    .join(":");
}

function parseSessionDate(value?: string | null): Date | null {
  if (!value) return null;

  const parsedDate = new Date(value);

  return Number.isNaN(parsedDate.getTime()) ? null : parsedDate;
}

function getSessionStoredSeconds(session: Sesiones): number {
  const totalMinutes = Number(session.minutos.total);

  if (Number.isFinite(totalMinutes) && totalMinutes >= 0) {
    return Math.round(totalMinutes * 60);
  }

  const storedMinutes = [
    session.minutos.normal,
    session.minutos.nocturno,
    session.minutos.dominical_festivo,
    session.minutos.nocturno_dominical_festivo,
  ]
    .map(Number)
    .reduce((accumulated, value) => {
      if (!Number.isFinite(value) || value <= 0) {
        return accumulated;
      }

      return accumulated + value;
    }, 0);

  return Math.round(storedMinutes * 60);
}

function getActiveStartTimestamp(session: Sesiones): number | null {
  const activeStart =
    parseSessionDate(session.ultimo_inicio) ??
    parseSessionDate(session.inicio);

  return activeStart?.getTime() ?? null;
}

export default function TimeCounter({subtitle = "Cronometra una sesión activa.", initialSeconds = 0, autoStart = false, className = "", ticket,}: TimeCounterProps) {
  const controller = useContador();
  const { Usuarios } = useGraphServices();
  const auth = useAuth();

  const [seconds, setSeconds] = React.useState(initialSeconds);
  const [isRunning, setIsRunning] = React.useState(autoStart);
  const [activeSession, setActiveSession] = React.useState<ActiveSession | null>(null);

  const baseSecondsRef = React.useRef(initialSeconds);
  const activeStartRef = React.useRef<number | null>(null);

  const canInteractuar = activeSession?.estado.toLowerCase() !== "detenida" || ticket?.Estadodesolicitud?.toLocaleLowerCase().includes("cerrado");

  /**
   * Reinicia el estado local cuando no existe una sesión válida.
   */
  const resetCounter = React.useCallback(() => {
    baseSecondsRef.current = initialSeconds;
    activeStartRef.current = null;

    setActiveSession(null);
    setIsRunning(false);
    setSeconds(initialSeconds);
  }, [initialSeconds]);

  const syncTicketSession = React.useCallback(async () => {
    if (!ticket?.ID) {
      resetCounter();
      return null;
    }

    try {
      const result = await controller.getTicketSessions(Number(ticket.ID));

      if (!result?.ok) {
        resetCounter();
        return null;
      }

      if (result.sesiones.length > 1) {
        toast.error(
          "Este ticket tiene más de una sesión registrada.",
        );
      }

      const lastSession = result.sesiones.at(-1) ?? null;

      if (!lastSession) {
        resetCounter();
        return null;
      }

      const storedSeconds = getSessionStoredSeconds(lastSession);

      const running = lastSession.estado.toLowerCase() === "activa";

      baseSecondsRef.current = storedSeconds;

      setActiveSession({
        sesion_id: lastSession.sesion_id,
        estado: lastSession.estado,
      });

      if (!running) {
        activeStartRef.current = null;

        setSeconds(storedSeconds);
        setIsRunning(false);

        return lastSession;
      }

      const activeStartTimestamp = getActiveStartTimestamp(lastSession) ?? Date.now();

      activeStartRef.current = activeStartTimestamp;

      const elapsedSeconds = Math.max(
        0,
        Math.floor(
          (Date.now() - activeStartTimestamp) / 1000,
        ),
      );

      setSeconds(storedSeconds + elapsedSeconds);
      setIsRunning(true);

      return lastSession;
    } catch (error) {
      console.error(
        "Error sincronizando la sesión del ticket:",
        error,
      );

      toast.error("No se pudo sincronizar la sesión del contador.",);

      resetCounter();
      return null;
    }
  }, [controller, resetCounter, ticket]);

  /**
   * Carga la sesión cuando se monta el componente
   * o cuando cambia el ticket.
   */
  React.useEffect(() => {
    void syncTicketSession();
  }, [ticket]);

  /**
   * Actualiza el contador visual.
   *
   * No incrementa segundos manualmente. Calcula la diferencia
   * entre la fecha actual y la fecha de inicio del tramo.
   *
   * De esta manera, aunque el navegador retrase el setInterval,
   * el tiempo mostrado continúa siendo correcto.
   */
  React.useEffect(() => {
    if (!isRunning || activeStartRef.current === null) {
      return;
    }

    const updateCounter = () => {
      if (activeStartRef.current === null) {
        return;
      }

      const elapsedSeconds = Math.max(
        0,
        Math.floor((Date.now() - activeStartRef.current) / 1000,),
      );

      setSeconds(baseSecondsRef.current + elapsedSeconds,);
    };

    updateCounter();

    const intervalId = window.setInterval(updateCounter, 1000,);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [isRunning]);

  /**
   * Obtiene el ID de SharePoint del resolutor autenticado.
   */
  const getResolutorId = React.useCallback(async () => {
    const userEmail = auth.account?.username;

    if (!userEmail) {
      return null;
    }

    try {
      const safeEmail = userEmail.replace(/'/g, "''");

      const rows = await Usuarios.getAll({filter: `fields/Correo eq '${safeEmail}'`,});

      const resolutorId = Number(rows?.[0]?.Id);

      return Number.isFinite(resolutorId) && resolutorId > 0 ? resolutorId : null;
    } catch (error) {
      console.error("Error obteniendo el resolutor:", error,);

      return null;
    }
  }, [Usuarios, auth.account?.username]);

  /**
   * Inicia una sesión nueva o reanuda una sesión existente.
   */
  const handleStart = async () => {
    if (controller.isBusy ) {
      toast.error("No se ha podido iniciar el contador, porque hay algo en proceso")
      return;
    }

    if (isRunning) {
      toast.error("Contador ya iniciado")
      return;
    }
    if (!ticket?.ID) {
      toast.error("No se ha podido iniciar el contador, porque no se encontro el ticket")
      return;
    }

    const currentResolutorId = await getResolutorId();

    if (!currentResolutorId) {
      toast.error("No se encontró el resolutor actual.",);
      return;
    }

    try {
      const lastSessionResult = await controller.hasAnySession(Number(ticket.ID));

      /*
       * Si el ticket ya tiene una sesión, se reanuda.
       */
      if (lastSessionResult.exists && lastSessionResult.data?.sesion_id) {
        const resumed = await controller.resumeCounter(lastSessionResult.data.sesion_id, String(currentResolutorId),);

        if (!resumed?.ok) {
          toast.error(resumed?.mensaje ?? "Error al reanudar el contador.",);
          return;
        }

        await syncTicketSession();
        return;
      }

      /*
       * Si no existe una sesión, se crea una nueva.
       */
      const started =
        await controller.startCounter({
          p_ticket_id: Number(ticket.ID),
          p_resolutor_id: currentResolutorId,
        });

      if (!started?.ok) {
        toast.error(
          started?.mensaje ??
            "Error al iniciar el contador.",
        );
        return;
      }

      const startedAt =
        parseSessionDate(started.sesion.inicio)
          ?.getTime() ?? Date.now();

      baseSecondsRef.current = 0;
      activeStartRef.current = startedAt;

      setActiveSession({
        sesion_id: started.sesion.sesion_id,
        estado: started.sesion.estado,
      });

      setSeconds(0);
      setIsRunning(true);
    } catch (error) {
      console.error(
        "Error iniciando o reanudando el contador:",
        error,
      );

      toast.error(
        "Ocurrió un error al iniciar el contador.",
      );
    }
  };

  /**
   * Pausa la sesión activa.
   */
  const handlePause = async () => {
    if (controller.isBusy || !isRunning) {
      return;
    }

    if (!activeSession?.sesion_id) {
      toast.error("No hay una sesión activa para pausar.",);
      return;
    }

    const currentResolutorId = await getResolutorId();

    if (!currentResolutorId) {
      toast.error("No se encontró el resolutor actual.",);
      return;
    }

    try {
      const paused = await controller.pauseCounter({p_sesion_id: activeSession.sesion_id, p_resolutor_id: currentResolutorId,});

      if (!paused?.ok) {
        toast.error(paused?.mensaje ?? "Error al pausar el contador.",);
        return;
      }

      await syncTicketSession();
    } catch (error) {
      console.error("Error pausando el contador:", error,);

      toast.error("Ocurrió un error al pausar el contador.",);
    }
  };

  const canStart = !controller.isBusy && !isRunning && Boolean(ticket?.ID);

  const canPause = !controller.isBusy && isRunning && Boolean(activeSession?.sesion_id);

  return (
    <section className={`time-counter-widget ${className}`.trim()}>
      <div className="time-counter">
        <div className="time-counter__content">
          <div className="time-counter__copy">
            <p className="time-counter__subtitle">
              {subtitle}
            </p>
          </div>

          <div className="time-counter__display" aria-live="polite" aria-atomic="true">
            {formatTime(seconds)}
          </div>

          {canInteractuar && (
            <div className="time-counter__actions">
              <button type="button" className="btn btn-primary-final btn-xs" onClick={handleStart} disabled={!canStart}>
                {controller.isStarting ? "Iniciando..." : "Iniciar"}
              </button>

              <button type="button" className="btn btn-secondary-final btn-xs" onClick={handlePause} disabled={!canPause}>
                {controller.isPausing ? "Pausando..." : "Pausar"}
              </button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}