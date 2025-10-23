import React, { useState, useEffect } from "react";
import "./FacturaFiltros.css";
import type { ReFactura } from "../../../Models/RegistroFacturaInterface";
import { useGraphServices } from "../../../graph/GrapServicesContext";
import { useCentroCostos, useCO } from "../../../Funcionalidades/Compras";
import { Items } from "../../../Models/Compras";

const { CentroCostos, CentroOperativo } = useGraphServices();
const { ccOptions,} = useCentroCostos(CentroCostos as any);
const { COOptions, UNOptions} = useCO(CentroOperativo as any);;

export default function FacturaFiltros({
  onFiltrar,
}: {
  onFiltrar: (filtros: Partial<ReFactura>) => void;
}) {
  const [filtros, setFiltros] = useState<Partial<ReFactura>>({
    FechaEmision: "",
    NoFactura: "",
    Proveedor: "",
    Title: "",
    Items: "",
    DescripItems: "",
  });

  useEffect(() => {
    onFiltrar(filtros);
  }, [filtros]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    if (name === "Items") {
      const seleccion = Items.find((o) => o.codigo === value);
      setFiltros((prev) => ({
        ...prev,
        Items: value,
        DescripItems: seleccion ? seleccion.descripcion : "",
      }));
      
    } else {
      setFiltros((prev) => ({ ...prev, [name]: value }));
    }
  };

  return (
    <div className="filtros-container">
      <h3>🔍 Filtros de búsqueda</h3>

      <div className="filtros-grid">
  
        {/* 🧾 Buscador por texto */}
        <input type="text" name="NoFactura" value={filtros.NoFactura || ""} onChange={handleChange} placeholder="Número de factura"/>
        <input type="text" name="Proveedor" value={filtros.Proveedor || ""} onChange={handleChange} placeholder="Proveedor"/>
        <input type="text" name="Title" value={filtros.Title || ""} onChange={handleChange} placeholder="NIT"/>
        
        {/* 🧾 Selector de ítem */}
        <select name="Items" value={filtros.Items || ""} onChange={handleChange}>
          <option value="">Seleccionar código</option>
          {Items.map((op) => (
            <option key={op.codigo} value={op.codigo}>
              {op.codigo} - {op.descripcion}
            </option>
          ))}
        </select>
        <input type="text" name="DescripItems" value={filtros.DescripItems || ""} readOnly placeholder="Descripción del ítem"/>

        {/* 🧾 Selector de cc */}
        <select name="CC" value={filtros.CC || ""} onChange={handleChange}>
          <option value="">Sel centro cos</option>
          {ccOptions.map((oc) => (
            <option key={oc.value} value={oc.value}>
              {oc.value} - {oc.label}
            </option>
          ))}
        </select>

        {/* 🧾 Selector de co */}
        <select name="CO" value={filtros.CO || ""} onChange={handleChange}>
          <option value="">Sel centro ope</option>
          {COOptions.map((oco) => (
            <option key={oco.value} value={oco.value}>
              {oco.value} - {oco.label}
            </option>
          ))}
        </select>

         {/* 🧾 Selector de un */}
        <select name="UN" value={filtros.un || ""} onChange={handleChange}>
          <option value="">Sel und. negocio</option>
          {UNOptions.map((ou) => (
            <option key={ou.value} value={ou.value}>
              {ou.value} - {ou.label}
            </option>
          ))}
        </select>      

        <input type="text" name="DocERP" value={filtros.DocERP || ""} readOnly placeholder="Doc ERP"/>

        <label>
          Fecha entrega cont
          <input type="date" name="FecEntregaCont" value={filtros.FecEntregaCont || ""} onChange={handleChange}/>
        </label>

        <label>
          Fecha de emisión
          <input type="date" name="FechaEmision" value={filtros.FechaEmision || ""} onChange={handleChange}/>
        </label>
      </div>
    </div>
  );
}
