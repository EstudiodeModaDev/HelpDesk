import Select from "react-select";
import "./NuevoTicketForm.css";

import type { UserOption } from "../../Models/nuevoTicket";
import { useGraphServices } from "../../graph/GrapServicesContext";
import { useNuevoTicketForm } from "../../Funcionalidades/NuevoTicket"; // <- tu hook debe aceptar services

export default function NuevoTicketForm() {
  // Servicios Graph/SharePoint
  const { Categorias, SubCategorias, Articulos } = useGraphServices();

  // Hook del formulario (carga catálogos desde listas)
  const {
    state, errors, submitting, fechaSolucion,
    setField, subcats, articulos, handleSubmit, USUARIOS,
    categorias, loadingCatalogos, // catálogos y estado de carga
  } = useNuevoTicketForm({ Categorias, SubCategorias, Articulos });

  return (
    <div className="ticket-form">
      <h2>Nuevo Ticket</h2>

      {/* Banner ANS cuando existe */}
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
          <div className="form-group inline-group">
            <label>Solicitante</label>
            <Select<UserOption, false>
              options={USUARIOS}
              placeholder="Buscar solicitante..."
              value={state.solicitante}
              onChange={(opt) => setField("solicitante", (opt as UserOption) ?? null)}
              classNamePrefix="rs"
              isDisabled={submitting}
            />
            {errors.solicitante && <small className="error">{errors.solicitante}</small>}
          </div>

          <div className="form-group inline-group">
            <label>Resolutor</label>
            <Select<UserOption, false>
              options={USUARIOS}
              placeholder="Buscar resolutor..."
              value={state.resolutor}
              onChange={(opt) => setField("resolutor", (opt as UserOption) ?? null)}
              classNamePrefix="rs"
              isDisabled={submitting}
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
            <option value="correo">Correo</option>
            <option value="teams">Teams</option>
            <option value="whatsapp">WhatsApp</option>
            <option value="presencial">Presencial</option>
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
              <option value="">{loadingCatalogos ? "Cargando categorías..." : "Seleccione una categoría"}</option>
              {categorias.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre}
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
                  : (loadingCatalogos ? "Cargando subcategorías..." : "Seleccione una subcategoría")}
              </option>
              {subcats.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nombre}
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
                  : (loadingCatalogos ? "Cargando artículos..." : "Seleccione un artículo")}
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
