import FormTarea from "./TareasForm/TareasForm";
import ListaTareas from "../Tareas/TareasRegistradas/TareasRegistradas";
import "./TareasPage.css"

export default function TareasPage() {

  return (
    <div className="tareas-page">
      <FormTarea />
      <ListaTareas/>
    </div>
  );
}
