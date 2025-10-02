import * as React from "react";
import Select, { components, type OptionProps, type Props as RSProps } from "react-select";
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

// -------- utils --------
const norm = (s: string) =>
  (s ?? "").normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().trim();

type UserOptionEx = UserOption & { source?: "Empleado" | "Franquicia" };
type CategoriaItem = { ID: string | number; Title: string };

export default function NuevoTicketForm() {
  const {
    Categorias,
    SubCategorias,
    Articulos,
    Franquicias: FranquiciasSvc,
    Usuarios: UsuariosSPServiceSvc,
    Tickets: TicketsSvc
  } = useGraphServices() as ReturnType<typeof useGraphServices> & {
    Franquicias: FranquiciasService;
    Usuarios: UsuariosSPService;
    Tickets: TicketsService
  };

  const {
    state,
    errors,
    submitting,
    categorias,
    subcategoriasAll,
    articulosAll,
    loadingCatalogos,
    setField,
    handleSubmit,
  } = useNuevoTicketForm({ Categorias, SubCategorias, Articulos, Tickets: TicketsSvc });

  const { franqOptions, loading: loadingFranq, error: franqError } = useFranquicias(FranquiciasSvc!);
  const { workersOptions, loadingWorkers, error: usersError, refresh } = useWorkers({
    onlyEnabled: true,
    domainFilter: "estudiodemoda.com.co",
  });
  const { UseruserOptions, loading, error } = useUsuarios(UsuariosSPServiceSvc!);

  // ===== Combinar usuarios con franquicias =====
  const combinedOptions: UserOptionEx[] = React.useMemo(() => {
    const map = new Map<string, UserOptionEx>();
    for (const o of [...workersOptions, ...franqOptions]) {
      const key = (o.value || "").toLowerCase();
      if (!map.has(key)) map.set(key, o);
    }
    return Array.from(map.values()).sort((a, b) => a.label.localeCompare(b.label));
  }, [workersOptions, franqOptions]);

  // ===== Filtro dentro del desplegable =====
  const filterOption: RSProps<UserOptionEx, false>["filterOption"] = (option, raw) => {
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
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
          <div style={{ display: "flex", flexDirection: "column", lineHeight: 1.2 }}>
            <span style={{ fontWeight: 600 }}>{label}</span>
            {(data as any).email && <span style={{ fontSize: 12, opacity: 0.8 }}>{(data as any).email}</span>}
            {(data as any).jobTitle && <span style={{ fontSize: 11, opacity: 0.7 }}>{(data as any).jobTitle}</span>}
          </div>
          {data.source && (
            <span
              style={{
                fontSize: 11,
                padding: "2px 6px",
                borderRadius: 8,
                border: "1px solid rgba(0,0,0,0.15)",
                opacity: 0.8,
                whiteSpace: "nowrap",
              }}
            >
              {data.source}
            </span>
          )}
        </div>
      </components.Option>
    );
  };

  // ===== Estado local SOLO para IDs (encadenamiento por ID) =====
  const [catId, setCatId] = React.useState<string | number | null>(null);
  const [subcatId, setSubcatId] = React.useState<string | number | null>(null);

  // ===== Filtrados locales usando los catálogos del hook =====
  const subcats = React.useMemo(
    () => subcategoriasAll.filter((s) => (catId != null ? String(s.Id_categoria) === String(catId) : false)),
    [subcategoriasAll, catId]
  );

  const articulos = React.useMemo(
    () => articulosAll.filter((a) => (subcatId != null ? String(a.Id_subCategoria) === String(subcatId) : false)),
    [articulosAll, subcatId]
  );

  // ===== Handlers que guardan SOLO títulos en el state global =====
  const onCategoriaChange = (idStr: string) => {
    const id = idStr === "" ? null : isNaN(Number(idStr)) ? idStr : Number(idStr);
    setCatId(id);
    setSubcatId(null);

    const catTitle =
      categorias.find((c: any) => String(c.ID) === String(id))?.Title ??
      categorias.find((c: any) => c.ID === id)?.Title ??
      "";

    setField("categoria", catTitle); // SOLO título
    setField("subcategoria", "");
    setField("articulo", "");
  };

  const onSubcategoriaChange = (idStr: string) => {
    const id = idStr === "" ? null : isNaN(Number(idStr)) ? idStr : Number(idStr);
    setSubcatId(id);

    const subTitle =
      subcats.find((s) => String(s.ID) === String(id))?.Title ?? subcats.find((s) => s.ID === id)?.Title ?? "";

    setField("subcategoria", subTitle); // SOLO título
    setField("articulo", "");
  };

  const onArticuloChange = (idStr: string) => {
    const id = idStr === "" ? null : isNaN(Number(idStr)) ? idStr : Number(idStr);

    const artTitle =
      articulos.find((a) => String(a.ID) === String(id))?.Title ??
      articulos.find((a) => a.ID === id)?.Title ??
      "";

    setField("articulo", artTitle); // SOLO título
  };

  const disabledCats = submitting || loadingCatalogos;
  const disabledSubs = submitting || loadingCatalogos || catId == null;
  const disabledArts = submitting || loadingCatalogos || subcatId == null;

  return (
    <div className="ticket-form">
      <h2>Nuevo Ticket</h2>

      <form onSubmit={handleSubmit} noValidate>
        {/* Solicitante / Resolutor */}
        <div className="form-row">
          <div className="form-group inline-group" style={{ minWidth: 300 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <label>Solicitante</label>
              <button
                type="button"
                onClick={refresh}
                className="mini-reload"
                title="Recargar usuarios"
                disabled={loadingWorkers || submitting}
              >
                ⟳
              </button>
            </div>
            <Select<UserOptionEx, false>
              options={combinedOptions}
              placeholder={loadingWorkers || loadingFranq ? "Cargando opciones…" : "Buscar solicitante…"}
              value={state.solicitante as UserOptionEx | null}
              onChange={(opt) => setField("solicitante", opt ?? null)}
              classNamePrefix="rs"
              isDisabled={submitting || loadingWorkers || loadingFranq}
              isLoading={loadingWorkers || loadingFranq}
              filterOption={filterOption}
              components={{ Option }}
              noOptionsMessage={() => (usersError || franqError ? "Error cargando opciones" : "Sin coincidencias")}
            />
            {errors.solicitante && <small className="error">{errors.solicitante}</small>}
          </div>

          <div className="form-group inline-group" style={{ minWidth: 300 }}>
            <label>Resolutor</label>
            <Select<UserOption, false>
              options={UseruserOptions}
              placeholder={loading ? "Cargando usuarios…" : "Buscar resolutor…"}
              value={state.resolutor}
              onChange={(opt) => setField("resolutor", opt ?? null)}
              classNamePrefix="rs"
              isDisabled={submitting || loading}
              isLoading={loading}
              filterOption={filterOption as any}
              components={{ Option: Option as any }}
              noOptionsMessage={() => (error ? "Error cargando usuarios" : "Sin coincidencias")}
            />
            {errors.resolutor && <small className="error">{errors.resolutor}</small>}
          </div>
        </div>

        {/* Fecha de apertura (opcional) */}
        <div className="form-group checkbox-group">
          <input
            type="checkbox"
            id="fechaAperturaChk"
            checked={state.usarFechaApertura}
            onChange={(ev) => setField("usarFechaApertura", ev.target.checked)}
            disabled={submitting}
          />
          <label htmlFor="fechaAperturaChk">Escoger fecha de apertura</label>
        </div>

        {state.usarFechaApertura && (
          <div className="form-group">
            <label htmlFor="fechaApertura">Fecha de apertura</label>
            <input
              id="fechaApertura"
              type="date"
              value={state.fechaApertura ?? ""}
              onChange={(e) => setField("fechaApertura", e.target.value || null)}
              disabled={submitting}
            />
            {errors.fechaApertura && <small className="error">{errors.fechaApertura}</small>}
          </div>
        )}

        {/* Fuente */}
        <div className="form-group">
          <label htmlFor="fuente">Fuente Solicitante</label>
          <select
            id="fuente"
            value={state.fuente}
            onChange={(e) => setField("fuente", e.target.value as typeof state.fuente)}
            disabled={submitting}
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
        <div className="form-group">
          <label htmlFor="motivo">Motivo de la solicitud</label>
          <input
            id="motivo"
            type="text"
            placeholder="Ingrese el motivo"
            value={state.motivo}
            onChange={(e) => setField("motivo", e.target.value)}
            disabled={submitting}
          />
          {errors.motivo && <small className="error">{errors.motivo}</small>}
        </div>

        {/* Descripción */}
        <div className="form-group">
          <label htmlFor="descripcion">Descripción del problema</label>
          <textarea
            id="descripcion"
            rows={4}
            placeholder="Describa el problema..."
            value={state.descripcion}
            onChange={(e) => setField("descripcion", e.target.value)}
            disabled={submitting}
          />
          {errors.descripcion && <small className="error">{errors.descripcion}</small>}
        </div>

        {/* Categoría / Subcategoría / Artículo – encadenados por ID local; en state guardamos SOLO títulos */}
        <div className="Categorias">
          {/* Categoría */}
          <div className="categoria-core">
            <label htmlFor="categoria">Categoría</label>
            <select
              id="categoria"
              className="categoria-select"
              value={catId ?? ""}
              onChange={(e) => onCategoriaChange(e.target.value)}
              disabled={disabledCats}
            >
              <option value="">
                {loadingCatalogos ? "Cargando categorías..." : "Seleccione una categoría"}
              </option>
              {categorias.map((c: CategoriaItem) => (
                <option key={String(c.ID)} value={String(c.ID)}>
                  {c.Title}
                </option>
              ))}
            </select>
            {errors.categoria && <small className="error">{errors.categoria}</small>}
          </div>

          {/* Subcategoría */}
          <div className="categoria-core">
            <label htmlFor="subcategoria">Subcategoría</label>
            <select
              id="subcategoria"
              className="categoria-select"
              value={subcatId ?? ""}
              onChange={(e) => onSubcategoriaChange(e.target.value)}
              disabled={disabledSubs}
            >
              <option value="">
                {catId == null
                  ? "Seleccione una categoría primero"
                  : loadingCatalogos
                  ? "Cargando subcategorías..."
                  : "Seleccione una subcategoría"}
              </option>
              {subcats.map((s) => (
                <option key={String(s.ID)} value={String(s.ID)}>
                  {s.Title}
                </option>
              ))}
            </select>
            {errors.subcategoria && <small className="error">{errors.subcategoria}</small>}
          </div>

          {/* Artículo */}
          <div className="categoria-core">
            <label htmlFor="articulo">Artículo</label>
            <select
              id="articulo"
              className="categoria-select"
              value={
                state.articulo
                  ? String(articulos.find((a) => a.Title === state.articulo)?.ID ?? "")
                  : ""
              }
              onChange={(e) => onArticuloChange(e.target.value)}
              disabled={disabledArts}
            >
              <option value="">
                {subcatId == null
                  ? "Seleccione una subcategoría primero"
                  : loadingCatalogos
                  ? "Cargando artículos..."
                  : "Seleccione un artículo"}
              </option>
              {articulos.map((a) => (
                <option key={String(a.ID)} value={String(a.ID)}>
                  {a.Title}
                </option>
              ))}
            </select>
            {errors.articulo && <small className="error">{errors.articulo}</small>}
          </div>
        </div>

        {/* Archivo */}
        <div className="form-group">
          <label htmlFor="archivo">Adjuntar archivo</label>
          <input
            id="archivo"
            type="file"
            onChange={(e) => setField("archivo", e.target.files?.[0] ?? null)}
            disabled={submitting}
          />
        </div>

        {/* Submit */}
        <button type="submit" disabled={submitting || loadingCatalogos}>
          {submitting ? "Enviando..." : "Enviar Ticket"}
        </button>
      </form>
    </div>
  );
}
