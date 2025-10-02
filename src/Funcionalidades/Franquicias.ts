import * as React from "react";
import type { Franquicias } from "../Models/Franquicias";
import type { FranquiciasService } from "../Services/Franquicias.service";
import type { UserOption } from "../Models/Commons";

type UseFranquiciasReturn = {
  franquicias: Franquicias[];
  franqOptions: UserOption[];     // ← listo para el <Select>
  loading: boolean;
  error: string | null;
  pageSize: number;
  setPageSize: React.Dispatch<React.SetStateAction<number>>;
  pageIndex: number;
  hasNext: boolean;
  nextLink: string | null;
  refresh: () => Promise<void>;
};

export function useFranquicias(FranquiciasSvc: FranquiciasService): UseFranquiciasReturn {
  const [franquicias, setFranquicias] = React.useState<Franquicias[]>([]);
  const [franqOptions, setFranqOptions] = React.useState<UserOption[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // paginación (si el service la soporta)
  const [pageSize, setPageSize] = React.useState<number>(10); // = $top
  const [pageIndex, setPageIndex] = React.useState<number>(1); // 1-based
  const [nextLink, setNextLink] = React.useState<string | null>(null);

  // --- helpers ---

  // Aplana una fila cruda (con o sin fields) a tu modelo Franquicias
  const mapRowToFranquicia = React.useCallback((row: any): Franquicias => {
    const f = row?.fields ?? row ?? {};
    // Ajusta estos nombres a tu interfaz real de Franquicias
    return {
      // ejemplo de campos comunes:
      Id: String(row?.id ?? f.ID ?? f.Id ?? ""),
      Title: String(f.Title ?? ""),
      Correo: String(f.Correo ?? f.Email ?? "").trim(),
      Direccion: String(f.Direccion ?? f.Title ?? ""),
      Ciudad: String(f.Ciudad ?? ""),
      Jefe_x0020_de_x0020_zona: String(row?.Jefe_x0020_de_x0020_zona ?? f.webUrl ?? ""),
    } as Franquicias;
  }, []);

  // Mapea tu modelo a UserOption para el Select
  const mapFranqToOptions = React.useCallback((list: Franquicias[]): UserOption[] => {
    return (list ?? [])
      .map((f) => {
        const nombre = String((f as any).Nombre1 ?? (f as any).Title ?? "—");
        const correo = String((f as any).Correo ?? "").trim();
        const id     = String((f as any).ID ?? correo ?? nombre);
        const cargo  = "Franquicia"; // si quieres mostrarlo como jobTitle
        return {
          value: correo || id,     // correo como clave estable
          label: nombre,
          id,
          email: correo || undefined,
          jobTitle: cargo,         // para mostrar debajo del nombre
        } as UserOption;
      })
      .sort((a, b) => a.label.localeCompare(b.label));
  }, []);

  // --- loader principal ---

  const loadFranquicias = React.useCallback(async () => {
    setLoading(true);
    setError(null);

    let cancelled = false;
    try {
      // Si conectas paginación real: const res = await FranquiciasSvc.getAll({ top: pageSize });
      const res = await FranquiciasSvc.getAll();

      // Soporta dos contratos
      const rawItems: any[] = Array.isArray(res) ? res : (res?.items ?? []);
      const nLink: string | null = Array.isArray(res) ? null : (res?.nextLink ?? null);

      const items = rawItems.map(mapRowToFranquicia);
      if (cancelled) return;

      setFranquicias(items);
      setFranqOptions(mapFranqToOptions(items));
      setNextLink(nLink);
      setPageIndex(1);
    } catch (e: any) {
      if (!cancelled) {
        setError(e?.message ?? "Error cargando franquicias");
        setFranquicias([]);
        setFranqOptions([]);
        setNextLink(null);
        setPageIndex(1);
      }
    } finally {
      if (!cancelled) setLoading(false);
    }

    return () => { cancelled = true; };
  }, [FranquiciasSvc, /* pageSize, */ mapRowToFranquicia, mapFranqToOptions]);

  React.useEffect(() => {
    let cancel = false;
    (async () => {
      if (cancel) return;
      await loadFranquicias();
    })();
    return () => { cancel = true; };
  }, [loadFranquicias]);

  const refresh = React.useCallback(async () => {
    await loadFranquicias();
  }, [loadFranquicias]);

  const hasNext = !!nextLink;

  return {
    franquicias,
    franqOptions,
    loading,
    error,
    pageSize, setPageSize,
    pageIndex,
    hasNext,
    nextLink,
    refresh,
  };
}
