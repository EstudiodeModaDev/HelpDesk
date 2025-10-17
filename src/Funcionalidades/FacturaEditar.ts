import { useCallback } from "react";
import { ReFacturasService } from "../Services/ReFacturas.service";
import type { ReFactura } from "../Models/RegistroFacturaInterface";

// 🧩 Lógica para crear, actualizar o eliminar facturas
export function FacturaEditar() {
  const service = new ReFacturasService((window as any).graphInstance); // Graph se obtiene desde contexto global o se inyecta externamente

  // 🟢 Crear nueva factura
  const registrarFactura = useCallback(async (nuevaFactura: ReFactura) => {
    try {
      await service.create(nuevaFactura);
      return true;
    } catch (error) {
      console.error("Error al registrar factura:", error);
      return false;
    }
  }, []);

  // ✏️ Actualizar factura existente
  const actualizarFactura = useCallback(async (id: number, cambios: Partial<ReFactura>) => {
    try {
      await service.update(String(id), cambios);
      return true;
    } catch (error) {
      console.error("Error al actualizar factura:", error);
      return false;
    }
  }, []);

  // 🗑️ Eliminar factura
  const eliminarFactura = useCallback(async (id: number) => {
    try {
      await service.delete(String(id));
      return true;
    } catch (error) {
      console.error("Error al eliminar factura:", error);
      return false;
    }
  }, []);

  return {
    registrarFactura,
    actualizarFactura,
    eliminarFactura,
  };
}
