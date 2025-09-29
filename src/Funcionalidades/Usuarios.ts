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

        const items = Array.isArray(resp) ? resp : resp?.items ?? [];
        const rolSP = items?.[0]?.fields?.Rol as string | undefined;

        const mapped: string = mapRol(rolSP);
        if (!cancel) {
          setRole(mapped);
          sessionStorage.setItem(cacheKey, mapped);
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

function mapRol(v?: string): string {
  const t = (v ?? "").toLowerCase();
  if (t.includes("admin")) return "admin";
  if (t.includes("tec")) return "tecnico";
  return "usuario";
}
