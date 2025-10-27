// src/components/DistribucionFactura/DistribucionFactura.tsx
import React, { useState, useEffect } from "react";
import "./DistribucionFactura.css";
import { useProveedores } from "../../../Funcionalidades/ProveedoresFactura";
import type { DistribucionFacturaData } from "../../../Models/DistribucionFactura";
import { useDistribucionFactura } from "../../../Funcionalidades/DistribucionFactura";
import { formatPesosEsCO, toNumberFromEsCO } from "../../../utils/Number";
import { useFacturas } from "../../../Funcionalidades/RegistrarFactura";

// import { useFacturas } from "../../Funcionalidades/RegistrarFactura";


export default function DistribucionFactura() {
  const { proveedores, loading, error } = useProveedores();
  const { registrarDistribucion } = useDistribucionFactura();

  const [proveedorSeleccionado, setProveedorSeleccionado] = useState<string>("");


const { registrarFactura } = useFacturas();



  // ✅ Estado base con todos los campos (incluidos los ocultos)
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
    FechaEmision: "",
    NoFactura: "",
    // 🔸 Campos ocultos (no visibles en el formulario)
    Items: "SC70",
    DescripItems: "UTILES, PAPELERIA Y FOTOCOPIAS RC",
    CCmn: "22111",
    CCmi: "21111",
    CCcedi: "31311",
    CCsa: "31611",
    CO: "001",
    un: "601",
    DetalleFac: "Detalle de impresiones en el mes actual",
  });

  // 🔢 Estados visuales para los campos numéricos (solo formateo)
  const [displayCargoFijo, setdisplayCargoFijo] = React.useState("");
  const [displayCostoTotalImpresion, setdisplayCostoTotalImpresion] = React.useState("");
  const [displayValorAntesIva, setdisplayValorAntesIva] = React.useState("");
  const [displayImpresionesBNCedi, setdisplayImpresionesBNCedi] = React.useState("");
  const [displayImpresionesBNPalms, setdisplayImpresionesBNPalms] = React.useState("");
  const [displayImpresionesColorPalms, setdisplayImpresionesColorPalms] = React.useState("");
  const [displayImpresionesBNCalle, setdisplayImpresionesBNCalle] = React.useState("");
  const [displayImpresionesColorCalle, setdisplayImpresionesColorCalle] = React.useState("");
  const [displayTotalCedi, setdisplayTotalCedi] = React.useState("");
  const [displayTotalOtrasMarcas, setDisplayTotalOtrasMarcas] = React.useState("");

  // 🔹 Selección de proveedor
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

  // 🧮 Efecto para cálculos automáticos
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

    const cargoFijo3 = CargoFijo - CargoFijo / 3;
    const ValorAnIVA = CargoFijo + CosToImp;
    const CosTotCEDI = CargoFijo / 3 + ImpBnCedi;
    const promedioOtros =
      (ImpBnPalms + ImpColorPalms + ImpBnCalle + ImpColorCalle) / 3;
    const otrosCostos = cargoFijo3 / 3 + promedioOtros;
    const totalImpresion =
      ImpBnCalle + ImpBnCedi + ImpBnPalms + ImpColorCalle + ImpBnPalms;

    setdisplayCostoTotalImpresion(formatPesosEsCO(String(totalImpresion)));
    setdisplayValorAntesIva(formatPesosEsCO(String(ValorAnIVA)));
    setdisplayTotalCedi(formatPesosEsCO(String(CosTotCEDI)));
    setDisplayTotalOtrasMarcas(formatPesosEsCO(String(otrosCostos)));

    setFormData((prev) => ({
      ...prev,
      ValorAnIVA,
      CosTotCEDI,
      CosTotMarNacionales: otrosCostos,
      CosTotMarImpor: otrosCostos,
      CosTotServAdmin: otrosCostos,
      CosToImp: totalImpresion,
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


 // 🧾 Guardar registro único + generar 4 facturas relacionadas
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();

  try {
    if (!formData.Proveedor || !formData.Title) {
      alert("⚠️ Por favor selecciona un proveedor antes de guardar.");
      return;
    }

    // ---------- 🔍 Validación de costos ----------
    const sumaCostos =
      formData.ImpBnCedi +
      formData.ImpBnPalms +
      formData.ImpColorPalms +
      formData.ImpBnCalle +
      formData.ImpColorCalle;

    const diferencia = Math.abs(sumaCostos - formData.CosToImp);

    if (diferencia > 0.01) {
      alert(
        `⚠️ Los costos de impresión no coinciden.\n\nCosto declarado: ${formData.CosToImp.toFixed(
          2
        )}\nSuma de costos: ${sumaCostos.toFixed(2)}`
      );
      return;
    }

    // ---------- 1️⃣ Guardar registro principal en Distribuciones ----------
    const record = { ...formData };
    delete (record as any).Id;

    console.log("📤 Enviando distribución a SharePoint:", record);
    await registrarDistribucion(record);
    console.log("✅ Distribución guardada correctamente");

    // ---------- 🧹 Función para limpiar campos no deseados ----------
    const camposExcluidos = [
      "CargoFijo",
      "CosToImp",
      "ImpBnCedi",
      "ImpBnPalms",
      "ImpColorPalms",
      "ImpBnCalle",
      "ImpColorCalle",
      "CosTotMarNacionales",
      "CosTotMarImpor",
      "CosTotCEDI",
      "CosTotServAdmin",
      "CCmn",
      "CCmi",
      "CCcedi",
      "CCsa",
      "CostoTotal",
    ];

    const limpiarCampos = (obj: any) => {
      const copia = { ...obj };
      camposExcluidos.forEach((campo) => delete copia[campo]);
      return copia;
    };

    // ---------- 2️⃣ Generar los 4 registros en la lista Facturas ----------
    const facturasData = [
      {
        ...formData,
        CC: formData.CCmn,
        ValorAnIVA: formData.CosTotMarNacionales,
        FecEntregaCont: null,
        DocERP: "",
        Observaciones: "",
        RegistradoPor: "Sistema",
      },
      {
        ...formData,
        CC: formData.CCmi,
        ValorAnIVA: formData.CosTotMarImpor,
        FecEntregaCont: null,
        DocERP: "",
        Observaciones: "",
        RegistradoPor: "Sistema",
      },
      {
        ...formData,
        CC: formData.CCcedi,
        ValorAnIVA: formData.CosTotCEDI,
        FecEntregaCont: null,
        DocERP: "",
        Observaciones: "",
        RegistradoPor: "Sistema",
      },
      {
        ...formData,
        CC: formData.CCsa,
        ValorAnIVA: formData.CosTotServAdmin,
        FecEntregaCont: null,
        DocERP: "",
        Observaciones: "",
        RegistradoPor: "Sistema",
      },
    ];

    console.log("📦 Facturas a crear en SharePoint:", facturasData);

    // ---------- 3️⃣ Envío de las 4 facturas ----------
    for (const factura of facturasData) {
      const facturaLimpia = limpiarCampos(factura);
      try {
        console.log("📤 Registrando factura:", facturaLimpia.CC);
        await registrarFactura(facturaLimpia);
        console.log(`✅ Factura registrada para CC: ${facturaLimpia.CC}`);
      } catch (err) {
        console.error(`❌ Error registrando factura para ${facturaLimpia.CC}`, err);
      }
    }

    alert("✅ Distribución y facturas relacionadas guardadas con éxito.");

    // ---------- 4️⃣ Reset del formulario ----------
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
      FechaEmision: "",
      NoFactura: "",
      Items: "SC70",
      DescripItems: "UTILES, PAPELERIA Y FOTOCOPIAS RC",
      CCmn: "22111 - DIRECCION MARCAS NACIONALES + CSC",
      CCmi: "21111 - DIRECCION MARCAS IMPORTADAS",
      CCcedi: "31311 - CEDI",
      CCsa: "31611 - SERVICIOS ADMINISTRATIVOS",
      CO: "001 - FABRICA",
      un: "601 - GENERAL",
      DetalleFac: "Detalle de impresiones en el mes actual",
    });
  } catch (error: any) {
    console.error("❌ Error al guardar la distribución:", error);
    alert("⚠️ Ocurrió un error al guardar la distribución o las facturas.");
  }
};



  const setField = <K extends keyof DistribucionFacturaData>(
    k: K,
    v: DistribucionFacturaData[K]
  ) => setFormData((s) => ({ ...s, [k]: v }));

  return (
    <div className="distribucion-container">
      <h2>📦 Distribución de Factura</h2>

      <form className="distribucion-form" onSubmit={handleSubmit}>
        <div className="form-grid">
          {/* Proveedor y NIT */}
          <div className="form-row">
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

            <div className="form-group">
              <label htmlFor="nit">NIT:</label>
              <input type="text" id="nit" name="Title" value={formData.Title} readOnly />
            </div>
          </div>

          {/* Fecha de Emisión */}
          <div className="form-group">
            <label htmlFor="FechaEmision">Fecha de Emisión:</label>
            <input
              type="date"
              id="FechaEmision"
              name="FechaEmision"
              value={formData.FechaEmision}
              onChange={(e) => setField("FechaEmision", e.target.value)}
            />
          </div>

          {/* NoFactura */}
          <div className="form-group">
            <label htmlFor="NoFactura">Número de Factura:</label>
            <input
              type="text"
              id="NoFactura"
              name="NoFactura"
              placeholder="Ej: FAC-1234"
              value={formData.NoFactura}
              onChange={(e) => setField("NoFactura", e.target.value)}
            />
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
            <input type="text" inputMode="numeric" name="CosToImp" placeholder="Se llenara automaticamente" value={String(displayCostoTotalImpresion)} readOnly/>
          </div>

          {/* ValorAnIVA */}
          <div className="form-group">
            <label htmlFor="ValorAnIVA">Valor antes de IVA:</label>
            <input type="text" inputMode="numeric" name="ValorAnIVA" placeholder="Se llenara automaticamente" value={String(displayValorAntesIva)} readOnly/>
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
            <input type="text" inputMode="numeric" name="ImpColorPalms" placeholder="Ej: 100.000" value={String(displayImpresionesColorCalle)}  
              onChange={(e) => {
                const raw = e.target.value;
                const f = formatPesosEsCO(raw);
                const num = toNumberFromEsCO(f);
                setdisplayImpresionesColorCalle(f);
                setField("ImpColorCalle", num)
              }}
              onBlur={() => {
                const num = toNumberFromEsCO(displayImpresionesColorCalle);
                setdisplayImpresionesColorCalle(
                  new Intl.NumberFormat("es-CO", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                  }).format(Number.isFinite(num) ? num : 0)
                );
              }}/>
          </div>

          {/* Campos automáticos de costos totales */}
          <div className="form-group">
            <label htmlFor="CosTotCEDI">Costo Total del CEDI</label>
            <input type="text" inputMode="numeric" name="CosTotCEDI" placeholder="Se llenara automaticamente" value={String(displayTotalCedi)} readOnly/>
          </div>

          <div className="form-group">
            <label htmlFor="CosTotMarNacionales">Costo Total Marcas Nacionales</label>
            <input type="text" inputMode="numeric" name="CosTotMarNacionales" placeholder="Se llenara automaticamente" value={String(displayTotalOtrasMarcas)} readOnly/>
          </div>

          <div className="form-group">
            <label htmlFor="CosTotMarImpor">Costo Total Marcas Importaciones-Automatico</label>
            <input type="text" inputMode="numeric" name="CosTotMarImpor" placeholder="Se llenara automaticamente" value={String(displayTotalOtrasMarcas)} readOnly/>
          </div>

          <div className="form-group">
            <label htmlFor="CosTotServAdmin">Costo Total de Servicios Administrativos-Automatico</label>
             <input type="text" inputMode="numeric" name="CosTotServAdmin" placeholder="Se llenara automaticamente" value={String(displayTotalOtrasMarcas)} readOnly/>
          </div>
        </div>

        <button type="submit" className="btn-guardar">
          Guardar Distribución
        </button>
      </form>
    </div>
  );
}
