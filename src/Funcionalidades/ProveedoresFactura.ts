import { useEffect, useState } from "react";
import type { Proveedor } from "../Models/Facturas";
import { ProveedoresFacturaService } from "../Services/ProveedoresFacturas.service";
import { GraphRest } from "../graph/GraphRest";
import { useAuth } from "../auth/authContext";

export const useProveedores = () => {
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { getToken } = useAuth(); // 👈 obtener la función getToken

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const graph = new GraphRest(getToken);
        const service = new ProveedoresFacturaService(graph);
        const lista = await service.getAll();
        setProveedores(lista);
      } catch (e: any) {
        console.error("Error cargando proveedores:", e);
        setError("No se pudo cargar la lista de proveedores");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  return { proveedores, loading, error };
};
