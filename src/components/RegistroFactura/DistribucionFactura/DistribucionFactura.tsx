// src/components/DistribucionFactura/DistribucionFactura.tsx
import React, { useState, useEffect } from "react";
import "./DistribucionFactura.css";

// 🔽 Hook para traer los proveedores
import { useProveedores } from "../../../Funcionalidades/ProveedoresFactura";
import type { DistribucionFacturaData } from "../../../Models/DistribucionFactura";
import { useDistribucionFactura } from "../../../Funcionalidades/DistribucionFactura";
// import { DistribucionFacturaService } from "../../../Services/DistribucionFactura.service";

export default function DistribucionFactura() {
  // 🧩 Hook de proveedores
  const { proveedores, loading, error } = useProveedores();

  // 🧠 Estados del componente
  const [proveedorSeleccionado, setProveedorSeleccionado] = useState<string>("");

  //estados de la funcionalidad
  const { registrarDistribucion } = useDistribucionFactura();

  const [formData, setFormData] = useState<DistribucionFacturaData>({
    Proveedor: "",
    Title: "",
    CargoFijo: 0,
    CosToImp: 0,
    ValorAnIVA: 0,
    ImpBnCedi: 0,
    ImpBnPalms: 0,
    ImpColorPalms: 0,
    ImpBnCalle: 0,
    ImpColorCalle: 0,
    CosTotMarNacionales: 0,
    CosTotMarImpor: 0,
    CosTotMarCEDI: 0,
    CosTotMarServAdmin: 0,
  });

  // 🔹 Maneja selección de proveedor
  const handleProveedorSeleccionado = (id: string) => {
    setProveedorSeleccionado(id);

    // Si no hay proveedor seleccionado, limpiar campos
    if (!id) {
      setFormData((prev) => ({
        ...prev,
        Proveedor: "",
        Title: "",
      }));
      return;
    }

    // Buscar el proveedor en la lista
    const prov = proveedores.find((p) => String(p.Id) === String(id));

    if (prov) {
      setFormData((prev) => ({
        ...prev,
        Proveedor: prov.Nombre ?? "",
        Title: prov.Title ?? "",
      }));
    } else {
      console.warn("Proveedor seleccionado no encontrado en lista:", id);
    }
  };

  // 🔹 Maneja cambios numéricos
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;

    // Validar solo números (permitiendo decimales)
    if (value !== "" && !/^\d*\.?\d*$/.test(value)) return;

    setFormData((prev) => ({
      ...prev,
      [name]: value === "" ? 0 : parseFloat(value),
    }));
  };

  // 🧮 Recalcular campos automáticos cuando cambien dependencias
  useEffect(() => {
    const {
      CargoFijo,
      CosToImp,
      ImpBnCedi,
      ImpBnPalms,
      ImpColorPalms,
      ImpBnCalle,
      ImpColorCalle,
    } = formData;

    // Calcular ValorAnIVA
    const ValorAnIVA = CargoFijo + CosToImp;

    // Calcular costos automáticos
    const CosTotMarCEDI = CargoFijo / 4 + ImpBnCedi;
    const promedioOtros =
      (ImpBnPalms + ImpColorPalms + ImpBnCalle + ImpColorCalle) / 3;
    const otrosCostos = CargoFijo / 4 + promedioOtros;

    // Actualizar el estado con los valores calculados
    setFormData((prev) => ({
      ...prev,
      ValorAnIVA,
      CosTotMarCEDI,
      CosTotMarNacionales: otrosCostos,
      CosTotMarImpor: otrosCostos,
      CosTotMarServAdmin: otrosCostos,
    }));
  }, [
    formData.CargoFijo,
    formData.CosToImp,
    formData.ImpBnCedi,
    formData.ImpBnPalms,
    formData.ImpColorPalms,
    formData.ImpBnCalle,
    formData.ImpColorCalle,
  ]);

  // 💾 Guardar datos (enviar a SharePoint)
