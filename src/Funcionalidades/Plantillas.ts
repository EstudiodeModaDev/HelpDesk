import React from "react";
import type { PlantillasService } from "../Services/Plantillas.service";
import type { Plantillas } from "../Models/Plantilla";

export function usePlantillas(
  PlantillasSvc: PlantillasService,
) {
  // UI state
  const [ListaPlantillas, setListaPlantillas] = React.useState<Plantillas[] | []>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // cargar primera página (o recargar)
  const loadPlantillas = React.useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const items = await PlantillasSvc.getAll();
      setListaPlantillas(items);
    } catch (e: any) {
      setError(e?.message ?? "Error cargando pantillas");
      setListaPlantillas([]);
    } finally {
      setLoading(false);
    }
  }, [PlantillasSvc]);

  React.useEffect(() => {
    loadPlantillas();
  }, [loadPlantillas]);

  return {
    // datos visibles (solo la página actual)
    ListaPlantillas,
    loading,
    error,
  };
}
