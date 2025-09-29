// src/hooks/useUserRoleFromSP.ts
import * as React from "react";
import { useGraphServices } from "../graph/GrapServicesContext";

export function useUserRoleFromSP(email?: string | null) {
  const { Usuarios } = useGraphServices(); // ajusta el nombre si tu service se llama distinto
  const [role, setRole] = React.useState<string>("usuario");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancel = false;
    (async () => {
      console.log("email", email)
      if (!email) { setRole("usuario"); return; }

      setLoading(true); setError(null);
      try {
        // IMPORTANTE: normaliza y escapa comillas
        const safe = String(email).toLowerCase().replace(/'/g, "''");
        const resp = await Usuarios.getAll({
          filter: `fields/Correo eq '${safe}'`,  
          top: 1,
        });

        const items = Array.isArray(resp) ? resp : resp?.items ?? [];
        const rolSP = items?.[0]?.Rol as string | undefined;
        console.log("Rol normalizado", rolSP)
        if (!cancel) {
          setRole(rolSP ?? "No encontrado");
        }
      } catch (e: any) {
        if (!cancel) setError(e?.message ?? "No se pudo obtener el rol");
        if (!cancel) setRole("usuario");
      } finally {
        if (!cancel) setLoading(false);
      }
    })();
    return () => { cancel = true; };
  }, [email, Usuarios]);

  return { role, loading, error };
}

export function useIsAdmin(email?: string | null) {
  const { Usuarios } = useGraphServices(); // tu service
  const [isAdmin, setIsAdmin] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancel = false;

    (async () => {
      if (!email) { setIsAdmin(false); return; }

      try {
        setLoading(true); setError(null);

        const safe = String(email).toLowerCase().replace(/'/g, "''");
        const resp = await Usuarios.getAll({
          filter: `fields/Correo eq '${safe}'`,  
          top: 1,
        });

        const items = Array.isArray(resp) ? resp : resp?.items ?? [];
        const rolRaw =
          items?.[0]?.fields?.Rol ??
          items?.[0]?.Rol ??
          "";

        const rol = String(rolRaw).trim().toLowerCase();
        const admin =
          rol === "administrador";

        if (!cancel) setIsAdmin(admin);
      } catch (e: any) {
        if (!cancel) { setIsAdmin(false); setError(e?.message ?? "Error leyendo rol"); }
      } finally {
        if (!cancel) setLoading(false);
      }
    })();

    return () => { cancel = true; };
  }, [email, Usuarios]);

  return { isAdmin, loading, error };
}