// ✅ Función para manejar el envío del formulario
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();

  try {
    // ⚠️ Validar que se haya seleccionado un proveedor
    if (!formData.Proveedor || !formData.Title) {
      alert("⚠️ Por favor selecciona un proveedor antes de guardar.");
      return;
    }

    // 🧩 Preparamos el registro (eliminamos el Id si existe)
    const record = { ...formData };
    delete (record as any).Id;

    console.log("📤 Enviando distribución a SharePoint:", record);

    // 🟢 Registrar la distribución (usa el hook useDistribucionFactura)
    await registrarDistribucion(record);

    alert("✅ Distribución de factura guardada con éxito");

    // ♻️ Limpiar formulario y proveedor seleccionado
    setProveedorSeleccionado("");
    setFormData({
      Proveedor: "",
      Title: "",
      CargoFijo: 0,
      CosToImp: 0,
      ValorAnIVA: 0,
      ImpBnCedi: 0,
      ImpBnPalms: 0,
      ImpColorPalms: 0,
      ImpBnCalle: 0,
      ImpColorCalle: 0,
      CosTotMarNacionales: 0,
      CosTotMarImpor: 0,
      CosTotMarCEDI: 0,
      CosTotMarServAdmin: 0,
    });

  } catch (error: any) {
    console.error("❌ Error al guardar la distribución:", error);
    alert("⚠️ Ocurrió un error al guardar la distribución. Revisa la consola para más detalles.");
  }
};




  return (
    <div className="distribucion-container">
      <h2>📦 Distribución de Factura</h2>

      <form className="distribucion-form" onSubmit={handleSubmit}>
        <div className="form-grid">
          {/* 🔹 Select de proveedores */}
          <div className="form-group">
            <label htmlFor="proveedor-select">Proveedor:</label>
            {loading ? (
              <span>Cargando...</span>
            ) : error ? (
              <span style={{ color: "red" }}>{error}</span>
            ) : (
              <select
                id="proveedor-select"
                value={proveedorSeleccionado}
                onChange={(e) => handleProveedorSeleccionado(e.target.value)}
              >
                <option value="">-- Selecciona un proveedor --</option>
                {proveedores.map((p) => (
                  <option key={p.Id} value={p.Id}>
                    {p.Nombre}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Campo NIT */}
          <div className="form-group">
            <label htmlFor="nit">NIT:</label>
            <input
              type="text"
              id="nit"
              name="Title"
              value={formData.Title}
              readOnly
            />
          </div>

          {/* Campo Cargo Fijo */}
          <div className="form-group">
            <label htmlFor="CargoFijo">Cargo Fijo:</label>
            <input
              type="text"
              id="CargoFijo"
              name="CargoFijo"
              value={formData.CargoFijo}
              onChange={handleChange}
              placeholder="Ingrese solo números"
            />
          </div>

          {/* Campo CosToImp */}
          <div className="form-group">
            <label htmlFor="CosToImp">Costo de Impresión:</label>
            <input
              type="text"
              id="CosToImp"
              name="CosToImp"
              value={formData.CosToImp}
              onChange={handleChange}
              placeholder="Ingrese solo números"
            />
          </div>

          {/* ValorAnIVA (automático) */}
          <div className="form-group">
            <label htmlFor="ValorAnIVA">Valor antes de IVA:</label>
            <input
              type="text"
              id="ValorAnIVA"
              name="ValorAnIVA"
              value={formData.ValorAnIVA.toFixed(2)}
              readOnly
            />
          </div>

          {/* Campos Impresiones */}
          <div className="form-group">
            <label htmlFor="ImpBnCedi">Imp B/N CEDI</label>
            <input
              type="text"
              id="ImpBnCedi"
              name="ImpBnCedi"
              value={formData.ImpBnCedi}
              onChange={handleChange}
            />
          </div>

          <div className="form-group">
            <label htmlFor="ImpBnPalms">Imp B/N Palms</label>
            <input
              type="text"
              id="ImpBnPalms"
              name="ImpBnPalms"
              value={formData.ImpBnPalms}
              onChange={handleChange}
            />
          </div>

          <div className="form-group">
            <label htmlFor="ImpColorPalms">Imp Color Palms</label>
            <input
              type="text"
              id="ImpColorPalms"
              name="ImpColorPalms"
              value={formData.ImpColorPalms}
              onChange={handleChange}
            />
          </div>

          <div className="form-group">
            <label htmlFor="ImpBnCalle">Imp B/N Calle</label>
            <input
              type="text"
              id="ImpBnCalle"
              name="ImpBnCalle"
              value={formData.ImpBnCalle}
              onChange={handleChange}
            />
          </div>

          <div className="form-group">
            <label htmlFor="ImpColorCalle">Imp Color Calle</label>
            <input
              type="text"
              id="ImpColorCalle"
              name="ImpColorCalle"
              value={formData.ImpColorCalle}
              onChange={handleChange}
            />
          </div>

          {/* Campos automáticos de costos totales */}
          <div className="form-group">
            <label htmlFor="CosTotMarCEDI">Costo Total CEDI</label>
            <input
              type="text"
              id="CosTotMarCEDI"
              name="CosTotMarCEDI"
              value={formData.CosTotMarCEDI.toFixed(2)}
              readOnly
            />
          </div>

          <div className="form-group">
            <label htmlFor="CosTotMarNacionales">Costo Total Nacionales</label>
            <input
              type="text"
              id="CosTotMarNacionales"
              name="CosTotMarNacionales"
              value={formData.CosTotMarNacionales.toFixed(2)}
              readOnly
            />
          </div>

          <div className="form-group">
            <label htmlFor="CosTotMarImpor">Costo Total Importaciones</label>
            <input
              type="text"
              id="CosTotMarImpor"
              name="CosTotMarImpor"
              value={formData.CosTotMarImpor.toFixed(2)}
              readOnly
            />
          </div>

          <div className="form-group">
            <label htmlFor="CosTotMarServAdmin">
              Costo Total Servicios Administrativos
            </label>
            <input
              type="text"
              id="CosTotMarServAdmin"
              name="CosTotMarServAdmin"
              value={formData.CosTotMarServAdmin.toFixed(2)}
              readOnly
            />
          </div>
        </div>

        <button type="submit" className="btn-guardar">
          Guardar Distribución
        </button>
      </form>
    </div>
  );
}
