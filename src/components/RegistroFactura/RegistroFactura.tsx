// src/components/RegistrarFactura/RegistroFactura.tsx
import React, { useState } from "react";
import { useFacturas } from "../../Funcionalidades/RegistrarFactura";
import FacturasLista from "./FacturasLista/FacturasLista";
//import FacturaFiltros from "./FacturaFiltros"; // ✅ Nuevo import
import type { ReFactura } from "../../Models/RegistroFacturaInterface";
import FacturaFiltros from "./FacturaFiltros/FacturaFiltros";

// 🧾 Componente principal del registro de facturas
export default function RegistroFactura() {
  // 🎣 Usamos el hook con la lógica de negocio
  const { registrarFactura } = useFacturas();

  // 🗂️ Controla si se muestra la lista o el formulario
  const [mostrarLista, setMostrarLista] = useState(false);

  // 📋 Estado del formulario
  const [formData, setFormData] = useState<ReFactura>({
    fechadeemision: "",
    numerofactura: "",
    proveedor: "",
    Title: "",
    tipodefactura: "",
    item: "",
    descripcionitem: "",
    valor: 0,
    cc: "",
    co: "",
    un: "",
    detalle: "",
  });

  // 📝 Actualiza el estado cada vez que se cambia un input
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === "valor" ? Number(value) : value, // convierte el valor a número si es 'valor'
    }));
  };

  // 💾 Enviar el formulario
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); // evita que se recargue la página
    await registrarFactura(formData); // usa el hook para guardar
    alert("✅ Factura registrada con éxito");

    // 🔁 Limpia el formulario
    setFormData({
      fechadeemision: "",
      numerofactura: "",
      proveedor: "",
      Title: "",
      tipodefactura: "",
      item: "",
      descripcionitem: "",
      valor: 0,
      cc: "",
      co: "",
      un: "",
      detalle: "",
    });
  };

  // 🧠 Estado de filtros (solo se usa cuando está activa la vista de lista)
  const [filtros, setFiltros] = useState<Partial<ReFactura>>({
    fechadeemision: "",
    numerofactura: "",
    proveedor: "",
    Title: "",
    tipodefactura: "",
  });

  // 🔍 Maneja los cambios en los campos de filtro
  const handleFiltroChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFiltros((prev) => ({ ...prev, [name]: value }));
  };

  // 🖼️ Render
  return (
    <div className="registro-container">
      <h2>{mostrarLista ? "📄 Facturas Registradas" : "Registro de Facturas"}</h2>

      {/* Si no se está mostrando la lista, renderiza el formulario */}
      {!mostrarLista ? (
        <form className="registro-form" onSubmit={handleSubmit}>
          <div className="form-grid">
            {/* 🔹 Aquí irían todos los campos (inputs y selects) que ya tenías */}
            <div className="campo">
              <label>
                Fecha de emisión
                <input
                  type="date"
                  name="fechadeemision"
                  value={formData.fechadeemision}
                  onChange={handleChange}
                  required
                />
              </label>
            </div>
            {/* ... resto de los inputs idénticos ... */}
          </div>

          {/* 🔘 Botones */}
          <div className="botones-container">
            <button type="submit" className="btn-registrar">💾 Registrar Factura</button>

            <button
              type="button"
              className="btn-ver-facturas"
              onClick={() => setMostrarLista(true)}
            >
              📄 Mostrar Facturas
            </button>
          </div>
        </form>
      ) : (
        // 📋 Si mostrarLista = true, muestra el componente de lista
        <div>
          {/* 🧭 BLOQUE NUEVO: filtros de búsqueda */}
          {/* Este bloque permite filtrar la lista según varios criterios */}
          <FacturaFiltros filtros={filtros} onChange={handleFiltroChange} />
          {/* 📑 Luego mostramos la lista, pasando el callback para volver */}
          <FacturasLista onVolver={() => setMostrarLista(false)} />
        </div>
      )}
    </div>
  );
}
