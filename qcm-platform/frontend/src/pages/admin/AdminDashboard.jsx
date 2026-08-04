import { Link } from "react-router-dom";

export default function AdminDashboard() {
  return (
    <div>
      <h1>Tableau de bord administrateur central</h1>
      <ul>
        <li><Link to="/admin/domains">Gérer les domaines et les directeurs</Link></li>
        <li><Link to="/admin/teachers">Gérer les enseignants et directeurs (comptes)</Link></li>
      </ul>
    </div>
  );
}
