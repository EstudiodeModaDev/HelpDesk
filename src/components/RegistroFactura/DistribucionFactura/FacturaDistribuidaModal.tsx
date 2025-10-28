// src/components/Factura/FacturaDistribuidaModal.tsx
// import React from "react";
import type { DistribucionFacturaData } from "../../../Models/DistribucionFactura";
// import type { FacturaData } from "../../Models/Factura";

interface Props {
  factura: DistribucionFacturaData;
  onClose: () => void;
}

export default function FacturaDistribuidaModal({ factura, onClose }: Props) {
  if (!factura) return null;

  // 🧮 Cálculos
  const impColor =
    (factura.ImpColorCalle ?? 0) + (factura.ImpColorPalms ?? 0);
  const impBn =
    (factura.ImpBnCedi ?? 0) +
    (factura.ImpBnCalle ?? 0) +
    (factura.ImpBnPalms ?? 0);

  const distCedi = (factura.CargoFijo ?? 0) / 3;
  const distPalms = ((2 / 3) * (factura.CargoFijo ?? 0)) / 3;
  const distCalle = ((2 / 3) * (factura.CargoFijo ?? 0)) / 3;

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/40 z-50">
      <div className="bg-white w-[550px] max-h-[90vh] overflow-y-auto rounded-2xl shadow-xl p-6">
        <h2 className="text-xl font-semibold text-center mb-4">Factura distribuida</h2>

        {/* Totales */}
        <div className="border rounded-xl p-3 mb-4">
          <h3 className="font-medium mb-2 text-gray-700">Totales</h3>
          <table className="w-full text-sm">
            <tbody>
              <tr>
                <td>Canon fijo</td>
                <td className="text-right font-medium">
                  ${factura.CargoFijo?.toLocaleString() ?? "0"}
                </td>
              </tr>
              <tr>
                <td>Impresiones</td>
                <td className="text-right font-medium">
                  ${factura.CosToImp?.toLocaleString() ?? "0"}
                </td>
              </tr>
              <tr>
                <td>Valor Ante IVA</td>
                <td className="text-right font-semibold text-gray-800">
                  ${factura.ValorAnIVA?.toLocaleString() ?? "0"}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Detalles por impresión */}
        <div className="border rounded-xl p-3 mb-4">
          <h3 className="font-medium mb-2 text-gray-700">Detalles por impresión</h3>
          <table className="w-full text-sm">
            <tbody>
              <tr>
                <td>🟦 Impresiones a color</td>
                <td className="text-right">${impColor.toLocaleString()}</td>
              </tr>
              <tr>
                <td>⬜ Impresiones B/N</td>
                <td className="text-right">${impBn.toLocaleString()}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Distribución */}
        <div className="border rounded-xl p-3 mb-4">
          <h3 className="font-medium mb-2 text-gray-700">Distribución</h3>
          <table className="w-full text-sm">
            <tbody>
              <tr>
                <td>Cedi</td>
                <td className="text-right">${distCedi.toLocaleString()}</td>
              </tr>
              <tr>
                <td>35 Palms</td>
                <td className="text-right">${distPalms.toLocaleString()}</td>
              </tr>
              <tr>
                <td>Calle 16</td>
                <td className="text-right">${distCalle.toLocaleString()}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Totales por C.O */}
        <div className="border rounded-xl p-3 mb-4">
          <h3 className="font-medium mb-2 text-gray-700">Total por C.O</h3>
          <table className="w-full text-sm">
            <tbody>
              <tr>
                <td>Marcas nacionales</td>
                <td>CO:001 / UN:601</td>
                <td className="text-right">
                  ${factura.CosTotMarNacionales?.toLocaleString() ?? "0"}
                </td>
              </tr>
              <tr>
                <td>Marcas importadas</td>
                <td>CO:001 / UN:601</td>
                <td className="text-right">
                  ${factura.CosTotMarImpor?.toLocaleString() ?? "0"}
                </td>
              </tr>
              <tr>
                <td>Servicios administrativos</td>
                <td>CO:001 / UN:601</td>
                <td className="text-right">
                  ${factura.CosTotServAdmin?.toLocaleString() ?? "0"}
                </td>
              </tr>
              <tr>
                <td>CEDI</td>
                <td>CO:001 / UN:601</td>
                <td className="text-right font-semibold text-gray-800">
                  ${factura.CosTotCEDI?.toLocaleString() ?? "0"}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="text-center">
          <button
            onClick={onClose}
            className="mt-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
