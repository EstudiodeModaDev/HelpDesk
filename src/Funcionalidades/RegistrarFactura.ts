// ✅ Hook principal: maneja la lógica de registrar y listar facturas
import { useCallback, useEffect, useMemo, useState } from "react";
import { useGraphServices } from "../graph/GrapServicesContext";
import type { ReFactura } from "../Models/RegistroFacturaInterface";
import { ReFacturasService } from "../Services/ReFacturas.service";

// 🎯 Estado y acciones disponibles para este módulo
export type FacturasUx = {
  facturas: ReFactura[];                                      // Lista de facturas cargadas
  loading: boolean;                                           // Indica si hay una operación en curso
  error: string | null;                                       // Guarda errores ocurridos
  obtenerFacturas: () => Promise<ReFactura[]>;                // Función para traer todas las facturas
  registrarFactura: (f: Omit<ReFactura, "id0">) => Promise<ReFactura>; // Función para registrar nueva factura
};

// 🧩 Hook que encapsula toda la lógica de facturas
export function useFacturas(): FacturasUx {
  // Traemos el GraphRest desde el contexto global (ya autenticado)
  const { graph } = useGraphServices();

  // Creamos una instancia del servicio de facturas (que se conecta a SharePoint)
  const service = useMemo(() => new ReFacturasService(graph), [graph]);

  // Estado local del hook
  const [facturas, setFacturas] = useState<ReFactura[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 🟢 Función para obtener todas las facturas registradas
  const obtenerFacturas = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const lista = await service.getAll();
      setFacturas(lista);
      return lista;
    } catch (err: any) {
      console.error("Error al obtener facturas:", err);
      setError(err?.message ?? "Error desconocido al cargar facturas");
      setFacturas([]);
      return [];
    } finally {
      setLoading(false);
    }
  }, [service]);

  // 🟢 Función para registrar una nueva factura
  const registrarFactura = useCallback(async (f: Omit<ReFactura, "id0">) => {
    setLoading(true);
    setError(null);
    try {
      // Llamamos al servicio para crearla
      const nueva = await service.create(f);

      // La añadimos a la lista local sin tener que recargar todo
      setFacturas((prev) => [...prev, nueva]);

      return nueva;
    } catch (err: any) {
      console.error("Error al registrar factura:", err);
      setError(err?.message ?? "Error desconocido al registrar factura");
      throw err;
    } finally {
      setLoading(false);
    }
  }, [service]);

  // ⚡ Carga inicial de facturas al montar el componente
  useEffect(() => {
    void obtenerFacturas();
  }, [obtenerFacturas]);

  // Retornamos el estado y las funciones públicas del hook
  return {
    facturas,
    loading,
    error,
    obtenerFacturas,
    registrarFactura,
  };
}
