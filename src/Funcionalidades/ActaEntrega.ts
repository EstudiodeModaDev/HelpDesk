// Funcionalidades/Escalamiento.ts
import * as React from "react";
import { useGraphServices } from "../graph/GrapServicesContext";
import { useAuth } from "../auth/authContext";
import type { LogService } from "../Services/Log.service";
import type {
  DetalleEntrega,
  FormActaStateErrors,
  FormStateActa,
  TipoUsuario,
} from "../Models/ActasEntrega";
import type { ActasdeentregaService } from "../Services/Actasdeentrega.service";

/* ===== Config ===== */
const ENTREGAS_BY_TIPO: Record<TipoUsuario, string[]> = {
  "Usuario administrativo": ["Computador", "Cargador", "Mouse", "Multipuertos", "Diadema"],
  "Usuario de diseño": ["Computador", "Tableta graficadora", "Cargador", "Mouse", "Multipuertos", "Diadema"],
  "Tienda": ["CPU", "Monitor", "Teclado", "Mouse", "Lector CB", "Cajón Monedero", "Cámara", "Teléfono", "Multipuertos"],
};
const ITEMS_CON_TIPO_COMPUTADOR = new Set(["Computador", "CPU"]);

function crearDetalleDefault(nombre: string, tipoComputador?: string): DetalleEntrega {
  const esPC = ITEMS_CON_TIPO_COMPUTADOR.has(nombre);
  const elemento = esPC && tipoComputador ? `Computador ${tipoComputador}` : nombre;
  const descripcion =
    esPC ? `Computador ${tipoComputador ?? ""}`.trim() : nombre;

  return {
    Elemento: elemento,
    Detalle: descripcion,
    Marca: "",
    Referencia: "",
    Serial: "",
    Propiedad: "Alquilado",
    Proveedor: "",
    Prueba: "",
  };
}

