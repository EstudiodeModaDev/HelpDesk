import * as React from "react";
import toast from "react-hot-toast";
import "./AnsAdmin.css";
import { useGraphServices } from "../../../graph/GrapServicesContext";
import { useRepositories } from "../../../repositories/repositoriesContext";
import { useAnsAdmin, type AnsConNombres, type AnsFormValues } from "../../../Funcionalidades/admin/AnsAdmin";
import type { Categoria, Subcategoria, Articulo } from "../../../Models/Categorias";

const FORM_VACIO: AnsFormValues = { categoriaId: "", subcategoriaId: "", articuloId: "", nivel: "" };

// Rampa de severidad (rojo = ANS 1, más urgente) que termina en el propio
// color de marca de la app (--primary) para el nivel más relajado (ANS 5),
// en vez de un verde genérico ajeno a la paleta del resto de la aplicación.
const NIVEL_COLOR: Record<number, string> = {
  1: "#dc2626",
  2: "#ea580c",
  3: "#d97706",
  4: "#65a30d",
  5: "var(--primary)",
};

// El nivel 5 usa el mismo teal de marca que --primary; para mantener el
// contraste que ya usa el resto de la app sobre ese color (--btn-primary-final
// usa --primary-ink, no blanco), su texto va con --primary-ink en vez de blanco.
const NIVEL_INK: Record<number, string> = { 5: "var(--primary-ink)" };

function nivelNumero(nivel: string): number {
  const m = /(\d+)/.exec(nivel);
  return m ? Number(m[1]) : 0;
}

function colorParaNivel(nivel: string): string {
  return NIVEL_COLOR[nivelNumero(nivel)] ?? "var(--muted)";
}

function inkParaNivel(nivel: string): string {
  return NIVEL_INK[nivelNumero(nivel)] ?? "#fff";
}

type ModalState = { mode: "crear" } | { mode: "editar"; registro: AnsConNombres } | null;

