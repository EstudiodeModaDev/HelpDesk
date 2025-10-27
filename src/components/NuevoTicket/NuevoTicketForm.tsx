import * as React from "react";
import Select, { components, type OptionProps, type SingleValue } from "react-select";
import "./NuevoTicketForm.css";
import { useFranquicias } from "../../Funcionalidades/Franquicias";
import type { FranquiciasService } from "../../Services/Franquicias.service";
import type { UserOption } from "../../Models/Commons";
import { useGraphServices } from "../../graph/GrapServicesContext";
import { useNuevoTicketForm } from "../../Funcionalidades/NuevoTicket";
import { useWorkers } from "../../Funcionalidades/Workers";
import { useUsuarios } from "../../Funcionalidades/Usuarios";
import { UsuariosSPService } from "../../Services/Usuarios.Service";
import type { TicketsService } from "../../Services/Tickets.service";
import RichTextBase64 from "../RichTextBase64/RichTextBase64";
import type { LogService } from "../../Services/Log.service";
import { norm } from "../../utils/Commons";

export type UserOptionEx = UserOption & { source?: "Empleado" | "Franquicia" };
type CategoriaItem = { ID: string | number; Title: string };

export default function NuevoTicketForm() {
  const {Categorias, SubCategorias, Articulos, Franquicias: FranquiciasSvc, Usuarios: UsuariosSPServiceSvc, Tickets: TicketsSvc, Logs: LogsSvc} = useGraphServices() as ReturnType<typeof useGraphServices> & {
    Franquicias: FranquiciasService;
    Usuarios: UsuariosSPService;
    Tickets: TicketsService;
    Logs: LogService
  };
  const {state, errors, submitting, categorias, subcategoriasAll, articulosAll, loadingCatalogos, setField, handleSubmit,} = useNuevoTicketForm({ Categorias, SubCategorias, Articulos, Tickets: TicketsSvc, Usuarios: UsuariosSPServiceSvc, Logs: LogsSvc});
  const { franqOptions, loading: loadingFranq, error: franqError } = useFranquicias(FranquiciasSvc!);
  const { workersOptions, loadingWorkers, error: usersError } = useWorkers({
    onlyEnabled: true,
  });
  const { UseruserOptions, loading, error } = useUsuarios(UsuariosSPServiceSvc!);

  // ====== Combinar usuarios con franquicias
  const combinedOptions: UserOptionEx[] = React.useMemo(() => {
    const map = new Map<string, UserOptionEx>();
    for (const o of [...workersOptions, ...franqOptions]) {
      const key = (o.value || "").toLowerCase();
      if (!map.has(key)) map.set(key, o);
    }
    return Array.from(map.values()).sort((a, b) => a.label.localeCompare(b.label));
  }, [workersOptions, franqOptions]);

  // ====== Filtro genérico (insensible a acentos) para react-select
  const makeFilter = () =>
    (option: { label?: string }, raw: string) => {
      const q = norm(raw);
      if (!q) return true;
      const label = option?.label ?? "";
      return norm(label).includes(q);
  };

  const userFilter = (option: any, raw: string) => {
    const q = norm(raw);
    if (!q) return true;
    const label = option?.label ?? "";
    const data = option?.data as UserOptionEx | undefined;
    const email = (data as any)?.email ?? "";
    const job = (data as any)?.jobTitle ?? "";
    const haystack = norm(`${label} ${email} ${job}`);
    return haystack.includes(q);
  };

  const Option = (props: OptionProps<UserOptionEx, false>) => {
    const { data, label } = props;
    return (
      <components.Option {...props}>
        <div className="rs-opt">
          <div className="rs-opt__text">
            <span className="rs-opt__title">{label}</span>
            {(data as any).email && <span className="rs-opt__meta">{(data as any).email}</span>}
            {(data as any).jobTitle && <span className="rs-opt__meta">{(data as any).jobTitle}</span>}
          </div>
          {data.source && <span className="rs-opt__tag">{data.source}</span>}
        </div>
      </components.Option>
    );
  };

  // ====== Estado local de IDs (para encadenar por ID) pero guardando títulos en state global
  const [catId, setCatId] = React.useState<string | number | null>(null);
  const [subcatId, setSubcatId] = React.useState<string | number | null>(null);

  // ====== Opciones para selects (react-select)
  const catOptions = React.useMemo(
    () => categorias.map((c: CategoriaItem) => ({ value: String(c.ID), label: c.Title })),
    [categorias]
  );

  const subcats = React.useMemo(() => {
    if (catId == null) return subcategoriasAll;
    return subcategoriasAll.filter(s => String(s.Id_categoria) === String(catId));
  }, [subcategoriasAll, catId]);

  const subcatOptions = React.useMemo(
    () => subcats.map((s) => ({ value: String(s.ID), label: s.Title })),
    [subcats]
  );

  const arts = React.useMemo(() => {
    if (subcatId != null) {
      return articulosAll.filter(a => String(a.Id_subCategoria) === String(subcatId));
    }
    if (catId != null) {
      const subIds = new Set(
        subcategoriasAll
          .filter(s => String(s.Id_categoria) === String(catId))
          .map(s => String(s.ID))
      );
      return articulosAll.filter(a => subIds.has(String(a.Id_subCategoria)));
    }
    return articulosAll;
  }, [articulosAll, subcategoriasAll, catId, subcatId]);

  const artOptions = React.useMemo(
    () => arts.map((a) => ({ value: String(a.ID), label: a.Title })),
    [arts]
  );

  // ====== Valores seleccionados para react-select (a partir del título en state)
  const catValue = React.useMemo(
    () => (state.categoria ? catOptions.find((o) => o.label === state.categoria) ?? null : null),
    [state.categoria, catOptions]
  );
  const subcatValue = React.useMemo(
    () => (state.subcategoria ? subcatOptions.find((o) => o.label === state.subcategoria) ?? null : null),
    [state.subcategoria, subcatOptions]
  );
  const artValue = React.useMemo(
    () => (state.articulo ? artOptions.find((o) => o.label === state.articulo) ?? null : null),
    [state.articulo, artOptions]
  );

  // ====== Handlers (guardan SOLO título en state y manejan IDs locales)
  const onCategoriaChange = (opt: SingleValue<{ value: string; label: string }>) => {
    setCatId(opt ? opt.value : null);
    setSubcatId(null);
    setField("categoria", opt?.label ?? "");
    setField("subcategoria", "");
    setField("articulo", "");
  };

  const onSubcategoriaChange = (opt: SingleValue<{ value: string; label: string }>) => {
    const subId = opt ? opt.value : null;
    setSubcatId(subId);
    setField("subcategoria", opt?.label ?? "");

    if (subId) {
      const sub = subcategoriasAll.find(s => String(s.ID) === String(subId));
      if (sub) {
        setCatId(sub.Id_categoria);
        const catTitle = categorias.find(c => String(c.ID) === String(sub.Id_categoria))?.Title ?? "";
        setField("categoria", catTitle);
      }
    }
  };

  // Al elegir artículo: setea Subcategoría y Categoría
  const onArticuloChange = (opt: SingleValue<{ value: string; label: string }>) => {
    setField("articulo", opt?.label ?? "");

    const artId = opt?.value;
    if (artId) {
      const art = articulosAll.find(a => String(a.ID) === String(artId));
      if (art) {
        // subcategoría
        setSubcatId(art.Id_subCategoria);
        const sub = subcategoriasAll.find(s => String(s.ID) === String(art.Id_subCategoria));
        if (sub) {
          setField("subcategoria", sub.Title);

          // categoría
          setCatId(sub.Id_categoria);
          const catTitle = categorias.find(c => String(c.ID) === String(sub.Id_categoria))?.Title ?? "";
          setField("categoria", catTitle);
        }
      }
    }
  };

  const disabledCats = submitting || loadingCatalogos;
  const disabledSubs = submitting || loadingCatalogos
  const disabledArts = submitting || loadingCatalogos

  return (
    <div>
      <div className="ticket-form ticket-form--xl" data-force-light>
        <h2 className="tf-title">Nuevo Ticket</h2>

        <form onSubmit={handleSubmit} noValidate className="tf-grid">
          {/* Solicitante */}
          <div className="tf-field">
            <label className="tf-label">Solicitante</label>
            <Select<UserOptionEx, false>
              options={combinedOptions}
              placeholder={loadingWorkers || loadingFranq ? "Cargando opciones…" : "Buscar solicitante…"}
              value={state.solicitante as UserOptionEx | null}
              onChange={(opt) => setField("solicitante", opt ?? null)}
              classNamePrefix="rs"
              isDisabled={submitting || loadingWorkers || loadingFranq}
              isLoading={loadingWorkers || loadingFranq}
              filterOption={userFilter}
              components={{ Option }}
              noOptionsMessage={() => (usersError || franqError ? "Error cargando opciones" : "Sin coincidencias")}
              isClearable
            />
            {errors.solicitante && <small className="error">{errors.solicitante}</small>}
          </div>

          {/* Resolutor */}
          <div className="tf-field">
            <label className="tf-label">Resolutor</label>
            <Select<UserOption, false>
              options={UseruserOptions}
              placeholder={loading ? "Cargando usuarios…" : "Buscar resolutor…"}
              value={state.resolutor}
              onChange={(opt) => setField("resolutor", opt ?? null)}
              classNamePrefix="rs"
              isDisabled={submitting || loading}
              isLoading={loading}
              filterOption={userFilter as any}
              components={{ Option: Option as any }}
              noOptionsMessage={() => (error ? "Error cargando usuarios" : "Sin coincidencias")}
              isClearable
            />
            {errors.resolutor && <small className="error">{errors.resolutor}</small>}
          </div>

          {/* Fecha de apertura (opcional) */}
          <div className="tf-field tf-col-2">
            <label className="tf-checkbox">
              <input
                type="checkbox"
                checked={state.usarFechaApertura}
                onChange={(ev) => setField("usarFechaApertura", ev.target.checked)}
                disabled={submitting}
              />
              <span>Escoger fecha de apertura</span>
            </label>
          </div>

          {state.usarFechaApertura && (
            <div className="tf-field tf-col-2">
              <label className="tf-label" htmlFor="fechaApertura">Fecha de apertura</label>
              <input
                id="fechaApertura"
                type="date"
                value={state.fechaApertura ?? ""}
                onChange={(e) => setField("fechaApertura", e.target.value || null)}
                disabled={submitting}
                className="tf-input"
              />
              {errors.fechaApertura && <small className="error">{errors.fechaApertura}</small>}
            </div>
          )}

          {/* Fuente */}
          <div className="tf-field tf-col-2">
            <label className="tf-label" htmlFor="fuente">Fuente Solicitante</label>
            <select
              id="fuente"
              value={state.fuente}
              onChange={(e) => setField("fuente", e.target.value as typeof state.fuente)}
              disabled={submitting}
              className="tf-input"
            >
              <option value="">Seleccione una fuente</option>
              <option value="Correo">Correo</option>
              <option value="Disponibilidad">Disponibilidad</option>
              <option value="Teams">Teams</option>
              <option value="WhatsApp">WhatsApp</option>
              <option value="En persona">Presencial</option>
            </select>
            {errors.fuente && <small className="error">{errors.fuente}</small>}
          </div>

          {/* Motivo */}
          <div className="tf-field tf-col-2">
            <label className="tf-label" htmlFor="motivo">Motivo de la solicitud</label>
            <input
              id="motivo"
              type="text"
              placeholder="Ingrese el motivo"
              value={state.motivo}
              onChange={(e) => setField("motivo", e.target.value)}
              disabled={submitting}
              className="tf-input"
            />
            {errors.motivo && <small className="error">{errors.motivo}</small>}
          </div>

          {/* Descripción */}
          <div className="tf-field tf-col-2">
            <label className="tf-label">Descripción del problema</label>
            <RichTextBase64
              value={state.descripcion}
              onChange={(html) => setField("descripcion", html)}
              placeholder="Describe el problema y pega capturas (Ctrl+V)…"
            />
            {errors.descripcion && <small className="error">{errors.descripcion}</small>}
          </div>

          {/* Categoría / Subcategoría / Artículo */}
          <div className="tf-row tf-row--cats tf-col-2">
            <div className="tf-field">
              <label className="tf-label">Categoría</label>
              <Select
                classNamePrefix="rs"
                options={catOptions}
                value={catValue}
                onChange={onCategoriaChange}
                isDisabled={disabledCats}
                placeholder={loadingCatalogos ? "Cargando categorías..." : "Seleccione una categoría"}
                filterOption={makeFilter()}
                isClearable
              />
              {errors.categoria && <small className="error">{errors.categoria}</small>}
            </div>

            <div className="tf-field">
              <label className="tf-label">Subcategoría</label>
              <Select
                classNamePrefix="rs"
                options={subcatOptions}
                value={subcatValue}
                onChange={onSubcategoriaChange}
                isDisabled={disabledSubs}
                placeholder={
                  catId == null
                    ? "Seleccione una subcategoría"
                    : loadingCatalogos
                    ? "Cargando subcategorías..."
                    : "Seleccione una subcategoría"
                }
                filterOption={makeFilter()}
                isClearable
              />
              {errors.subcategoria && <small className="error">{errors.subcategoria}</small>}
            </div>

            <div className="tf-field">
              <label className="tf-label">Artículo</label>
              <Select
                classNamePrefix="rs"
                options={artOptions}
                value={artValue}
                onChange={onArticuloChange}
                isDisabled={disabledArts}
                placeholder={
                  subcatId == null
                    ? "Seleccione un artículo"
                    : loadingCatalogos
                    ? "Cargando artículos..."
                    : "Seleccione un artículo"
                }
                filterOption={makeFilter()}
                isClearable
              />
            </div>
          </div>

          {/* Archivo */}
          <div className="tf-field tf-col-2">
            <label className="tf-label" htmlFor="archivo">Adjuntar archivo</label>
            <input
              id="archivo"
              type="file"
              onChange={(e) => setField("archivo", e.target.files?.[0] ?? null)}
              disabled={submitting}
              className="tf-input"
            />
          </div>

          {/* Submit */}
          <div className="tf-actions tf-col-2">
            <button type="submit" disabled={submitting || loadingCatalogos} className="tf-submit">
              {submitting ? "Enviando..." : "Enviar Ticket"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
