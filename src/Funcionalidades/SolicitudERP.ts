import { useCallback, useMemo, useReducer } from "react";

/* ===== Model ===== */
export interface FilaSolicitudERP {
  id: string;
  nombreperfil: string;
  metodogeneral: string;
  metodoespecifico: string;
  permisoespecifico: string;
  usuarioNombre: string;
  usuarioMail: string;
  observaciones: string;
}

type State = {
  filas: FilaSolicitudERP[];
  sending: boolean;
  error?: string;
};

type Action =
  | { type: "ADD" }
  | { type: "REMOVE"; id: string }
  | { type: "SET"; id: string; key: keyof FilaSolicitudERP; value: any }
  | { type: "RESET" }
  | { type: "SENDING"; value: boolean }
  | { type: "ERROR"; message?: string };

/* ===== Factory de fila ===== */
const nuevaFila = (): FilaSolicitudERP => ({
  id: crypto.randomUUID(),
  nombreperfil: "",
  metodogeneral: "",
  metodoespecifico: "",
  permisoespecifico: "",
  usuarioNombre: "",
  usuarioMail: "",
  observaciones: "",
});

/* ===== Reducer ===== */
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

/* Qué envías a la API (sin el id interno) */
export type SubmitFn = (
  payload: Omit<FilaSolicitudERP, "id">[]
) => Promise<void> | void;

/* ===== Hook ===== */
export function useSolicitudesERP(onSubmit: SubmitFn) {
  const [state, dispatch] = useReducer(reducer, {
    filas: [nuevaFila()],
    sending: false,
  } as State);

  /* Validación mínima: perfil + permiso, y algún dato de usuario */
  const requiredOk = useMemo(
    () =>
      state.filas.every(
        f =>
          f.nombreperfil.trim() &&
          f.permisoespecifico.trim() &&
          (f.usuarioNombre.trim() || f.usuarioMail.trim())
      ),
    [state.filas]
  );

  const addFila = useCallback(() => dispatch({ type: "ADD" }), []);
  const removeFila = useCallback((id: string) => dispatch({ type: "REMOVE", id }), []);
  const setCampo = useCallback(
    (id: string, key: keyof FilaSolicitudERP, value: any) =>
      dispatch({ type: "SET", id, key, value }),
    []
  );

  const submit = useCallback(
    async (e?: React.FormEvent) => {
      e?.preventDefault?.();
      if (!requiredOk) {
        dispatch({
          type: "ERROR",
          message:
            "Completa al menos: Nombre de perfil, Permiso específico y (Nombre o Correo del usuario) en cada fila.",
        });
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
    },
    [requiredOk, state.filas, onSubmit]
  );

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
