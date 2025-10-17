import FormTarea from "./TareasForm/TareasForm";
import ListaTareas from "../Tareas/TareasRegistradas/TareasRegistradas";

export default function TareasPage() {

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "min(520px, 38vw) 1fr",
        gap: 24,
        alignItems: "start",
        padding: 16,
      }}
    >
      <FormTarea />
      <ListaTareas/>
    </div>
  );
}
