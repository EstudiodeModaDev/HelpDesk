// Funcionalidades/Escalamiento.ts
import * as React from "react";
import { useGraphServices } from "../graph/GrapServicesContext";
import { useAuth } from "../auth/authContext";
import type { LogService } from "../Services/Log.service";
import type { FormActaStateErrors, FormStateActa, TipoUsuario } from "../Models/ActasEntrega";
import type { ActasdeentregaService } from "../Services/Actasdeentrega.service";

/* ===== Config ===== */
const ENTREGAS_BY_TIPO: Record<TipoUsuario, string[]> = {
  "Usuario administrativo": ["Computador","Cargador","Mouse","Multipuertos","Diadema"],
  "Usuario de diseño": ["Computador","Tableta graficadora","Cargador","Mouse","Multipuertos","Diadema"],
  "Tienda": ["CPU","Monitor","Teclado","Mouse","Lector CB","Cajón Monedero","Cámara","Teléfono","Multipuertos"],
};
const ITEMS_CON_TIPO_COMPUTADOR = new Set(["Computador", "CPU"]);

export function useActaEntrega(ticketId: string) {
  const { account } = useAuth();

  const { Logs: LogSvc,  } =
    useGraphServices() as ReturnType<typeof useGraphServices> & {
      Logs: LogService;
      ActasEntrega: ActasdeentregaService; // <-- servicio correcto
    };

  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [errors, setErrors] = React.useState<FormActaStateErrors>({});

  const [state, setState] = React.useState<FormStateActa>({
    numeroTicket: ticketId,
    persona: "",
    sedeDestino: "",
    correo: account?.username ?? "",    // nombre no es correo; usa username si viene del AAD
    cedula: "",
    enviarEquipos: "",
    tipoUsuario: "" as TipoUsuario | "",
    tipoComputador: "",
    entregas: {},
  });

  // inicializaciones (solo una vez)
  React.useEffect(() => {
    setError(null);
    setErrors({});
    setLoading(false);
  }, []);

  const setField = <K extends keyof FormStateActa>(k: K, v: FormStateActa[K]) => setState((s) => ({ ...s, [k]: v }));

  /** Ítems según tipo de usuario */
  const items = React.useMemo(() => {
    return state.tipoUsuario ? ENTREGAS_BY_TIPO[state.tipoUsuario] ?? [] : [];
  }, [state.tipoUsuario]);

  /** Mantener coherencia cuando cambia el tipo de usuario */
  React.useEffect(() => {
    if (!state.tipoUsuario) return;
    const next: Record<string, boolean> = {};
    for (const k of items) next[k] = !!state.entregas[k];

    const algunComputadorActivo = items.some(
      (k) => ITEMS_CON_TIPO_COMPUTADOR.has(k) && !!next[k]
    );

    setState((s) => ({
      ...s,
      entregas: next,
      tipoComputador: algunComputadorActivo ? s.tipoComputador ?? "" : "",
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.tipoUsuario, items]);

  const toggleEntrega = (key: string, v: boolean) => setState((s) => ({ ...s, entregas: { ...s.entregas, [key]: v } }));

  const requiereTipoComputador = Object.entries(state.entregas).some(([k, v]) => v && ITEMS_CON_TIPO_COMPUTADOR.has(k));

  const validate = () => {
    const e: FormActaStateErrors = {};
    if (!state.cedula) e.cedula = "Digite la cedula de quien recibe";
    if (!state.correo) e.correo = "Digite el correo de quien recibe";
    if (state.entregas) e.entregas = "Debe seleccionar al menos un objeto a entregar";
    if (!state.enviarEquipos) e.enviarEquipos = "Debe definir si los equipos se enviaran";
    if (!state.persona.trim()) e.persona = "Escriba el nombre completo de quien recibe";
    if (!state.tipoUsuario) e.tipoUsuario = "Seleccione a que tipo de usuario se le hara la entrega";
    if(requiereTipoComputador && !state.tipoComputador) e.tipoComputador= "Seleccione el tipo de compurador"
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if(!validate()) return; 

    try {
      setLoading(true);
      setError(null);

      // ejemplo de uso real de servicios (quita los .get hardcodeados)
      // await ActasSvc.create(state); // o el método que tengas
      await LogSvc.create({
        Actor: account?.name ?? "",
        CorreoActor: account?.username ?? "",
        Tipo_de_accion: "seguimiento",
        Descripcion: `Se diligenció acta para ${state.persona} (${state.tipoUsuario})`,
        Title: state.numeroTicket,
      });

      const payload = {
        ...state,
        entregasSeleccionadas: Object.keys(state.entregas).filter((k) => state.entregas[k]),
      };
      console.log("[ACTA] Payload:", payload);
      alert("Acta lista (ver consola).");
    } catch (e: any) {
      console.error(e);
      setError(e?.message ?? "Error guardando el acta");
    } finally {
      setLoading(false);
    }
  };

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
  };
}
