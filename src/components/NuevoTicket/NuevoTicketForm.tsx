// src/components/NuevoTicketForm.tsx
import * as React from "react";
import Select, { components } from "react-select";
import "./NuevoTicketForm.css";

import type { UserOption, Worker } from "../../Models/Commons";
import { useGraphServices } from "../../graph/GrapServicesContext";
import { useNuevoTicketForm } from "../../Funcionalidades/NuevoTicket";
import { useWorkers } from "../../Funcionalidades/Workers"; // 👈 tu hook Graph

export default function NuevoTicketForm() {
  // Servicios Graph/SharePoint
  const { Categorias, SubCategorias, Articulos } = useGraphServices();

  const {
    state, errors, submitting, fechaSolucion,
    setField, subcats, articulos, handleSubmit,
    categorias, loadingCatalogos,
  } = useNuevoTicketForm({ Categorias, SubCategorias, Articulos });

  const workersToUserOptions = (workers: Worker[]): UserOption[] =>
    workers.map(w => ({
      value: (w.mail || String(w.id) || "").trim(),   // *correo* como valor estable
      label: w.displayName || w.mail || "—",          // texto visible
      id: w.id !== undefined ? String(w.id) : undefined,
      email: w.mail,
      jobTitle: w.jobTitle,
    }));

  const { workers, loading: loadingUsers, error: usersError, refresh } = useWorkers({ onlyEnabled: true, domainFilter: "estudiodemoda.com.co" });

  const userOptions: UserOption[] = React.useMemo(
    () => workersToUserOptions(workers),
    [workers]
  );

  // Búsqueda: incluye nombre, correo y cargo
  const filterOption = React.useCallback(
    (option: any, rawInput: string) => {
      const q = rawInput.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().trim();
      if (!q) return true;
      const w = workers[option.index];
      const haystack = `${w.displayName ?? ""} ${w.mail ?? ""} ${w.jobTitle ?? ""}`
        .normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
      return haystack.includes(q);
    },
    [workers]
  );

  // Render de opción con nombre + correo (bonito)
  const Option = (props: any) => {
    const w = workers[props.index];
    return (
      <components.Option {...props}>
        <div style={{ display: "flex", flexDirection: "column", lineHeight: 1.2 }}>
          <span style={{ fontWeight: 600 }}>{w?.displayName ?? props.label}</span>
          <span style={{ fontSize: 12, opacity: 0.8 }}>{w?.mail}</span>
          {w?.jobTitle && <span style={{ fontSize: 11, opacity: 0.7 }}>{w.jobTitle}</span>}
        </div>
      </components.Option>
    );
  };

  return (
    <div className="ticket-form">
      <h2>Nuevo Ticket</h2>

      {fechaSolucion && (
        <div className="ans-banner">
          Fecha estimada de solución:{" "}
          <strong>
            {new Date(fechaSolucion).toLocaleString("es-CO", { timeZone: "America/Bogota" })}
          </strong>
        </div>
      )}

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
                disabled={loadingUsers || submitting}
              >
                ⟳
              </button>
            </div>
            <Select<UserOption, false>
              options={userOptions}
              placeholder={loadingUsers ? "Cargando usuarios…" : "Buscar solicitante…"}
              value={state.solicitante}
              onChange={(opt) => setField("solicitante", (opt as UserOption) ?? null)}
              classNamePrefix="rs"
              isDisabled={submitting || loadingUsers}
              isLoading={loadingUsers}
              filterOption={filterOption}
              components={{ Option }}
              noOptionsMessage={() =>
                usersError ? "Error cargando usuarios" : "Sin coincidencias"
              }
            />
            {errors.solicitante && <small className="error">{errors.solicitante}</small>}
          </div>

          <div className="form-group inline-group" style={{ minWidth: 300 }}>
            <label>Resolutor</label>
            <Select<UserOption, false>
              options={userOptions}
              placeholder={loadingUsers ? "Cargando usuarios…" : "Buscar resolutor…"}
              value={state.resolutor}
              onChange={(opt) => setField("resolutor", (opt as UserOption) ?? null)}
              classNamePrefix="rs"
              isDisabled={submitting || loadingUsers}
              isLoading={loadingUsers}
              filterOption={filterOption}
              components={{ Option }}
              noOptionsMessage={() =>
                usersError ? "Error cargando usuarios" : "Sin coincidencias"
              }
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

        {/* Categoría / Subcategoría / Artículo */}
        <div className="Categorias">
          <div className="categoria-core">
            <label htmlFor="categoria">Categoría</label>
            <select
              id="categoria"
              className="categoria-select"
              value={state.categoria}
              onChange={(e) => {
                setField("categoria", e.target.value);
                setField("subcategoria", "");
                setField("articulo", "");
              }}
              disabled={submitting || loadingCatalogos}
            >
              <option value="">
                {loadingCatalogos ? "Cargando categorías..." : "Seleccione una categoría"}
              </option>
              {categorias.map((c) => (
                <option key={c.ID} value={c.ID}>
                  {c.Title}
                </option>
              ))}
            </select>
            {errors.categoria && <small className="error">{errors.categoria}</small>}
          </div>

          <div className="categoria-core">
            <label htmlFor="subcategoria">Subcategoría</label>
            <select
              id="subcategoria"
              className="categoria-select"
              value={state.subcategoria}
              onChange={(e) => {
                setField("subcategoria", e.target.value);
                setField("articulo", "");
              }}
              disabled={!state.categoria || submitting || loadingCatalogos}
            >
              <option value="">
                {!state.categoria
                  ? "Seleccione una categoría primero"
                  : loadingCatalogos
                  ? "Cargando subcategorías..."
                  : "Seleccione una subcategoría"}
              </option>
              {subcats.map((s) => (
                <option key={s.ID} value={s.ID}>
                  {s.Title}
                </option>
              ))}
            </select>
            {errors.subcategoria && <small className="error">{errors.subcategoria}</small>}
          </div>

          <div className="categoria-core">
            <label htmlFor="articulo">Artículo</label>
            <select
              id="articulo"
              className="categoria-select"
              value={state.articulo}
              onChange={(e) => setField("articulo", e.target.value)}
              disabled={!state.subcategoria || submitting || loadingCatalogos}
            >
              <option value="">
                {!state.subcategoria
                  ? "Seleccione una subcategoría primero"
                  : loadingCatalogos
                  ? "Cargando artículos..."
                  : "Seleccione un artículo"}
              </option>
              {articulos.map((a) => (
                <option key={a} value={a}>
                  {a}
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
          {state.archivo && <small className="file-hint">Archivo: {state.archivo.name}</small>}
        </div>

        {/* Submit */}
        <button type="submit" disabled={submitting}>
          {submitting ? "Enviando..." : "Enviar Ticket"}
        </button>
      </form>
    </div>
  );
}
