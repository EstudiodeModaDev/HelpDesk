import React from "react";
import { useAuth } from "../../../auth/authContext";
import { useRepositories } from "../../../repositories/repositoriesContext";
import type { Session } from "./useCounter";
import { supabase } from "../../../Services/Supabase.service";

interface SupabaseResolutor {
  resolutor_id: string;
  auth_user_id: string;
  resolutor_nombre: string;
  resolutor_correo: string;
  resolutor_estado: string;
  resolutor_activo: boolean;
  sharepoint_id: number;
}

export function useSendHeartBeat() {
  const { account } = useAuth();
  const { usuarios } = useRepositories();

  const getActualResolutor = React.useCallback(async (): Promise<SupabaseResolutor | null> => {
    if (!account?.username) {
      throw new Error("No se ha detectado una cuenta activa");
    }

    if (!usuarios) {
      throw new Error("El repositorio de usuarios no esta disponible");
    }

    const actualResolutor = await usuarios.getByEmail(account.username);

    if (!actualResolutor?.data) {
      throw new Error("No se encontro el usuario actual");
    }

    const { data, error } = await supabase
      .from("TBL_Resolutor_Solvi")
      .select("*")
      .eq("sharepoint_id", Number(actualResolutor.data.Id))
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }


    return data as SupabaseResolutor | null;
  }, [account?.username, usuarios]);

  const getResolutorSessions = React.useCallback(
    async (resolutor: SupabaseResolutor): Promise<Session[]> => {
      const { data, error } = await supabase
        .from("TBL_Sesion_Trabajo_Solvi")
        .select("*")
        .eq("resolutor_id", resolutor.resolutor_id)
        .eq("estado", "activa");

      if (error) {
        throw new Error(error.message);
      }


      return (data ?? []) as Session[];
    },
    []
  );

  const sendHeartBeat = React.useCallback(
    async (sesiones: Session[]): Promise<void> => {
      if (sesiones.length === 0) {
        return;
      }

      const ultimoLatido = new Date().toISOString();

      const heartbeats = sesiones.map((sesion) => ({
        sesion_id: sesion.sesion_id,
        ultimo_latido: ultimoLatido,
      }));

      const { error } = await supabase
        .from("TBL_HeartbeatSesion_Solvi")
        .upsert(heartbeats, {
          onConflict: "sesion_id",
        });

      if (error) {
        throw new Error(error.message);
      }
    },
    []
  );

  const heartBeatControl = React.useCallback(async (): Promise<void> => {

    const resolutor = await getActualResolutor();

    if (!resolutor) {
      return;
    }

    const sesiones = await getResolutorSessions(resolutor);

    if (sesiones.length === 0) {
      return;
    }

    await sendHeartBeat(sesiones);
  }, [getActualResolutor, getResolutorSessions, sendHeartBeat]);

  return {
    heartBeatControl,
  };
}