export default function AnsAdmin() {
  const { Categorias, SubCategorias, Articulos } = useGraphServices();
  const { ans } = useRepositories();

  const {
    registros,
    categorias,
    subcategoriasAll,
    articulosAll,
    loading,
    creating,
    updating,
    niveles,
    crear,
    actualizar,
    eliminar,
  } = useAnsAdmin({ Categorias, SubCategorias, Articulos, Ans: ans });

  const [query, setQuery] = React.useState("");
  const [categoriaFiltroId, setCategoriaFiltroId] = React.useState("");
  const [subcategoriaFiltroId, setSubcategoriaFiltroId] = React.useState("");
  const [modal, setModal] = React.useState<ModalState>(null);
  const [pendingDeleteId, setPendingDeleteId] = React.useState<string | null>(null);

  // La subcategoría de filtro se acota a la categoría de filtro elegida (si hay una).
  const subcategoriasFiltro = React.useMemo(
    () =>
      categoriaFiltroId
        ? subcategoriasAll.filter((s) => String(s.Id_categoria) === categoriaFiltroId)
        : subcategoriasAll,
    [subcategoriasAll, categoriaFiltroId]
  );

  const handleCategoriaFiltroChange = (value: string) => {
    setCategoriaFiltroId(value);
    if (value && subcategoriaFiltroId) {
      const sigueValida = subcategoriasAll.some(
        (s) => s.ID === subcategoriaFiltroId && String(s.Id_categoria) === value
      );
      if (!sigueValida) setSubcategoriaFiltroId("");
    }
  };

  const hayFiltrosActivos = Boolean(query || categoriaFiltroId || subcategoriaFiltroId);

  const limpiarFiltros = () => {
    setQuery("");
    setCategoriaFiltroId("");
    setSubcategoriaFiltroId("");
  };

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    return registros.filter((r) => {
      if (categoriaFiltroId && String(r.id_categoria) !== categoriaFiltroId) return false;
      if (subcategoriaFiltroId && String(r.id_subcategoria) !== subcategoriaFiltroId) return false;
      if (!q) return true;
      return `${r.categoriaNombre} ${r.subcategoriaNombre} ${r.articuloNombre} ${r.Title}`
        .toLowerCase()
        .includes(q);
    });
  }, [registros, query, categoriaFiltroId, subcategoriaFiltroId]);

  const handleGuardar = async (form: AnsFormValues) => {
    try {
      if (modal?.mode === "editar") {
        await actualizar(modal.registro.Id!, form);
        toast.success("ANS actualizado");
      } else {
        await crear(form);
        toast.success("ANS creado");
      }
      setModal(null);
    } catch (e: any) {
      toast.error(e?.message ?? "No se pudo guardar el ANS");
    }
  };

  const handleEliminar = async (r: AnsConNombres) => {
    setPendingDeleteId(r.Id!);
  };

  const confirmarEliminar = async (r: AnsConNombres) => {
    try {
      await eliminar(r.Id!);
      toast.success("ANS eliminado");
    } catch (e: any) {
      toast.error(e?.message ?? "No se pudo eliminar el ANS");
    } finally {
      setPendingDeleteId(null);
    }
  };

  return (
    <section className="ansa-page">
      <header className="ansa-hero">
        <div>
          <h1 className="ansa-hero-title">Gestión de ANS</h1>
          <p className="ansa-hero-subtitle">
            Define qué nivel de acuerdo de servicio aplica a cada combinación de categoría, subcategoría y artículo.
          </p>
        </div>
        <button type="button" className="ansa-btn ansa-btn--primary" onClick={() => setModal({ mode: "crear" })}>
          <span aria-hidden="true">＋</span> Nuevo ANS
        </button>
      </header>

      <div className="ansa-filterbar">
        <input
          className="ansa-input"
          placeholder="Buscar por categoría, subcategoría, artículo o nivel"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Buscar ANS"
        />

        <select
          className="ansa-select"
          value={categoriaFiltroId}
          onChange={(e) => handleCategoriaFiltroChange(e.target.value)}
          aria-label="Filtrar por categoría"
        >
          <option value="">Todas las categorías</option>
          {categorias.map((c) => (
            <option key={c.ID} value={c.ID}>
              {c.Title}
            </option>
          ))}
        </select>

        <select
          className="ansa-select"
          value={subcategoriaFiltroId}
          onChange={(e) => setSubcategoriaFiltroId(e.target.value)}
          aria-label="Filtrar por subcategoría"
        >
          <option value="">Todas las subcategorías</option>
          {subcategoriasFiltro.map((s) => (
            <option key={s.ID} value={s.ID}>
              {s.Title}
            </option>
          ))}
        </select>

        {hayFiltrosActivos && (
          <button type="button" className="ansa-btn ansa-btn--ghost" onClick={limpiarFiltros}>
            Limpiar filtros
          </button>
        )}
      </div>

      <div className="ansa-card" role="region" aria-label="Configuración de ANS" tabIndex={0}>
        <table className="ansa-table">
          <thead>
            <tr>
              <th>Categoría</th>
              <th>Subcategoría</th>
              <th>Artículo</th>
              <th style={{ width: "140px" }}>Nivel ANS</th>
              <th style={{ width: "120px" }} />
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="ansa-empty">
                  Cargando…
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={5} className="ansa-empty">
                  Sin resultados
                </td>
              </tr>
            ) : (
              filtered.map((r) => (
                <tr key={r.Id}>
                  <td>{r.categoriaNombre}</td>
                  <td>{r.subcategoriaNombre}</td>
                  <td>{r.articuloNombre}</td>
                  <td>
                    <span
                      className="ansa-badge"
                      style={{ "--ansa-badge-color": colorParaNivel(r.Title), "--ansa-badge-ink": inkParaNivel(r.Title) } as React.CSSProperties}
                    >
                      {r.Title}
                    </span>
                  </td>
                  <td className="ansa-row-actions">
                    {pendingDeleteId === r.Id ? (
                      <div className="ansa-confirm">
                        <span>¿Eliminar?</span>
                        <button type="button" className="ansa-btn ansa-btn--danger ansa-btn--xs" onClick={() => confirmarEliminar(r)}>
                          Sí
                        </button>
                        <button type="button" className="ansa-btn ansa-btn--ghost ansa-btn--xs" onClick={() => setPendingDeleteId(null)}>
                          No
                        </button>
                      </div>
                    ) : (
                      <>
                        <button
                          type="button"
                          className="ansa-icon-btn"
                          title="Editar"
                          aria-label={`Editar ANS de ${r.articuloNombre}`}
                          onClick={() => setModal({ mode: "editar", registro: r })}
                        >
                          ✎
                        </button>
                        <button
                          type="button"
                          className="ansa-icon-btn ansa-icon-btn--danger"
                          title="Eliminar"
                          aria-label={`Eliminar ANS de ${r.articuloNombre}`}
                          onClick={() => handleEliminar(r)}
                        >
                          🗑
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {modal && (
        <AnsFormModal
          mode={modal.mode}
          initial={
            modal.mode === "editar"
              ? {
                  categoriaId: String(modal.registro.id_categoria),
                  subcategoriaId: String(modal.registro.id_subcategoria),
                  articuloId: String(modal.registro.id_articulo),
                  nivel: modal.registro.Title,
                }
              : FORM_VACIO
          }
          categorias={categorias}
          subcategoriasAll={subcategoriasAll}
          articulosAll={articulosAll}
          niveles={niveles}
          saving={modal.mode === "editar" ? updating : creating}
          onCancel={() => setModal(null)}
          onSave={handleGuardar}
        />
      )}
    </section>
  );
}

type AnsFormModalProps = {
  mode: "crear" | "editar";
  initial: AnsFormValues;
  categorias: Categoria[];
  subcategoriasAll: Subcategoria[];
  articulosAll: Articulo[];
  niveles: string[];
  saving: boolean;
  onCancel: () => void;
  onSave: (form: AnsFormValues) => void | Promise<void>;
};

function AnsFormModal({
  mode,
  initial,
  categorias,
  subcategoriasAll,
  articulosAll,
  niveles,
  saving,
  onCancel,
  onSave,
}: AnsFormModalProps) {
  const [form, setForm] = React.useState<AnsFormValues>(initial);

  React.useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onCancel();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel]);

  const subcategoriasForm = React.useMemo(
    () => subcategoriasAll.filter((s) => String(s.Id_categoria) === form.categoriaId),
    [subcategoriasAll, form.categoriaId]
  );
  const articulosForm = React.useMemo(
    () => articulosAll.filter((a) => String(a.Id_subCategoria) === form.subcategoriaId),
    [articulosAll, form.subcategoriaId]
  );

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(form);
  };

  return (
    <div className="ansa-modal-overlay" role="presentation" onMouseDown={(e) => e.target === e.currentTarget && onCancel()}>
      <div className="ansa-modal" role="dialog" aria-modal="true" aria-label={mode === "editar" ? "Editar ANS" : "Nuevo ANS"}>
        <div className="ansa-modal-head">
          <h2>{mode === "editar" ? "Editar ANS" : "Nuevo ANS"}</h2>
          <button type="button" className="ansa-modal-close" onClick={onCancel} aria-label="Cerrar">
            ✕
          </button>
        </div>

        <form className="ansa-modal-body" onSubmit={submit}>
          <div className="ansa-form-field">
            <label className="ansa-form-label">Categoría</label>
            <select
              className="ansa-select ansa-select--block"
              value={form.categoriaId}
              onChange={(e) => setForm({ categoriaId: e.target.value, subcategoriaId: "", articuloId: "", nivel: form.nivel })}
              required
            >
              <option value="">Selecciona…</option>
              {categorias.map((c) => (
                <option key={c.ID} value={c.ID}>
                  {c.Title}
                </option>
              ))}
            </select>
          </div>

          <div className="ansa-form-field">
            <label className="ansa-form-label">Subcategoría</label>
            <select
              className="ansa-select ansa-select--block"
              value={form.subcategoriaId}
              onChange={(e) => setForm((s) => ({ ...s, subcategoriaId: e.target.value, articuloId: "" }))}
              disabled={!form.categoriaId}
              required
            >
              <option value="">Selecciona…</option>
              {subcategoriasForm.map((s) => (
                <option key={s.ID} value={s.ID}>
                  {s.Title}
                </option>
              ))}
            </select>
          </div>

          <div className="ansa-form-field">
            <label className="ansa-form-label">Artículo</label>
            <select
              className="ansa-select ansa-select--block"
              value={form.articuloId}
              onChange={(e) => setForm((s) => ({ ...s, articuloId: e.target.value }))}
              disabled={!form.subcategoriaId}
              required
            >
              <option value="">Selecciona…</option>
              {articulosForm.map((a) => (
                <option key={a.ID} value={a.ID}>
                  {a.Title}
                </option>
              ))}
            </select>
          </div>

          <div className="ansa-form-field">
            <label className="ansa-form-label">Nivel ANS</label>
            <div className="ansa-nivel-picker">
              {niveles.map((n) => (
                <button
                  type="button"
                  key={n}
                  className={`ansa-nivel-chip ${form.nivel === n ? "is-selected" : ""}`}
                  style={{ "--ansa-badge-color": colorParaNivel(n), "--ansa-badge-ink": inkParaNivel(n) } as React.CSSProperties}
                  onClick={() => setForm((s) => ({ ...s, nivel: n }))}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          <div className="ansa-modal-actions">
            <button type="button" className="ansa-btn ansa-btn--ghost" onClick={onCancel}>
              Cancelar
            </button>
            <button type="submit" className="ansa-btn ansa-btn--primary" disabled={saving}>
              {saving ? "Guardando…" : "Guardar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
