import React from "react";
import { supabase } from "../../../Services/Supabase.service";
import toast from "react-hot-toast";

type pauseCounterProps = {
  p_sesion_id: string;
  p_resolutor_id: number;
};

  export type CodigoInicioContadorError =
  | "RESOLUTOR_NO_ENCONTRADO"
  | "SESION_NO_ENCONTRADA"
  | "SESION_NO_PERTENECE_AL_RESOLUTOR"
  | "CONTADOR_YA_PAUSADO"
  | "ESTADO_NO_VALIDO"
  | "SESION_SIN_INICIO_ACTIVO";

export interface SesionContador {
  sesion_id: string;
  ticket_id: number;
  estado: "activa";
}

export interface PausarContadorSuccess {
  ok: true;
  codigo: "CONTADOR_PAUSADO";
  mensaje: string;
  sesion: SesionContador;
}

export interface IniciarContadorError {
  ok: false;
  codigo: CodigoInicioContadorError;
  mensaje: string;
}

export type IniciarContadorResponse =
  | PausarContadorSuccess
  | IniciarContadorError;

export function usePauseCounter() {
  const [loading, setLoading] = React.useState<boolean>(false);

  const pauseCounter = async ({ p_sesion_id, p_resolutor_id }: pauseCounterProps): Promise<IniciarContadorResponse | null> => {    
    setLoading(true);
    try{
      const { data, error } = await supabase.rpc("fn_pausar_contador", {
        p_sesion_id: p_sesion_id,
        p_resolutor_id: p_resolutor_id,
      }) as { data: IniciarContadorResponse | null; error: any };

      if(error) {
        toast.error("Error al pausar el contador: " + error.message);
        return null
      }

      if (data?.ok) {
        toast.success(data.mensaje || "Contador pausado correctamente");
      }

      return data;
    } catch (error) {
      toast.error("Error al pausar el contador: " + (error as Error).message);
      return null;
    } finally {
      setLoading(false);
    }
    
  }

  return {
    loading, pauseCounter, 
  }
}
