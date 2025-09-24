import { useCallback, useMemo, useReducer } from "react";

/* ===== Modelo ===== */
export interface FilaPermisoNav {
  id: string;
  empleado: string;
  autoriza: string;          // jefe / quien autoriza
  youtube: boolean;
  facebook: boolean;
  twitter: boolean;
  instagram: boolean;
  whatsapp: boolean;
  wetransfer: boolean;
  pinterest: boolean;
  ganalytics: boolean;
  gdrive: boolean;
  otroUrl: string;           // link adicional
}

type State = {
  filas: FilaPermisoNav[];
  sending: boolean;
  error?: string;
};

type Action =
  | { type: "ADD" }
  | { type: "REMOVE"; id: string }
  | { type: "SET_TEXT"; id: string; key: keyof FilaPermisoNav; value: string }
  | { type: "TOGGLE"; id: string; key: keyof FilaPermisoNav }
  | { type: "RESET" }
  | { type: "SENDING"; value: boolean }
  | { type: "ERROR"; message?: string };

const nuevaFila = (): FilaPermisoNav => ({
  id: crypto.randomUUID(),
  empleado: "",
  autoriza: "",
  youtube: false,
  facebook: false,
  twitter: false,
  instagram: false,
  whatsapp: false,
  wetransfer: false,
  pinterest: false,
  ganalytics: false,
  gdrive: false,
  otroUrl: "",
});

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "ADD":       return { ...state, filas: [...state.filas, nuevaFila()] };
    case "REMOVE":    return { ...state, filas: state.filas.filter(f => f.id !== action.id) };
    case "SET_TEXT":  return {
      ...state,
      filas: state.filas.map(f => f.id === action.id ? { ...f, [action.key]: action.value } : f),
    };
    case "TOGGLE":    return {
      ...state,
      filas: state.filas.map(f => f.id === action.id ? { ...f, [action.key]: !Boolean(f[action.key]) } : f),
    };
    case "RESET":     return { ...state, filas: [nuevaFila()], error: undefined };
    case "SENDING":   return { ...state, sending: action.value };
    case "ERROR":     return { ...state, error: action.message };
    default:          return state;
  }
}

/* payload para API (sin id interno) */
export type SubmitFn = (payload: Omit<FilaPermisoNav, "id">[]) => Promise<void> | void;

export function usePermisosNavegacion(onSubmit: SubmitFn) {
  const [state, dispatch] = useReducer(reducer, { filas: [nuevaFila()], sending: false } as State);

  const requiredOk = useMemo(
    () => state.filas.every(f => f.empleado.trim() && f.autoriza.trim()),
    [state.filas]
  );

  const addFila    = useCallback(() => dispatch({ type: "ADD" }), []);
  const removeFila = useCallback((id: string) => dispatch({ type: "REMOVE", id }), []);
  const setText    = useCallback((id: string, key: keyof FilaPermisoNav, value: string) =>
                      dispatch({ type: "SET_TEXT", id, key, value }), []);
  const toggle     = useCallback((id: string, key: keyof FilaPermisoNav) =>
                      dispatch({ type: "TOGGLE", id, key }), []);

  const submit = useCallback(async (e?: React.FormEvent) => {
    e?.preventDefault?.();
    if (!requiredOk) {
      dispatch({ type: "ERROR", message: "Empleado y Jefe/Autoriza son obligatorios en cada fila." });
      return;
    }
    try {
      dispatch({ type: "SENDING", value: true });
      const payload = state.filas.map(({ id, ...rest }) => rest);
      await onSubmit(payload);
      dispatch({ type: "RESET" });
    } finally {
      dispatch({ type: "SENDING", value: false });
    }
  }, [requiredOk, state.filas, onSubmit]);

  return { ...state, requiredOk, addFila, removeFila, setText, toggle, submit };
}
