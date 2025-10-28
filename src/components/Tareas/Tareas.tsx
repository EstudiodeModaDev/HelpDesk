import FormTarea from "./TareasForm/TareasForm";
import ListaTareas from "../Tareas/TareasRegistradas/TareasRegistradas";
import "./TareasPage.css"
import ActivityStatusCard from "./ResumenActividad/ResumenActividad";

export default function TareasPage() {

  return (
    <div className="tareas-page">
      <FormTarea />
      <ListaTareas/>
      <ActivityStatusCard percent={80} tasks={[]} tasksPerWeek={0}/>
    </div>
  );
}
