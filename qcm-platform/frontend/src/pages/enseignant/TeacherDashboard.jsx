import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { listQuestions } from "../../api/questions";
import apiClient from "../../api/client";

export default function TeacherDashboard() {
  const [questions, setQuestions] = useState([]);
  const [payouts, setPayouts] = useState([]);

  useEffect(() => {
    listQuestions({}).then((res) => setQuestions(res.data));
    apiClient.get("/payouts/me").then((res) => setPayouts(res.data));
  }, []);

  const validated = questions.filter((q) => q.status === "validee").length;

  return (
    <div>
      <h1>Tableau de bord enseignant</h1>
      <p>{validated} questions validées sur {questions.length} soumises.</p>
      <Link to="/enseignant/nouvelle-question">+ Créer une nouvelle question</Link>

      <h2>Mes questions</h2>
      <ul>
        {questions.map((q) => (
          <li key={q.id}>
            {q.statement}{" "}
            <span className={`badge ${
              q.status === "validee" ? "badge--success" : q.status === "rejetee" ? "badge--error" : "badge--pending"
            }`}>
              {q.status}
            </span>
          </li>
        ))}
      </ul>

      <h2>Mes rémunérations</h2>
      <ul>
        {payouts.map((p) => (
          <li key={p.id}>
            {new Date(p.periodStart).toLocaleDateString()} → {new Date(p.periodEnd).toLocaleDateString()} :
            {" "}{p.totalAmount} FCFA ({p.status})
          </li>
        ))}
      </ul>
    </div>
  );
}
