import React from "react";
import { supabase } from "../../../Services/Supabase.service";
import toast from "react-hot-toast";
import type { Ticket } from "../../../Models/Tickets";
import { useRepositories } from "../../../repositories/repositoriesContext";
import type { AccountInfo } from "@azure/msal-browser";
import type { GetSessionsResponse } from "./useGetSessions";

type stopCounterProps = {
  p_sesion_id: string;
  p_resolutor_id: number;
};

export type CodigoInicioContadorError =
  | "RESOLUTOR_NO_ENCONTRADO"
  | "SESION_NO_ENCONTRADA"
  | "SESION_NO_PERTENECE_AL_RESOLUTOR"
  | "SESION_SIN_INICIO_ACTIVO"

export interface SesionContador {
  sesion_id: string;
  ticket_id: number;
  estado: "activa";
  inicio: string;
}

export interface DetenerContadorSuccess {
  ok: true;
  codigo: "CONTADOR_DETENIDO";
  mensaje: string;
  sesion: SesionContador;
}

export interface DetenerContadorError {
  ok: false;
  codigo: CodigoInicioContadorError;
  mensaje: string;

  // Solo aparecen en TICKET_NO_ASIGNADO
  ticket_resolutor?: string | null;
  resolutor_correo?: string;
}

export type DetenerContadorResponse =
  | DetenerContadorSuccess
  | DetenerContadorError;

export function useStopCounter() {
  const {usuarios} = useRepositories()
  const [loading, setLoading] = React.useState<boolean>(false);

  const stopCounter = async ({ p_sesion_id, p_resolutor_id }: stopCounterProps): Promise<DetenerContadorResponse | null> => {
    if(!p_sesion_id || !p_resolutor_id) {
      toast.error("Sesion o resolutor no encontrado");
      return null;
    }
    
    setLoading(true);
    try{
      const { data, error } = await supabase.rpc("fn_detener_contador", {
        p_sesion_id: p_sesion_id,
        p_resolutor_id: p_resolutor_id,
      }) as { data: DetenerContadorResponse | null; error: any };

      if(error) {
        toast.error("Error al detener el contador: " + error.message);
        return null
      }

      return data;
    } catch (error) {
      toast.error("Error al detener el contador: " + (error as Error).message);
      return null;
    } finally {
      setLoading(false);
    }
    
  }

  const stopFinishedTicketCounter = async(
    ticket: Ticket, 
    accountInfo: AccountInfo,
    getTicketSessions: (p_ticketId: number) => Promise<GetSessionsResponse | null>
  ): Promise<{ok: Boolean, message?: string}>  => {
    const resolutorId = (await usuarios?.getByEmail(accountInfo.username ?? ""))?.data
    const sessions = await getTicketSessions(Number(ticket.ID ?? 0))
    let sessionUnica
    if(!sessions?.ok){
      return{
        ok: false,
        message: "No se pudieron obtener las sesiones del ticket"
      }
    }

    if(sessions.sesiones.length > 0){
      sessionUnica = sessions.sesiones[0].sesion_id
    } else {
      return{
        ok: true
      }
    }

    if(!resolutorId?.Id){
      return{
        message: "Resolutor no encontrado",
        ok: false
      }
    }

    try{
      await stopCounter({p_resolutor_id: Number(resolutorId.Id), p_sesion_id: sessionUnica})
      return {
        ok: true
      }
    } catch(e: any){
      throw new Error(e.message ?? "Algo ha salido mal deteniendo el contador")
    }    
  }

  return {
    loading, stopCounter, stopFinishedTicketCounter
  }
}