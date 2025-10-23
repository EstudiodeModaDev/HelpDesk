import React from "react";
import { useUsuarios } from "../../Funcionalidades/Usuarios";
import { useGraphServices } from "../../graph/GrapServicesContext";
import "./Usuarios.css"

export default function UsuariosPanel() {
    const { Usuarios } = useGraphServices();
    const { /*administradores,*/ tecnicos, loading} = useUsuarios(Usuarios)   
    const [search, setSearch] = React.useState("");
    const [mostrar, setMostrar] = React.useState<string>("Tecnicos");

    const handleChangeMostrar = (val: string) => {
        setMostrar(val);
    };

    return (
    <section className="users-page" aria-label="Gestión de usuarios">
        <header className="users-header">
        <h2>{mostrar}</h2>

        <div className="users-toolbar">
            <input className="users-search" placeholder="Buscar Usuario" value={search} onChange={(e) => setSearch(e.target.value)}/>

            <div className="users-select-wrap">
                <select className="users-select" value={mostrar} onChange={(e) => handleChangeMostrar(e.target.value)} aria-label="Filtrar por franquicia">
                    <option value="Franquicias">Franquicias</option>
                    <option value="Tecnicos">Resolutores</option>
                    <option value="Admin">Administradores</option>
                </select>
            <span className="select-caret" aria-hidden>
                ▾
            </span>
            </div>

            <button type="button" className="icon-btn" title="Agregar" aria-label="Agregar usuario">
                <svg width="24" height="24" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" fill="none">
                    <path d="M12 5v14M5 12h14" />
                </svg>
            </button>
        </div>
        </header>

        <div className="users-table-wrap">
        <table className="users-table">
            <thead>
            <tr>
                <th style={{ width: "44%" }}>Nombre</th>
                <th style={{ width: "36%" }}>Correo</th>
                <th style={{ width: "16%" }}>{mostrar === "Franquicias" ? "Contacto" : "Rol"}</th>
                <th style={{ width: "4%" }} aria-label="Acciones" />
            </tr>
            </thead>

            <tbody>
            {mostrar === "Tecnicos" && tecnicos.map((u) => (
                <tr key={u.Id}>
                    <td><div className="cell-name">{u.Title}</div></td>

                    <td><div className="cell-name">{u.Correo}</div></td>
                    
                    <td>{u.Rol || "—"}</td>
                    
                    <td className="cell-actions">
                        <button type="button" className="icon-btn danger" title="Eliminar" aria-label={`Eliminar ${u.Title}`} /*onClick={() => onEliminar?.(u.id)}*/>
                        <svg width="18" height="18" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" fill="none">
                            <polyline points="3 6 5 6 21 6" />
                            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                            <path d="M10 11v6M14 11v6" />
                            <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                        </svg>
                        </button>
                    </td>
                </tr>
            ))}

            {loading&& (
                <tr>
                <td colSpan={4} className="empty-state">
                    No hay usuarios para los filtros seleccionados.
                </td>
                </tr>
            )}
            </tbody>
        </table>
        </div>
    </section>
    );

}