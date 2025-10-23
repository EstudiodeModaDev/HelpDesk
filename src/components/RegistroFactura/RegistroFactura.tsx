// src/components/RegistrarFactura/RegistroFactura.tsx
import React, { useEffect, useState } from "react";
import { useFacturas } from "../../Funcionalidades/RegistrarFactura";
import FacturasLista from "./FacturasLista/FacturasLista";
import type { ReFactura } from "../../Models/RegistroFacturaInterface";
import "./RegistroFactura.css";
import { useAuth } from "../../auth/authContext";
import Select from "react-select";
import { useProveedores } from "../../Funcionalidades/ProveedoresFactura";
import ProveedorModal from "./ProveedorModal/ProveedorModal";
import { Items, type Compra } from "../../Models/Compras";
import { ComprasService } from "../../Services/Compras.service";
import { GraphRest } from "../../graph/GraphRest";
import { formatPesosEsCO } from "../../utils/Number";
import { useGraphServices } from "../../graph/GrapServicesContext";
import { useCentroCostos, useCO } from "../../Funcionalidades/Compras";

export default function RegistroFactura() {
  const { getToken } = useAuth();
  const [compras, setCompras] = useState<Compra[]>([]);
  const [selectedCompra, setSelectedCompra] = useState<string>("");
  const { proveedores, loading, error, agregarProveedor  } = useProveedores();
  const [proveedorSeleccionado, setProveedorSeleccionado] = useState<string>("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const graph = new GraphRest(getToken);
  const comprasService = new ComprasService(graph);
  const [mostrarLista, setMostrarLista] = useState(false);
  const {account} = useAuth()
  const [formData, setFormData] = useState<ReFactura>({
    FechaEmision: "",
    NoFactura: "",
    Proveedor: "",
    Title: "",
    Items: "",
    DescripItems: "",
    ValorAnIVA: 0,
    CC: "",
    CO: "",
    un: "",
    DetalleFac: "",
    FecEntregaCont: "",
    DocERP: "",
    Observaciones: "",
    RegistradoPor: account?.name ?? "",
  });
  const [displayValor, setDisplayValor] = React.useState<Number>();
  const { CentroCostos, CentroOperativo } = useGraphServices();
  const { ccOptions, loading: loadingCC} = useCentroCostos(CentroCostos as any);
  const { COOptions, loading: loadingCO, UNOptions} = useCO(CentroOperativo as any);

  useEffect(() => {
    const fetchCompras = async () => {
      try {
        // 🎯 Filtramos solo las compras con estado permitido
        const filtro = [
          "Pendiente por registro de inventario",
          "Pendiente por entrega al usuario",
          "Pendiente por registro de factura"
        ]
          .map(e => `fields/Estado eq '${e}'`)
          .join(" or ");

        const { items } = await comprasService.getAll({
          filter: filtro,
          orderby: "fields/FechaSolicitud desc", // opcional
          top: 100,
        });

        setCompras(items);
      } catch (error) {
        console.error("Error cargando compras filtradas:", error);
      }
    };
    fetchCompras();
  }, []);
  const { registrarFactura } = useFacturas();

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) => {
    const { name, value } = e.target;

    // Si cambia el ítem, también actualiza automáticamente la descripción
    if (name === "Items") {
      const seleccion = Items.find((o) => o.codigo === value);
      setFormData((prev) => ({
        ...prev,
        Items: value,
        DescripItems: seleccion ? seleccion.descripcion : "",
      }));
    } else {
      console.log("Valor", displayValor)
      setFormData((prev) => ({
        ...prev,
        [name]: name === "ValorAnIVA" ? displayValor : value,
      }));
    }
  };

  const handleCompraSeleccionada = async (id: string) => {
    // ✅ Actualizamos el estado local de la compra seleccionada
    setSelectedCompra(id);

    // 🚫 Si el usuario deselecciona (elige la opción vacía), limpiamos los campos relacionados
    if (!id) {
      setFormData((prev) => ({
        ...prev,
        CC: "",            // Centro de Costos
        CO: "",            // Centro Operativo
        un: "",            // Unidad de Negocio
        DetalleFac: "",    // Detalle de la factura
        Items: "",         // Código de ítem
        DescripItems: "",  // Descripción del ítem
      }));
      return;
    }

    try {
      // 📦 Cargar los datos completos de la compra seleccionada
      const compra = await comprasService.get(id);

      // 🧩 Mapeo de campos comunes entre la compra y el formulario
      setFormData((prev) => ({
        ...prev,
        Items: compra.CodigoItem || "",       // Código del ítem
        DescripItems: compra.DescItem || "",  // Descripción del ítem
        CC: compra.CCosto || "",              // Centro de Costos
        CO: compra.CO || "",                  // Centro Operativo
        un: compra.UN || "",                  // Unidad de Negocio
        DetalleFac: compra.Dispositivo || "", // Detalle / Dispositivo relacionado
      }));
    } catch (error) {
      console.error("❌ Error al cargar la compra seleccionada:", error);
    }
  };

  const handleProveedorSeleccionado = (id: string) => {
    setProveedorSeleccionado(id);

    // Si no hay proveedor seleccionado, limpiar campos
    if (!id) {
      setFormData(prev => ({
        ...prev,
        Proveedor: "", // ← campo del input en el formulario
        Title: "",     // ← campo del input del NIT
      }));
      return;
    }

    // Buscar el proveedor por Id en la lista del hook
    const prov = proveedores.find(p => String(p.Id) === String(id));

    if (prov) {
      setFormData(prev => ({
        ...prev,
        Proveedor: prov.Nombre ?? "", // ← Nombre del proveedor  aca ya se guardan, pero el input de proveedor se quita para no ser redundantes
        Title: prov.Title ?? "",      // ← NIT del proveedor     este si lo trae y lo llena automaticamwnte
      }));
    } else {
      console.warn("Proveedor seleccionado no encontrado en lista:", id);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await registrarFactura(formData);

    alert("✅ Factura registrada con éxito");

    // Limpiar campos
    setFormData({
      FechaEmision: "",
      NoFactura: "",
      Proveedor: "",
      Title: "",
      Items: "",
      DescripItems: "",
      ValorAnIVA: 0,
      CC: "",
      CO: "",
      un: "",
      DetalleFac: "",
      FecEntregaCont: "",
      DocERP: "",
      Observaciones: "",
      RegistradoPor: account?.name ?? "",
    });
  };

  return (
    <div className="registro-container">
      <h2>{mostrarLista ? "📄 Facturas Registradas" : "Registro de Facturas"}</h2>

      {!mostrarLista ? (
        <form className="registro-form" onSubmit={handleSubmit}>
          <div className="form-grid">

            {/* relacionamiento con compras  */}
            <div className="form-group mb-3">
              <label htmlFor="compraSelect">Seleccionar compra relacionada:</label>
                  <select id="compraSelect" className="form-control" value={selectedCompra} onChange={(e) => handleCompraSeleccionada(e.target.value)}>
                    <option value="">-- Seleccione una compra --</option>
                      {compras.map((c) => (
                        <option key={c.Id} value={c.Id}>
                          {c.Title} - {c.SolicitadoPor} - {c.Estado}
                        </option>
                      ))}
                    </select>
            </div>

            {/* 🔹 Desplegable de proveedores */}
            <div className="form-group mb-3">
              <label htmlFor="proveedor-select">Proveedor:</label>
              {loading ? (
                <span>Cargando...</span>
              ) : error ? (
                <span style={{ color: "red" }}>{error}</span>
              ) : (
                <select
                  id="proveedor-select"
                  value={proveedorSeleccionado}
                  // usamos el handler nuevo que actualiza formData
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

              {/* 🔹 Botón para abrir modal (se implementará más adelante) */}
              <button
                type="button"
                className="btn-nuevo-proveedor"
                onClick={() => setIsModalOpen(true)}
              >
                + Nuevo proveedor
              </button>
            </div>

            {/* 📆 Fecha de emisión */}
            <div className="campo">
              <label> Fecha de emisión
                <input type="date" name="FechaEmision" value={formData.FechaEmision} onChange={handleChange} required/>
              </label>
            </div>

            {/* 🔢 Número de factura */}
            <div className="campo">
              <label> No. Factura
                <input type="text" name="NoFactura" value={formData.NoFactura} onChange={handleChange} required/>
              </label>
            </div>

            {/* 🧾 NIT (Title) (llenado automático; readonly) */}
            <div className="campo">
              <label> NIT 
                <input type="text" name="Title" value={formData.Title} onChange={handleChange} required readOnly/>
              </label>
            </div>

            {/* 🧾 Ítem (Código + descripción automática con búsqueda) */}
            <div className="campo">
              <label>Ítem (Código + descripción)</label>
              <Select
              classNamePrefix="rs"
              className="rs-override"
              options={Items.map((op) => ({
                value: op.codigo,
                label: `${op.codigo} - ${op.descripcion}`,
              }))}
              placeholder="Buscar ítem…"
              isClearable
              value={
                formData.Items
                  ? {
                      value: formData.Items,
                      label:
                        Items.find((op) => op.codigo === formData.Items)
                          ?.descripcion || formData.Items,
                    }
                  : null
              }
              onChange={(opt) => {
                setFormData((prev) => ({
                  ...prev,
                  Items: opt?.value || "",
                  DescripItems: opt?.label?.split(" - ")[1] || "",
                }));
              }}
              filterOption={(option, input) =>
                option.label.toLowerCase().includes(input.toLowerCase())
              }
            />
            </div>

            {/* 📝 Descripción del ítem (solo lectura, se llena automático) */}
            <div className="campo">
              <label>
                Descripción del ítem
                <input name="DescripItems" value={formData.DescripItems} readOnly></input>
              </label>
            </div>

            {/* 💰 Valor */}
            <div className="campo">
              <label>
                Valor antes iva (en pesos)
                <input type="text" inputMode="numeric" name="ValorAnIVA" placeholder="Ej: 100.000,00" value={String(displayValor)} onChange={(e) => {const f = formatPesosEsCO(e.target.value); setDisplayValor(Number(f)); handleChange;}}/>
              </label>
            </div>

            {/* 🏢 Centro de Costos (C.C) */}
            <div className="campo">
              <label>Centro de Costos (C.C)</label>
              <Select
                classNamePrefix="rs"
                className="rs-override"
                options={ccOptions.map((cc) => ({
                  value: cc.value,
                  label: `${cc.value} - ${cc.label}`,
                }))}
                placeholder="Buscar centro de costo…"
                isClearable
                value={
                  formData.CC
                    ? {
                        value: formData.CC,
                        label:
                          ccOptions.find((cc) => cc.value === formData.CC)
                            ?.label || formData.CC,
                      }
                    : null
                }
                onChange={(opt) =>
                  setFormData((prev) => ({
                    ...prev,
                    CC: opt?.value || "",
                  }))
                }
                filterOption={(option, input) =>
                  option.label.toLowerCase().includes(input.toLowerCase())
                }
                isDisabled={loadingCC}
              />
            </div>

            {/* 🏭 Centro Operativo (C.O) */}
            <div className="campo">
              <label>Centro Operativo (C.O)</label>
              <Select
                classNamePrefix="rs"
                className="rs-override"
                options={COOptions.map((co) => ({
                  value: co.value,
                  label: `${co.value} - ${co.label}`,
                }))}
                placeholder="Buscar centro operativo…"
                isClearable
                value={
                  formData.CO
                    ? {
                        value: formData.CO,
                        label:
                          ccOptions.find((co) => co.value === formData.CO)
                            ?.label || formData.CO,
                      }
                    : null
                }
                onChange={(opt) =>
                  setFormData((prev) => ({
                    ...prev,
                    CO: opt?.value || "",
                  }))
                }
                filterOption={(option, input) =>
                  option.label.toLowerCase().includes(input.toLowerCase())
                }
                isDisabled={loadingCO}
              />
            </div>

            {/* 🧱 Unidad de Negocio (U.N) */}
            <div className="campo">
              <label>Unidad de Negocio (U.N)</label>
              <Select
                classNamePrefix="rs"
                className="rs-override"
                options={UNOptions.map((un) => ({
                  value: un.value,
                  label: `${un.value} - ${un.label}`,
                }))}
                placeholder="Buscar unidad de negocio…"
                isClearable
                value={
                  formData.un
                    ? {
                        value: formData.un,
                        label:
                          UNOptions.find((u) => u.value === formData.un)
                            ?.label || formData.un,
                      }
                    : null
                }
                onChange={(opt) =>
                  setFormData((prev) => ({
                    ...prev,
                    un: opt?.value || "",
                  }))
                }
                filterOption={(option, input) =>
                  option.label.toLowerCase().includes(input.toLowerCase())
                }
              />
            </div>

            {/* 🧾 Detalle */}
            <div className="campo">
              <label>Detalle Fac
                <input name="DetalleFac" value={formData.DetalleFac} onChange={handleChange}/>
              </label>
            </div> 

            {/* 📦 Fecha de entrega contabilidad */}
            <div className="campo">
              <label>Fecha de entrega contabilidad
                <input type="date" name="FecEntregaCont" value={formData.FecEntregaCont} onChange={handleChange}/>
              </label>
            </div>

            {/* 📎 Documento ERP */}
            <div className="campo">
              <label> Documento ERP
                <input type="text" name="DocERP" value={formData.DocERP} onChange={handleChange}/>
              </label>
            </div>

            {/* 🗒️ Observaciones */}
            <div className="campo">
              <label> Observaciones
                <textarea name="Observaciones" rows={2} value={formData.Observaciones} onChange={handleChange} placeholder="Escribe observaciones si aplica..."></textarea>
              </label>
            </div>
          </div>

          {/* Botones */}
          <div className="botones-container">
            <button type="submit" className="btn-registrar">
              ✅  Registrar Factura
            </button>

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
        // 📋 Vista de facturas con su propio componente de filtros
        <div>
          <FacturasLista onVolver={() => setMostrarLista(false)} />
        </div>
      )}
        <ProveedorModal
  isOpen={isModalOpen}
  onClose={() => setIsModalOpen(false)}
  onSave={agregarProveedor}
/>

    </div>
  );
}
