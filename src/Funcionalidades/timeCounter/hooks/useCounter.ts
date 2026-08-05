import { useGetSessions } from "./useGetSessions";
import { usePauseCounter } from "./usePauseCounter";
import { useStartCounter } from "./useStartCounter";
import { useStopCounter } from "./useStopCounter";

export type Session = {
  sesion_id: string;
  ticket_id: number;
  resolutor_id: string
  disponibilidad_id: string,
  estado: string,
  inicio: Date
  fin: Date
  minutos_normal: number,
  minutos_nocturno: number,
  minutos_dominical_festivo: number,
  minutos_nocturno_dominical_festivo: number,
  minutos_totales: number,
}


export function useContador() {
  const { loading: isPausing, pauseCounter } = usePauseCounter();
  const { loading: isStopping, stopCounter } = useStopCounter();
  const { loading: isStarting, startCounter, resumeCounter } = useStartCounter();
  const {loading: isGettingSessions, getTicketSessions, getResolutorSessions, hasAnySession} = useGetSessions();

  return {
    startCounter,
    resumeCounter,
    pauseCounter,
    stopCounter,
    isStarting,
    isPausing,
    isStopping,
    isBusy: isStarting || isPausing || isStopping,
    getTicketSessions,
    getResolutorSessions,
    isGettingSessions,
    hasAnySession
  };
}
