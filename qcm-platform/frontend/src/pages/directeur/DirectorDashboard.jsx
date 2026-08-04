import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { listQuestions } from "../../api/questions";

export default function DirectorDashboard() {
  const [questions, setQuestions] = useState([]);

  useEffect(() => {
    listQuestions({ status: "en_attente" }).then((res) => setQuestions(res.data));
  }, []);

  return (
    <div>
      <h1>Tableau de bord directeur de domaine</h1>
      <p>{questions.length} questions en attente de validation.</p>
      <ul>
        <li><Link to="/directeur/validation">Voir la file de validation</Link></li>
        <li><Link to="/directeur/enseignants">Gérer mes enseignants</Link></li>
      </ul>
    </div>
  );
}
