// src/components/DistribucionFactura/DistribucionFactura.tsx
import React, { useState, useEffect } from "react";
import "./DistribucionFactura.css";
import { useProveedores } from "../../../Funcionalidades/ProveedoresFactura";
import type { DistribucionFacturaData } from "../../../Models/DistribucionFactura";
import { useDistribucionFactura } from "../../../Funcionalidades/DistribucionFactura";
import { formatPesosEsCO, toNumberFromEsCO } from "../../../utils/Number";

export default function DistribucionFactura() {
  const { proveedores, loading, error } = useProveedores();
  const { registrarDistribucion } = useDistribucionFactura();

  const [proveedorSeleccionado, setProveedorSeleccionado] = useState<string>("");
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
    CosTotCEDI: 0,
    CosTotServAdmin: 0,
  });
  const [displayCargoFijo, setdisplayCargoFijo] = React.useState("");
  const [displayCostoTotalImpresion, setdisplayCostoTotalImpresion] = React.useState("");
  const [displayValorAntesIva, setdisplayValorAntesIva] = React.useState("");
  const [displayImpresionesBNCedi, setdisplayImpresionesBNCedi] = React.useState("");
  const [displayImpresionesBNPalms, setdisplayImpresionesBNPalms] = React.useState("");
  const [displayImpresionesColorPalms, setdisplayImpresionesColorPalms] = React.useState("");
  const [displayImpresionesBNCalle, setdisplayImpresionesBNCalle] = React.useState("");
  //const [displayTotalCedi, setdisplayTotalCedi] = React.useState("");
  //const [displayTotalMarcasNacionales, setdisplayTotalMarcasNacionales] = React.useState("");
  //const [displayTotalMarcasImportadas, setDisplayMarcasImportadas] = React.useState("");
  //const [displayServiciosAdministrativos, setdisplayServiciosAdministrativos] = React.useState("");

  const handleProveedorSeleccionado = (id: string) => {
    setProveedorSeleccionado(id);
    if (!id) {
      setFormData((prev) => ({ ...prev, Proveedor: "", Title: "" }));
      return;
    }
    const prov = proveedores.find((p) => String(p.Id) === String(id));
    if (prov) {
      setFormData((prev) => ({
        ...prev,
        Proveedor: prov.Nombre ?? "",
        Title: prov.Title ?? "",
      }));
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    if (value !== "" && !/^\d*\.?\d*$/.test(value)) return;
    setFormData((prev) => ({
      ...prev,
      [name]: value === "" ? 0 : parseFloat(value),
    }));
  };

  useEffect(() => {
    const {CargoFijo, CosToImp, ImpBnCedi, ImpBnPalms, ImpColorPalms, ImpBnCalle, ImpColorCalle,} = formData;

    const cargoFijo3 = CargoFijo - (CargoFijo / 3)
    const ValorAnIVA = CargoFijo + CosToImp;
    const CosTotCEDI =  (CargoFijo/3) + ImpBnCedi;
    const promedioOtros = (ImpBnPalms + ImpColorPalms + ImpBnCalle + ImpColorCalle) / 3;
    const otrosCostos = (cargoFijo3/3) + promedioOtros;
    const totalImpresion = ImpBnCalle + ImpBnCedi + ImpBnPalms + ImpColorCalle + ImpBnPalms

    setdisplayCostoTotalImpresion(formatPesosEsCO(String(totalImpresion)))
    setdisplayValorAntesIva(formatPesosEsCO(String(ValorAnIVA)))

    setFormData((prev) => ({
      ...prev,
      ValorAnIVA,
      CosTotCEDI,
      CosTotMarNacionales: otrosCostos,
      CosTotMarImpor: otrosCostos,
      CosTotServAdmin: otrosCostos,
      CosToImp: totalImpresion
    }));
  }, [formData.CargoFijo, formData.CosToImp, formData.ImpBnCedi, formData.ImpBnPalms, formData.ImpColorPalms, formData.ImpBnCalle, formData.ImpColorCalle,]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (!formData.Proveedor || !formData.Title) {
        alert("⚠️ Por favor selecciona un proveedor antes de guardar.");
        return;
      }

      // ⚠️ Validación de costos de impresión
      const sumaCostos =
        formData.CosTotCEDI +
        formData.CosTotMarNacionales +
        formData.CosTotMarImpor +
        formData.CosTotServAdmin;

      // Permitimos una pequeña diferencia por redondeo
      const diferencia = Math.abs(sumaCostos - formData.CosToImp);

      if (diferencia > 0.01) {
        alert(
          `⚠️ Los costos de impresión no coinciden.\n\nCosto de impresión declarado: ${formData.CosToImp.toFixed(
            2
          )}\nSuma de costos calculados: ${sumaCostos.toFixed(
            2
          )}\n\nPor favor revisa los valores.`
        );
        return;
      }

      const record = { ...formData };
      delete (record as any).Id;

      console.log("📤 Enviando distribución a SharePoint:", record);
      await registrarDistribucion(record);

      alert("✅ Distribución de factura guardada con éxito");

      // ♻️ Reset
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
        CosTotCEDI: 0,
        CosTotServAdmin: 0,
      });
    } catch (error: any) {
      console.error("❌ Error al guardar la distribución:", error);
      alert(
        "⚠️ Ocurrió un error al guardar la distribución. Revisa la consola para más detalles."
      );
    }
  };

  const setField = <K extends keyof DistribucionFacturaData>(k: K, v: DistribucionFacturaData[K]) => setFormData((s) => ({ ...s, [k]: v }));

  return (
    <div className="distribucion-container">
      <h2>📦 Distribución de Factura</h2>

      <form className="distribucion-form" onSubmit={handleSubmit}>
        <div className="form-grid">
          {/* 🔹 Proveedor y NIT en la misma línea */}
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="proveedor-select">Proveedor:</label>
              {loading ? (
                <span>Cargando...</span>
              ) : error ? (
                <span style={{ color: "red" }}>{error}</span>
              ) : (
                <select id="proveedor-select" value={proveedorSeleccionado} onChange={(e) => handleProveedorSeleccionado(e.target.value)}>
                  <option value="">-- Selecciona un proveedor --</option>
                  {proveedores.map((p) => (
                    <option key={p.Id} value={p.Id}>
                      {p.Nombre}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="nit">NIT:</label>
              <input type="text" id="nit" name="Title" value={formData.Title} readOnly />
            </div>
          </div>

          {/* Campo Cargo Fijo */}
          <div className="form-group">
            <label htmlFor="CargoFijo">Cargo Fijo:</label>
            <input type="text" inputMode="numeric" name="CargoFijo" placeholder="Ej: 100.000,00" value={String(displayCargoFijo)}  
              onChange={(e) => {
                const raw = e.target.value;
                const f = formatPesosEsCO(raw);
                const num = toNumberFromEsCO(f);
                setdisplayCargoFijo(f);
                setField("CargoFijo", num)
              }}
              onBlur={() => {
                const num = toNumberFromEsCO(displayCargoFijo);
                setdisplayCargoFijo(
                  new Intl.NumberFormat("es-CO", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                  }).format(Number.isFinite(num) ? num : 0)
                );
              }}/>
          </div>

          {/* Campo CosToImp */}
          <div className="form-group">
            <label htmlFor="CosToImp">Costo total de Impresión:</label>
            <input type="text" inputMode="numeric" name="CosToImp" placeholder="Se llenara automaticamente" value={String(displayCostoTotalImpresion)}  
              onBlur={() => {
                const num = toNumberFromEsCO(displayCostoTotalImpresion);
                setdisplayCostoTotalImpresion(
                  new Intl.NumberFormat("es-CO", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                  }).format(Number.isFinite(num) ? num : 0)
                );
              }}
              readOnly/>
          </div>

          {/* ValorAnIVA */}
          <div className="form-group">
            <label htmlFor="ValorAnIVA">Valor antes de IVA:</label>
            <input type="text" inputMode="numeric" name="ValorAnIVA" placeholder="Se llenara automaticamente" value={String(displayValorAntesIva)}  
              onBlur={() => {
                const num = toNumberFromEsCO(displayValorAntesIva);
                setdisplayValorAntesIva(
                  new Intl.NumberFormat("es-CO", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                  }).format(Number.isFinite(num) ? num : 0)
                );
              }}
              readOnly/>
          </div>

          {/* Campos Impresiones */}
          <div className="form-group">
            <label htmlFor="ImpBnCedi">Impresiones B/N CEDI</label>
            <input type="text" inputMode="numeric" name="ImpBnCedi" placeholder="Ej: 100.000" value={String(displayImpresionesBNCedi)}  
              onChange={(e) => {
                const raw = e.target.value;
                const f = formatPesosEsCO(raw);
                const num = toNumberFromEsCO(f);
                setdisplayImpresionesBNCedi(f);
                setField("ImpBnCedi", num)
              }}
              onBlur={() => {
                const num = toNumberFromEsCO(displayImpresionesBNCedi);
                setdisplayImpresionesBNCedi(
                  new Intl.NumberFormat("es-CO", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                  }).format(Number.isFinite(num) ? num : 0)
                );
              }}/>
          </div>

          <div className="form-group">
            <label htmlFor="ImpBnPalms">Impresiones B/N 35 Palms</label>
            <input type="text" inputMode="numeric" name="ImpBnPalms" placeholder="Ej: 100.000" value={String(displayImpresionesBNPalms)}  
              onChange={(e) => {
                const raw = e.target.value;
                const f = formatPesosEsCO(raw);
                const num = toNumberFromEsCO(f);
                setdisplayImpresionesBNPalms(f);
                setField("ImpBnPalms", num)
              }}
              onBlur={() => {
                const num = toNumberFromEsCO(displayImpresionesBNPalms);
                setdisplayImpresionesBNPalms(
                  new Intl.NumberFormat("es-CO", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                  }).format(Number.isFinite(num) ? num : 0)
                );
              }}/>
          </div>

          <div className="form-group">
            <label htmlFor="ImpColorPalms">Impresiones Color 35 Palms</label>
            <input type="text" inputMode="numeric" name="ImpColorPalms" placeholder="Ej: 100.000" value={String(displayImpresionesColorPalms)}  
              onChange={(e) => {
                const raw = e.target.value;
                const f = formatPesosEsCO(raw);
                const num = toNumberFromEsCO(f);
                setdisplayImpresionesColorPalms(f);
                setField("ImpColorPalms", num)
              }}
              onBlur={() => {
                const num = toNumberFromEsCO(displayImpresionesBNPalms);
                setdisplayImpresionesColorPalms(
                  new Intl.NumberFormat("es-CO", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                  }).format(Number.isFinite(num) ? num : 0)
                );
              }}/>
          </div>

          <div className="form-group">
            <label htmlFor="ImpBnCalle">Impresiones B/N Calle</label>
            <input type="text" inputMode="numeric" name="ImpColorPalms" placeholder="Ej: 100.000" value={String(displayImpresionesBNCalle)}  
              onChange={(e) => {
                const raw = e.target.value;
                const f = formatPesosEsCO(raw);
                const num = toNumberFromEsCO(f);
                setdisplayImpresionesBNCalle(f);
                setField("ImpColorPalms", num)
              }}
              onBlur={() => {
                const num = toNumberFromEsCO(displayImpresionesBNCalle);
                setdisplayImpresionesBNCalle(
                  new Intl.NumberFormat("es-CO", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                  }).format(Number.isFinite(num) ? num : 0)
                );
              }}/>
          </div>

          <div className="form-group">
            <label htmlFor="ImpColorCalle">Impresiones Color Calle</label>
            <input type="number" id="ImpColorCalle" name="ImpColorCalle" value={formData.ImpColorCalle} onChange={handleChange}/>
          </div>

          {/* Campos automáticos de costos totales */}
          <div className="form-group">
            <label htmlFor="CosTotCEDI">Costo Total del CEDI-Automatico</label>
            <input type="number" id="CosTotCEDI" name="CosTotCEDI" value={formData.CosTotCEDI.toFixed(2)} readOnly/>
          </div>

          <div className="form-group">
            <label htmlFor="CosTotMarNacionales">Costo Total Marcas Nacionales-Automatico</label>
            <input type="number" id="CosTotMarNacionales" name="CosTotMarNacionales" value={formData.CosTotMarNacionales.toFixed(2)} readOnly/>
          </div>

          <div className="form-group">
            <label htmlFor="CosTotMarImpor">Costo Total Marcas Importaciones-Automatico</label>
            <input type="number" id="CosTotMarImpor" name="CosTotMarImpor" value={formData.CosTotMarImpor.toFixed(2)} readOnly/>
          </div>

          <div className="form-group">
            <label htmlFor="CosTotServAdmin">
              Costo Total de Servicios Administrativos-Automatico
            </label>
            <input type="number" id="CosTotServAdmin" name="CosTotServAdmin" value={formData.CosTotServAdmin.toFixed(2)} readOnly/>
          </div>
        </div>

        <button type="submit" className="btn-guardar">
          Guardar Distribución
        </button>
      </form>
    </div>
  );
}
