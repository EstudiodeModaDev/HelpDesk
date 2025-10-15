import * as React from "react";
import CompraFormulario from "./FormularioCompra/Compras";
import "./Compras.css"; 
import TablaCompras from "./TablaCompras/TablaCompras";

type View = "form" | "tabla";

export default function ComprasPage() {
  const [view, setView] = React.useState<View>("form"); // ← por defecto FORM

  return (
    <div className="compra-wrap force-light" data-darkreader-ignore>
      {/* Tabs / conmutador */}
      <div className="col-span-full flex items-center justify-between" style={{ marginBottom: 12 }}>
        <div style={{ display: "flex", gap: 8 }}>
          <button type="button" className={`btn btn-sm ${view === "form" ? "btn-primary" : ""}`} aria-pressed={view === "form"} aria-controls="compras-form" onClick={() => setView("form")}>
            Nueva compra
          </button>
          <button type="button" className={`btn btn-sm ${view === "tabla" ? "btn-primary" : ""}`} aria-pressed={view === "tabla"} aria-controls="compras-tabla" onClick={() => setView("tabla")}>
            Ver solicitudes
          </button>
        </div>
      </div>

      {view === "form" ? (
        <section id="compras-form" aria-labelledby="compras-form-title">
          <h2 id="compras-form-title" className="sr-only">Formulario de compras</h2>
          <CompraFormulario submitting={false} />
        </section>
      ) : (
        <section id="compras-tabla" aria-labelledby="compras-tabla-title">
          <h2 id="compras-tabla-title" className="sr-only">Tabla de solicitudes de compra</h2>
          <TablaCompras/>
        </section>
      )}
    </div>
  );
}
