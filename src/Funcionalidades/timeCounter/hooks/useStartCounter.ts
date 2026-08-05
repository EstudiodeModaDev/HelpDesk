import React from "react";
import { supabase } from "../../../Services/Supabase.service";
import toast from "react-hot-toast";

type startCounterProps = {
  p_ticket_id: number;
  p_resolutor_id: number;
};

export type CodigoInicioContadorError =
  | "RESOLUTOR_NO_ENCONTRADO"
  | "TICKET_NO_ENCONTRADO"
  | "TICKET_NO_ES_DISPONIBILIDAD"
  | "TICKET_CERRADO"
  | "TICKET_NO_ASIGNADO"
  | "YA_TIENE_CONTADOR_EN_CURSO";

export interface SesionContador {
  sesion_id: string;
  ticket_id: number;
  estado: "activa";
  inicio: string;
  disponibilidad_id: string | null;
}

export interface ResolutorContador {
  id: string;
  identificador: number;
  nombre: string;
  correo: string;
}

export interface IniciarContadorSuccess {
  ok: true;
  codigo: "CONTADOR_INICIADO";
  mensaje: string;
  sesion: SesionContador;
  resolutor: ResolutorContador;
}

export interface IniciarContadorError {
  ok: false;
  codigo: CodigoInicioContadorError;
  mensaje: string;

  // Solo aparecen en TICKET_NO_ASIGNADO
  ticket_resolutor?: string | null;
  resolutor_correo?: string;
}

export type IniciarContadorResponse =
  | IniciarContadorSuccess
  | IniciarContadorError;

export function useStartCounter() {
  const [loading, setLoading] = React.useState<boolean>(false);

  const startCounter = async ({ p_ticket_id, p_resolutor_id }: startCounterProps): Promise<IniciarContadorResponse | null> => {
    if(!p_ticket_id || !p_resolutor_id) {
      toast.error("Ticket o resolutor no encontrado");
      return null;
    }
    
    setLoading(true);
    try{
      const { data, error } = await supabase.rpc("fn_iniciar_contador", {
        p_ticket_id: p_ticket_id,
        p_resolutor_id: p_resolutor_id,
      }) as { data: IniciarContadorResponse | null; error: any };

      if(error) {
        toast.error("Error al iniciar el contador: " + error.message);
        return null
      }

      if (data?.ok) {
        toast.success(data.mensaje || "Contador iniciado correctamente");
      }

      return data;
    } catch (error) {
      toast.error("Error al iniciar el contador: " + (error as Error).message);
      return null;
    } finally {
      setLoading(false);
    }
    
  }

  const resumeCounter = async ( session: string, resolutor_id: string): Promise<IniciarContadorResponse | null> => {
    if(!session || !resolutor_id) {
      toast.error("Ticket o resolutor no encontrado");
      return null;
    }
    
    setLoading(true);
    try{

      const { data, error } = await supabase.rpc("fn_reanudar_contador", {
        p_sesion_id: session,
        p_resolutor_id: resolutor_id,
      }) as { data: IniciarContadorResponse | null; error: any };


      if(error) {
        toast.error("Error al reanudar el contador: " + error.message);
        return null
      }

      if (data?.ok) {
        toast.success(data.mensaje || "Contador reanudado correctamente");
      }

      return data;
    } catch (error) {
      toast.error("Error al reanudar el contador: " + (error as Error).message);
      return null;
    } finally {
      setLoading(false);
    }
    
  }

  return {
    loading, startCounter, resumeCounter
  }
}
