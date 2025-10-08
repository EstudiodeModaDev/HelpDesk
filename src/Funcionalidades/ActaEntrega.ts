// Funcionalidades/Escalamiento.ts
import * as React from "react";
import { useGraphServices } from "../graph/GrapServicesContext";
import { useAuth } from "../auth/authContext";
import type { LogService } from "../Services/Log.service";
import type { FormEscalamientoStateErrors } from "../Models/nuevoTicket";
import type { ActasEntrega, FormStateActa, TipoUsuario } from "../Models/ActasEntrega";


const ENTREGAS_BY_TIPO: Record<TipoUsuario, string[]> = {
  "Usuario administrativo": [
    "Computador",
    "Cargador",
    "Mouse",
    "Multipuertos",
    "Diadema",
  ],
  "Usuario de diseño": [
    "Computador",
    "Tableta graficadora",
    "Cargador",
    "Mouse",
    "Multipuertos",
    "Diadema",
  ],
  "Tienda": [
    "CPU",
    "Monitor",
    "Teclado",
    "Mouse",
    "Lector CB",
    "Cajón Monedero",
    "Cámara",
    "Teléfono",
    "Multipuertos",
  ],
};
const ITEMS_CON_TIPO_COMPUTADOR = new Set(["Computador", "CPU"]);

export function useActaEntrega(ticketId: string) {
    const { account } = useAuth();
    const {Logs: LogSvc, ActasEntrega: ActasSvc} = useGraphServices() as ReturnType<typeof useGraphServices> & {
        Logs: LogService;
        ActasEntrega: ActasEntrega;
    };
    const [loading, setLoading] = React.useState(false);
    const [error, setError] = React.useState<string | null>(null);
    const [state, setState] = React.useState<FormStateActa>({
        cedula: "",
        correo: account?.name ?? "",
        entregas: {},
        enviarEquipos: "",
        numeroTicket: ticketId,
        persona: "",
        sedeDestino: "",
        tipoUsuario: "",
        tipoComputador: ""
    });
    const [errors, setErrors] = React.useState<FormEscalamientoStateErrors>({});
    const setField = <K extends keyof FormStateActa>(k: K, v: FormStateActa[K]) => setState((s) => ({ ...s, [k]: v }));



    const items = React.useMemo(() => {
        if (!state.tipoUsuario) return [];
        return ENTREGAS_BY_TIPO[state.tipoUsuario];
    }, [state.tipoUsuario]);
    
    
    React.useEffect(() => {
    if (!state.tipoUsuario) return;

    const nextEntregas: Record<string, boolean> = {};
    for (const k of items) nextEntregas[k] = !!state.entregas[k];

    // si ningún item “computador” está activo, limpia tipoComputador
    const algunComputadorActivo = items.some(
        (k) => ITEMS_CON_TIPO_COMPUTADOR.has(k) && !!nextEntregas[k]
    );

    setState((s) => ({
        ...s,
        entregas: nextEntregas,
        tipoComputador: algunComputadorActivo ? s.tipoComputador ?? "" : "",
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [state.tipoUsuario]);

    const toggleEntrega = (key: string, v: boolean) => setState((s) => ({ ...s, entregas: { ...s.entregas, [key]: v } }));

    setError("");
    setErrors({})
    setLoading(false)

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const errs: string[] = [];
        if (!state.persona.trim()) errs.push("Persona (quien recibe) es obligatorio.");
        if (!state.cedula.trim()) errs.push("Número de cédula es obligatorio.");
        if (!state.tipoUsuario) errs.push("Tipo de usuario es obligatorio.");
        if (!state.enviarEquipos) errs.push("¿Estos equipos se enviarán? es obligatorio.");

        // si hay “computador” activo y no se eligió tipo
        const requiereTipoComputador = Object.entries(state.entregas).some(
        ([k, v]) => v && ITEMS_CON_TIPO_COMPUTADOR.has(k)
        );
        if (requiereTipoComputador && !state.tipoComputador)
        errs.push("Seleccione el tipo de computador.");

        if (errs.length) {
        alert("Corrige:\n- " + errs.join("\n- "));
        return;
        }

        ActasSvc.get("a")
        LogSvc.get("a")

        const payload = {
        ...state,
        entregasSeleccionadas: Object.keys(state.entregas).filter((k) => state.entregas[k]),
        };
        console.log("[ACTA] Payload:", payload);
        alert("Datos listos (ver consola).");
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
    ITEMS_CON_TIPO_COMPUTADOR
  };
}
