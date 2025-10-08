// Funcionalidades/Escalamiento.ts
import * as React from "react";
import { useGraphServices } from "../graph/GrapServicesContext";
import { useAuth } from "../auth/authContext";
import type { SociedadesService } from "../Services/Sociedades.service";
import type { FormEscalamientoState, InternetTiendas } from "../Models/Internet";
import type { Sociedades } from "../Models/Sociedades";
import type { LogService } from "../Services/Log.service";
import { FlowClient } from "./FlowClient";
import type { Escalamiento, } from "../Models/FlujosPA";
import type { InternetTiendasService } from "../Services/InternetTiendas.service";

const normLower = (s?: string | null) =>
  String(s ?? "").normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().trim();
const normUpper = (s?: string | null) =>
  String(s ?? "").normalize("NFD").replace(/\p{Diacritic}/gu, "").toUpperCase().trim();

const MAX_MB = 3;               // útil si enviarás por Graph como inline
const MAX_BYTES = MAX_MB * 1024 * 1024;
const ALLOWED = ["image/png", "image/jpeg", "application/pdf"]; // ajusta
const MAX_FILES = 10;

async function fileToBase64(file: File): Promise<string> {
  const buf = await file.arrayBuffer();
  let binary = "";
  const bytes = new Uint8Array(buf);
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk) as any);
  }
  return btoa(binary);
}

const notifyFlow = new FlowClient("https://defaultcd48ecd97e154f4b97d9ec813ee42b.2c.environment.api.powerplatform.com:443/powerautomate/automations/direct/workflows/a031c29889694d0184b5f480c5dc9834/triggers/manual/paths/invoke?api-version=1&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=WFf3MbRjOYrUiFpzepTr0aeEM4zSyBBds-RLDxejy1I")

