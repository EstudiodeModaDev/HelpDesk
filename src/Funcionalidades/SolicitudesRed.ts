import { useCallback, useMemo, useReducer } from "react";
import type { Action, FilaSolicitudRed, State } from "../Models/Formatos";



const nuevaFila = (): FilaSolicitudRed => ({
  id: crypto.randomUUID(),
  carpeta1: "",
  subcarpeta1: "",
  subcarpeta2: "",
  personas: "",
  permiso: "",
  observaciones: "",
});

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "ADD":
      return { ...state, filas: [...state.filas, nuevaFila()] };
    case "REMOVE":
      return { ...state, filas: state.filas.filter(f => f.id !== action.id) };
    case "SET":
      return {
        ...state,
        filas: state.filas.map(f =>
          f.id === action.id ? { ...f, [action.key]: action.value } : f
        ),
      };
    case "RESET":
      return { ...state, filas: [nuevaFila()], error: undefined };
    case "SENDING":
      return { ...state, sending: action.value };
    case "ERROR":
      return { ...state, error: action.message };
    default:
      return state;
  }
}

export type SubmitFn = (payload: Omit<FilaSolicitudRed, "id">[]) => Promise<void> | void;

export function useSolicitudesRed(onSubmit: SubmitFn) {
  const [state, dispatch] = useReducer(reducer, {
    filas: [nuevaFila()],   // arranca con 1 fila
    sending: false,
  } as State);

  const requiredOk = useMemo(() => {
    // Requisitos mínimos por fila (ajústalos a tu gusto)
    return state.filas.every(f => f.carpeta1.trim() || f.subcarpeta1.trim() || f.subcarpeta2.trim());
  }, [state.filas]);

  const addFila = useCallback(() => dispatch({ type: "ADD" }), []);
  const removeFila = useCallback((id: string) => dispatch({ type: "REMOVE", id }), []);
  const setCampo = useCallback(
    (id: string, key: keyof FilaSolicitudRed, value: any) =>
      dispatch({ type: "SET", id, key, value }),
    []
  );

  const submit = useCallback(async (e?: React.FormEvent) => {
    e?.preventDefault?.();
    if (!requiredOk) {
      dispatch({ type: "ERROR", message: "Hay filas sin datos mínimos (carpeta o subcarpetas)." });
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
  }, [state.filas, requiredOk, onSubmit]);

  return {
    filas: state.filas,
    sending: state.sending,
    error: state.error,
    requiredOk,
    addFila,
    removeFila,
    setCampo,
    submit,
  };
}