export function useActaEntrega(ticketId: string) {
  const { account } = useAuth();
  const { Logs: LogSvc } = useGraphServices() as ReturnType<typeof useGraphServices> & {
    Logs: LogService;
    ActasEntrega: ActasdeentregaService;
  };

  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [errors, setErrors] = React.useState<FormActaStateErrors>({});

  const [state, setState] = React.useState<FormStateActa>({
    numeroTicket: ticketId,
    persona: "",
    sedeDestino: "",
    correo: account?.username ?? "",
    cedula: "",
    enviarEquipos: "",
    tipoUsuario: "" as TipoUsuario | "",
    tipoComputador: "",
    entregas: {},
    detalles: {},
  });

  const setField = <K extends keyof FormStateActa>(k: K, v: FormStateActa[K]) =>
    setState((s) => ({ ...s, [k]: v }));

  /** Ítems según tipo de usuario */
  const items = React.useMemo(() => {
    return state.tipoUsuario ? ENTREGAS_BY_TIPO[state.tipoUsuario] ?? [] : [];
  }, [state.tipoUsuario]);

  /** Mantener coherencia cuando cambia el tipo de usuario */
  React.useEffect(() => {
    if (!state.tipoUsuario) return;

    // recalcula qué está disponible
    const nextEntregas: Record<string, boolean> = {};
    const nextDetalles: Record<string, DetalleEntrega> = {};

    for (const k of items) {
      const activo = !!state.entregas[k];
      nextEntregas[k] = activo;
      if (activo) {
        nextDetalles[k] = state.detalles[k] ?? crearDetalleDefault(k, state.tipoComputador);
      }
    }

    const algunComputadorActivo = items.some(
      (k) => ITEMS_CON_TIPO_COMPUTADOR.has(k) && !!nextEntregas[k]
    );

    setState((s) => ({
      ...s,
      entregas: nextEntregas,
      detalles: nextDetalles, // <<< sincroniza colección
      tipoComputador: algunComputadorActivo ? (s.tipoComputador ?? "") : "",
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.tipoUsuario, items]);

  /** Si cambia tipoComputador, reflejar en Elemento/Detalle de Computador/CPU seleccionados */
  React.useEffect(() => {
    if (!state.tipoComputador) return;
    setState((s) => {
      const detalles = { ...s.detalles };
      Object.keys(s.entregas)
        .filter((k) => s.entregas[k] && ITEMS_CON_TIPO_COMPUTADOR.has(k))
        .forEach((k) => {
          const prev = detalles[k] ?? crearDetalleDefault(k, s.tipoComputador);
          detalles[k] = {
            ...prev,
            Elemento: `Computador ${s.tipoComputador}`,
            Detalle: `Computador ${s.tipoComputador}`,
          };
        });
      return { ...s, detalles };
    });
  }, [state.tipoComputador]);

  /** Toggle + crear/eliminar detalle */
  const toggleEntrega = (key: string, v: boolean) =>
    setState((s) => {
      const entregas = { ...s.entregas, [key]: v };
      const detalles = { ...s.detalles };
      if (v) {
        if (!detalles[key]) detalles[key] = crearDetalleDefault(key, s.tipoComputador);
      } else {
        delete detalles[key];
      }
      return { ...s, entregas, detalles };
    });

  /** Edición de una tarjeta */
  const updateDetalle = (key: string, patch: Partial<DetalleEntrega>) =>
    setState((s) => {
      const prev = s.detalles[key] ?? crearDetalleDefault(key, s.tipoComputador);
      let next: DetalleEntrega = { ...prev, ...patch };

      if (patch.Propiedad && patch.Propiedad !== "Alquilado") {
        next = { ...next, Proveedor: "-" };
      }
      if (patch.Propiedad === "Alquilado" && prev.Proveedor === "-") {
        next.Proveedor = "";
      }
      return { ...s, detalles: { ...s.detalles, [key]: next } };
    });

  /** Reglas de validación */
  const requiereTipoComputador = Object.entries(state.entregas)
    .some(([k, v]) => v && ITEMS_CON_TIPO_COMPUTADOR.has(k));

  const validate = () => {
    const e: FormActaStateErrors = {};
    if (!state.cedula) e.cedula = "Digite la cédula de quien recibe";
    if (!state.correo) e.correo = "Digite el correo de quien recibe";
    if (!Object.values(state.entregas).some(Boolean)) e.entregas = "Debe seleccionar al menos un objeto a entregar";
    if (!state.enviarEquipos) e.enviarEquipos = "Debe definir si los equipos se enviarán";
    if (!state.persona.trim()) e.persona = "Escriba el nombre completo de quien recibe";
    if (!state.tipoUsuario) e.tipoUsuario = "Seleccione a qué tipo de usuario se le hará la entrega";
    if (requiereTipoComputador && !state.tipoComputador) e.tipoComputador = "Seleccione el tipo de computador";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  /** Submit */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    try {
      setLoading(true);
      setError(null);

      // Ejemplo: log
      await LogSvc.create({
        Actor: account?.name ?? "",
        CorreoActor: account?.username ?? "",
        Tipo_de_accion: "seguimiento",
        Descripcion: `Se diligenció acta para ${state.persona} (${state.tipoUsuario})`,
        Title: state.numeroTicket,
      });

      const entregasSeleccionadas = Object.keys(state.entregas).filter((k) => state.entregas[k]);
      const coleccion = entregasSeleccionadas.map((k, i) => ({ ID: i, ...state.detalles[k] }));

      const payload = { ...state, entregasSeleccionadas, coleccion };
      console.log("[ACTA] Payload:", payload);
      alert("Acta lista (ver consola).");
    } catch (e: any) {
      console.error(e);
      setError(e?.message ?? "Error guardando el acta");
    } finally {
      setLoading(false);
    }
  };

  const selectedKeys = React.useMemo(
    () => Object.keys(state.entregas).filter((k) => state.entregas[k]),
    [state.entregas]
  );

  return {
    loading,
    error,
    user: account,
    items,
    state,
    setField,
    handleSubmit,
    errors,
    toggleEntrega,
    ITEMS_CON_TIPO_COMPUTADOR,
    updateDetalle,
    selectedKeys, // útil para la galería
  };
}