export function useEscalamiento(correoSolicitante: string, ticketId: string) {
    const { account } = useAuth();
    const {Logs: LogSvc, Sociedades: SociedadesSvc, InternetTiendas: IntTiendasSvc} = useGraphServices() as ReturnType<typeof useGraphServices> & {
        Logs: LogService;
        Sociedades: SociedadesService;
        InternetTiendas: InternetTiendasService
    };
    const [loading, setLoading] = React.useState(false);
    const [error, setError] = React.useState<string | null>(null);
    const [infoInternet, setInfoInternet] = React.useState<InternetTiendas | null>(null);
    const [compania, setCompania] = React.useState<Sociedades | null>(null);
    const [state, setState] = React.useState<FormEscalamientoState>({
        proveedor: "",
        identificador: "",
        tienda: "",
        ciudad: "",
        empresa: "",
        nit: "",
        centroComercial: "",
        local: "",
        nombre: "",
        apellidos: "",
        cedula: "",
        telefono: "313 745 3700/319 254 9920",
        descripcion: "",
        adjuntos: [],
    });
    const setField = <K extends keyof FormEscalamientoState>(k: K, v: FormEscalamientoState[K]) => setState((s) => ({ ...s, [k]: v }));


    const handleFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const incoming = Array.from(files);
    const filtered = incoming.filter(
        (f) => (ALLOWED.length === 0 || ALLOWED.includes(f.type)) && f.size <= MAX_BYTES
    );
    if (filtered.length === 0) return;

    setState((s) => ({
        ...s,
        adjuntos: [...(s.adjuntos ?? []), ...filtered].slice(0, MAX_FILES),
    }));
    };

    const load = React.useCallback(async () => {
        setLoading(true);
        setError(null);
        try {

        // buscar por correo del solicitante (usa CORREO si existe; si no, Title)
        const correoNorm = normLower(correoSolicitante);
        const Tiendas = await IntTiendasSvc.getAll({filter: `fields/CORREO eq '${String(correoNorm).replace(/'/g, "''")}'`,top: 1});
        const tiendaSel = Tiendas[0]
        setInfoInternet(tiendaSel)

        if (tiendaSel) {
            const compNorm = normUpper((tiendaSel as any).Compa_x00f1__x00ed_a);
            const Companias = await SociedadesSvc.getAll({filter: `fields/CORREO eq '${String(correoNorm).replace(/'/g, "''")}'`,top: 1});
            const comp = (Companias ?? []).find((s: Sociedades) => normUpper(s.Title) === compNorm) ?? null;
            setCompania(comp);

            //Setear state
            setState({
                apellidos: account?.name!,
                cedula: "",
                centroComercial: infoInternet?.Centro_x0020_Comercial ?? "",
                ciudad: infoInternet?.Title ?? "",
                descripcion: "",
                empresa: infoInternet?.Compa_x00f1__x00ed_a ?? "",
                identificador: infoInternet?.IDENTIFICADOR ?? "",
                local: infoInternet?.Local ?? "",
                nit: compania?.Nit ?? "",
                nombre: account?.username ?? "",
                proveedor: infoInternet?.PROVEEDOR ?? "",
                telefono: "313 745 3700/319 254 9920",
                tienda: infoInternet?.Tienda ?? "",
                adjuntos: []
            })
        } else {
            setCompania(null);
        }
        } catch (e: any) {
        setError(e?.message ?? "Error al inicializar escalamiento");
        } finally {
        setLoading(false);
        }
    }, [SociedadesSvc, correoSolicitante]);

    const onSearch = React.useCallback(async (term: string) => {
        setLoading(true);
        setError(null);
        try {
             // Busca la tienda por CORREO (usa top:1 si esperas único resultado)
            const tiendas = await IntTiendasSvc.getAll({filter: `(fields/CORREO eq '${term}' or fields/Tienda eq '${term}' fields/IDENTIFICADOR eq '${term}')`, top: 1, });
            const tiendaSel = tiendas?.[0] ?? null;
            setInfoInternet(tiendaSel);

            //Si hay tienda, busca la compañía por Title (ajusta el campo si es otro)
            if (tiendaSel) {
                const compName = (tiendaSel as any).Compa_x00f1__x00ed_a ?? (tiendaSel as any).Compania ?? "";
                const compEsc = String(compName).replace(/'/g, "''");

                // Busca la sociedad por Título exacto
                const sociedades = await SociedadesSvc.getAll({
                filter: `fields/Title eq '${compEsc}'`,
                top: 1,
                });

                setCompania(sociedades?.[0] ?? null);
                setState({
                    apellidos: account?.name!,
                    cedula: "",
                    centroComercial: infoInternet?.Centro_x0020_Comercial ?? "",
                    ciudad: infoInternet?.Title ?? "",
                    descripcion: "",
                    empresa: infoInternet?.Compa_x00f1__x00ed_a ?? "",
                    identificador: infoInternet?.IDENTIFICADOR ?? "",
                    local: infoInternet?.Local ?? "",
                    nit: compania?.Nit ?? "",
                    nombre: account?.username ?? "",
                    proveedor: infoInternet?.PROVEEDOR ?? "",
                    telefono: "313 745 3700/319 254 9920",
                    tienda: infoInternet?.Tienda ?? "",
                    adjuntos: []
                })
            } else {
                setCompania(null);
            }
        } catch (e: any) {
        setError(e?.message ?? "Error al inicializar escalamiento");
        } finally {
        setLoading(false);
        }
    },
    [IntTiendasSvc, SociedadesSvc, correoSolicitante]
    );

    const handleSubmit = React.useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const created = LogSvc.create({
                Actor: account?.username ?? "",
                CorreoActor: account?.name ?? "",
                Tipo_de_accion: "seguimiento",
                Descripcion: `Se ha iniciado un escalamiento de internet al proveedor: ${state.proveedor} para la tienda: ${state.tienda}`,
                Title: ticketId
            })
            alert("Se ha iniciado el escalamiento de servicio de internet")
            console.log(created)
            try {
            await notifyFlow.invoke<Escalamiento, any>({
                adjuntos: await Promise.all((state.adjuntos ?? []).map(async (f) => ({name: f.name, size: f.size, type:f.type || "application/octet-stream", contentBase: await fileToBase64(f)}))),
                apellidos: state.apellidos,
                cedula: state.cedula,
                centroComercial: state.centroComercial,
                ciudad: state.ciudad,
                descripcion: state.descripcion,
                empresa: state.empresa,
                identificador: state.identificador,
                local: state.local,
                nit: state.nit,
                nombre: state.nombre,
                proveedor: state.proveedor,
                telefono: state.telefono,
                tienda: state.tienda
            });
            alert("Se ha enviado el correo.")
            } catch (err) {
            console.error("[Flow] Error enviando a resolutor:", err);
            }


        } catch (e: any) {
        setError(e?.message ?? "Error al inicializar escalamiento");
        } finally {
        setLoading(false);
        }
},
[IntTiendasSvc, SociedadesSvc, correoSolicitante]
);


  React.useEffect(() => {
    let cancel = false;
    (async () => {
      setLoading(true);
      setError(null);
      try { await load(); } finally { if (!cancel) setLoading(false); }
    })();
    return () => { cancel = true; };
  }, [load]);

  return {
    loading,
    error,
    user: account,  
    infoInternet,
    compania,
    reload: load,
    onSearch,
    state,
    setField,
    handleFiles,
    handleSubmit
  };
}
