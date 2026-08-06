import React from "react";
import { supabase } from "../../../Services/Supabase.service";
import toast from "react-hot-toast";

export type CodigoInicioContadorError =
| "TICKET_NO_ENCONTRADO"


type minutos = {
  normal: number;
  nocturno: number;
  dominical_festivo: number ;
  nocturno_dominical_festivo: number;
  total: number;
}

export interface Sesiones {
  sesion_id: string;
  ticket_id: number;
  estado: string;
  inicio: string;
  ultimo_inicio: string;
  fin: string;
  minutos: minutos
}

export interface GetSessionSuccess {
  ok: true;
  codigo: "CONTADOR_PAUSADO";
  sesiones: Sesiones[];
}

export interface GetSessionsError {
  ok: false;
  codigo: CodigoInicioContadorError;
  mensaje: string;
}

export type GetSessionsResponse =
  | GetSessionSuccess
  | GetSessionsError;

export function useGetSessions() {
  const [loading, setLoading] = React.useState<boolean>(false);

  const getTicketSessions = async (p_ticketId: number): Promise<GetSessionsResponse | null> => {
    if(!p_ticketId) {
      toast.error("Sesion no encontrada");
      return null;
    }
    
    setLoading(true);
    try{
      const { data, error } = await supabase.rpc("fn_obtener_sesiones_ticket", {
        p_ticket_id: p_ticketId,
      }) as { data: GetSessionsResponse | null; error: any };

      if(error) {
        toast.error("Error al obtener las sesiones del ticket: " + error.message);
        return null
      }

      return data;
    } catch (error) {
      toast.error("Error al pausar el contador: " + (error as Error).message);
      return null;
    } finally {
      setLoading(false);
    }
    
  }

  const getResolutorSessions = async (p_resolutor_id: number): Promise<GetSessionsResponse | null> => {
    if(!p_resolutor_id) {
      toast.error("Resolutor no encontrado");
      return null;
    }
    
    setLoading(true);
    try{
      const { data, error } = await supabase.rpc("fn_obtener_sesiones_resolutor", {
        p_resolutor_id: p_resolutor_id,
      }) as { data: GetSessionsResponse | null; error: any };

      if(error) {
        toast.error("Error al obtener las sesiones del resolutor: " + error.message);
        return null
      }

      return data;
    } catch (error) {
      toast.error("Error al obtener las sesiones del resolutor: " + (error as Error).message);
      return null;
    } finally {
      setLoading(false);
    }
    
  }

  const hasAnySession = async (
    p_ticketId: number
  ): Promise<{ exists: boolean; data: any }> => {
    const { data, error } = await supabase
      .from("TBL_Sesion_Trabajo_Solvi")
      .select("*")
      .eq("ticket_id", p_ticketId)
      .maybeSingle();

    if (error) {
      throw error;
    }

    return {
      exists: data !== null,
      data,
    };
  };

  return {
    loading, getTicketSessions, getResolutorSessions, hasAnySession
  }
}