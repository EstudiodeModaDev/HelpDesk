// src/hooks/useNuevoTicketForm.ts
import { useState, useMemo, useEffect } from "react";
import { calcularFechaSolucion } from "../utils/ans";
import { fetchHolidays } from "../Services/Festivos";
import type { UserOption, FormState, FormErrors } from "../Models/nuevoTicket";

/** === Tipos para el árbol de categorías === */
export type Subcat = { id: string; nombre: string; items: string[] };
export type Category = { id: string; nombre: string; subs: Subcat[] };

const USUARIOS: UserOption[] = [
  { value: "practicantelisto@estudiodemoda.com.co", label: "Practicante Listo", id: 1 },
  { value: "cesar@estudiodemoda.com.co", label: "Cesar Sanchez", id: 2 },
  { value: "andres@estudiodemoda.com.co", label: "Andres Godoy", id: 3 },
];

//Se le envian las categorias al hook
export function useNuevoTicketForm(CATS: Category[]) {

  //Estado inicial del formulario
  const [state, setState] = useState<FormState>({
    solicitante: null,
    resolutor: null,
    usarFechaApertura: false,
    fechaApertura: null,
    fuente: "",
    motivo: "",
    descripcion: "",
    categoria: "",
    subcategoria: "",
    articulo: "",
    archivo: null,
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [holidays, setHolidays] = useState<string[]>([]);
  const [fechaSolucion, setFechaSolucion] = useState<Date | null>(null);

  //Obtener los festivos de Colombia al cargar el componente
  useEffect(() => {
    fetchHolidays("CO").then(setHolidays).catch(console.error);
  }, []);

  //Función para actualizar los campos del formulario
  const setField = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setState((s) => ({ ...s, [k]: v }));

  //Defini categorías, subcategorías y artículos según la selección del usuario
  const subcats = useMemo<Subcat[]>(() => {
    const cat = CATS.find((c: Category) => c.id === state.categoria);
    return cat ? cat.subs : [];
  }, [CATS, state.categoria]);

  const articulos = useMemo<string[]>(() => {
    const sub = subcats.find((s: Subcat) => s.id === state.subcategoria);
    return sub ? sub.items : [];
  }, [subcats, state.subcategoria]);

  //Validar el formulario
  const validate = () => {
    const e: FormErrors = {};
    if (!state.solicitante) e.solicitante = "Requerido";
    if (!state.resolutor) e.resolutor = "Requerido";
    if (state.usarFechaApertura && !state.fechaApertura) e.fechaApertura = "Seleccione la fecha";
    if (!state.fuente) e.fuente = "Seleccione una fuente";
    if (!state.motivo.trim()) e.motivo = "Ingrese el motivo";
    if (!state.descripcion.trim()) e.descripcion = "Describa el problema";
    if (!state.categoria) e.categoria = "Seleccione una categoría";
    if (!state.subcategoria) e.subcategoria = "Seleccione una subcategoría";
    if (!state.articulo) e.articulo = "Seleccione un artículo";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    try {
      const apertura = state.usarFechaApertura ? new Date(state.fechaApertura!) : new Date();

      // TODO: traer horas ANS reales desde tu mapa Excel/JSON
      const horasAns = 2;

      const solucion = calcularFechaSolucion(apertura, horasAns, holidays);
      setFechaSolucion(solucion);

      const payload = {
        ...state,
        ansHoras: horasAns,
        fechaSolucion: solucion.toISOString(),
      };

      alert("Payload:\n\n" + JSON.stringify(payload, null, 2));
    } finally {
      setSubmitting(false);
    }
  };

  return {
    state,
    errors,
    submitting,
    fechaSolucion,
    setField,
    subcats,
    articulos,
    handleSubmit,
    USUARIOS,
  };
}
