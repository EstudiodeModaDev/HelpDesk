import * as React from "react";
import { useGraphServices } from "../graph/GrapServicesContext";
import type { UsuariosSPService } from "../Services/Usuarios.Service";
import type { FormNewUserErrors, UsuariosSP } from "../Models/Usuarios";
import type { UserOption } from "../Models/Commons";

export function useUserRoleFromSP(email?: string | null) {
  const { Usuarios } = useGraphServices(); // ajusta el nombre si tu service se llama distinto
  const [role, setRole] = React.useState<string>("usuario");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancel = false;
    (async () => {
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


export function useUsuarios(usuariosSvc: UsuariosSPService) {
  const [usuarios, setUsuarios] = React.useState<UsuariosSP[]>([]);
  const [tecnicos, setTecnicos] = React.useState<UsuariosSP[]>([]);
  const [administradores, setAdmins] = React.useState<UsuariosSP[]>([]);
  const [UseruserOptions, setUserOptions] = React.useState<UserOption[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [state, setState] = React.useState<UsuariosSP>({
    Correo: "",
    Rol: "",
    Title: "",
    Disponible: ""
  })
  const [errors, setErrors] = React.useState<FormNewUserErrors>({})
  const [submitting, setSubmitting] = React.useState<Boolean>(false)

  // paginación
  const [pageSize, setPageSize] = React.useState<number>(10);
  const [pageIndex, setPageIndex] = React.useState<number>(1);
  const [nextLink, setNextLink] = React.useState<string | null>(null);

  const setField = <K extends keyof UsuariosSP>(k: K, v: UsuariosSP[K]) => setState((s) => ({ ...s, [k]: v }));
  

  const mapRowToUsuario = React.useCallback((row: any): UsuariosSP => {
    // Si el service ya aplanó, usa el nivel raíz; si no, lee de fields
    const f = row?.fields ?? row ?? {};
    return {
      Id: String(row?.id ?? f.ID ?? f.Id ?? ""),
      Title: String(f.Title ?? ""),
      Correo: String(f.Correo ?? f.Email ?? "").trim(),
      Rol: String(f.Rol ?? ""),
    } as UsuariosSP;
  }, []);

  const mapUsuariosToOptions = React.useCallback((list: UsuariosSP[]): UserOption[] => {
    return (list ?? [])
      .map((u) => {
        const nombre = String((u as any).Title ?? "—");
        const correo = String((u as any).Correo ?? "").trim();
        const rol    = String((u as any).Rol ?? "");
        const id     = String((u as any).ID);
        return {
          value: correo || id,   // correo como clave estable
          label: nombre,
          id,
          email: correo || undefined,
          jobTitle: rol || undefined,
          // OJO: UserOption no tiene "source". Si quieres "source", crea UserOptionEx en el front.
        } as UserOption;
      })
      .sort((a, b) => a.label.localeCompare(b.label));
  }, []);

  // --- loader principal ---
  const loadUsuarios = React.useCallback(async () => {
    setLoading(true);
    setError(null);

    let cancelled = false;
    try {
      // si luego quieres paginar en server: const res = await usuariosSvc.getAll({ top: pageSize });
      const res = await usuariosSvc.getAll();

      // Soporta array o { items, nextLink }
      const itemsRaw: any[] = Array.isArray(res) ? res : (res?.items ?? []);
      const nLink: string | null = Array.isArray(res) ? null : (res?.nextLink ?? null);

      const items = itemsRaw.map(mapRowToUsuario);
      if (cancelled) return;

      setUsuarios(items);
      setUserOptions(mapUsuariosToOptions(items));
      setNextLink(nLink);
      setPageIndex(1);
    } catch (e: any) {
      if (!cancelled) {
        setError(e?.message ?? "Error cargando usuarios");
        setUsuarios([]);
        setUserOptions([]);
        setNextLink(null);
        setPageIndex(1);
      }
    } finally {
      if (!cancelled) setLoading(false);
    }

    return () => { cancelled = true; };
  }, [usuariosSvc, /* pageSize, */ mapRowToUsuario, mapUsuariosToOptions]);

  const loadTecnicos = React.useCallback(async () => {
    setLoading(true);
    setError(null);

    let cancelled = false;
    try {
      const res = await usuariosSvc.getAll({filter: `fields/Rol eq 'Tecnico'`});
      if (cancelled) return;

      setTecnicos(res);
    } catch (e: any) {
      if (!cancelled) {
        setError(e?.message ?? "Error cargando usuarios");
        setUsuarios([]);
        setUserOptions([]);
      }
    } finally {
      if (!cancelled) setLoading(false);
    }

    return () => { cancelled = true; };
  }, [usuariosSvc]);

  const loadAdmins = React.useCallback(async () => {
    setLoading(true);
    setError(null);

    let cancelled = false;
    try {
      const res = await usuariosSvc.getAll({filter: `fields/Rol eq 'Administrador'`});
      if (cancelled) return;

      setAdmins(res);
    } catch (e: any) {
      if (!cancelled) {
        setError(e?.message ?? "Error cargando usuarios");
        setAdmins([]);
      }
    } finally {
      if (!cancelled) setLoading(false);
    }

    return () => { cancelled = true; };
  }, [usuariosSvc]);

  const deleteUser = React.useCallback(async (id: string) => {
    setLoading(true);
    setError(null);

    let cancelled = false;
    try {
      const res = await usuariosSvc.delete(id);
      if (cancelled) return;

      console.log(res)
    } catch (e: any) {
      if (!cancelled) {
        setError(e?.message ?? "Error eliminado usuarios");
      }
    } finally {
      if (!cancelled) setLoading(false);
    }

    return () => { cancelled = true; };
  }, [usuariosSvc]);

  const validate = () => {
    const e: FormNewUserErrors = {};
    if (!state.Title.trim()) e.Title = "Ingresa el nombre completo.";
    if (!state.Correo.trim()) e.Correo = "Ingresa el correo.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(state.Correo)) e.Correo = "Correo inválido.";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const addUser = React.useCallback(async () => {
    if(!validate()) return
    setSubmitting(true);
    setError(null);

    let cancelled = false;
    try {
      const res = await usuariosSvc.create(state);
      if (cancelled) return;

      console.log(res)
    } catch (e: any) {
      if (!cancelled) {
        setError(e?.message ?? "Error eliminado usuarios");
      }
    } finally {
      if (!cancelled) setLoading(false);
    }

    return () => { cancelled = true; };
  }, [usuariosSvc, state]);

  React.useEffect(() => {
    let cancel = false;
    (async () => {
      if (cancel) return;
      await loadUsuarios();
      await loadTecnicos();
      await loadAdmins();
    })();
    return () => { cancel = true; };
  }, [loadUsuarios, loadTecnicos, loadAdmins]);

  const refreshUsuers = React.useCallback(async () => {
    await loadUsuarios();
  }, [loadUsuarios]);

  const hasNext = !!nextLink;

  return {
    usuarios, UseruserOptions, loading, error, pageSize, pageIndex, hasNext, nextLink, tecnicos, administradores, state,errors, submitting,
    refreshUsuers, deleteUser, setPageSize, setField, addUser 
  };
}
