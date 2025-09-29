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

      const cacheKey = `role:${email.toLowerCase()}`;
      const cached = sessionStorage.getItem(cacheKey);
      if (cached) { setRole(cached ); return; }

      setLoading(true); setError(null);
      try {
        // IMPORTANTE: normaliza y escapa comillas
        const safe = String(email).toLowerCase().replace(/'/g, "''");
        const resp = await Usuarios.getAll({
          filter: `fields/Correo eq '${safe}'`,  
          top: 1,
        });
        console.log("Rol encontrado", resp)

        const items = Array.isArray(resp) ? resp : resp?.items ?? [];
        const rolSP = items?.[0]?.fields?.Rol as string | undefined;
        console.log("Rol normalizado", rolSP)
        if (!cancel) {
          setRole(rolSP ?? "No encontrado");
          sessionStorage.setItem(cacheKey, rolSP ?? "No encontrado");
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
