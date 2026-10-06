import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getHistory } from "../../api/quizSessions";
import { formatDate, describeFilters, scoreTone } from "../../utils/format";

const STATUS = { en_cours: "En cours", terminee: "Terminé", abandonnee: "Abandonné" };

export default function History() {
  const [sessions, setSessions] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    getHistory()
      .then((res) => setSessions(res.data))
      .catch((err) => setError(err.response?.data?.error || "Impossible de charger l'historique."));
  }, []);

  if (error) return <p className="alert alert--error">{error}</p>;
  if (!sessions) return <p className="muted">Chargement…</p>;

  return (
    <div>
      <span className="eyebrow">Historique</span>
      <h1>Mes tests</h1>

      {sessions.length === 0 ? (
        <div className="card">
          <p>Vous n'avez pas encore passé de test.</p>
          <Link to="/nouveau-test" className="btn-link">Commencer un test</Link>
        </div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Contenu</th>
                <th>Questions</th>
                <th>Note</th>
                <th>Statut</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {sessions.map((s) => (
                <tr key={s.id}>
                  <td>{formatDate(s.startedAt)}</td>
                  <td>
                    {describeFilters(s.filters)}
                    {s.timeLimitMinutes && <span className="muted"> · {s.timeLimitMinutes} min</span>}
                  </td>
                  <td>{s.correct}/{s.questionCount}</td>
                  <td>
                    {s.status === "terminee" ? (
                      <span className={`badge badge--${scoreTone(s.score)}`}>{s.note20}/20 · {s.score}%</span>
                    ) : "—"}
                  </td>
                  <td>{STATUS[s.status] || s.status}</td>
                  <td>
                    {s.status === "terminee"
                      ? <Link to={`/quiz/${s.id}/resultats`}>Détails</Link>
                      : s.resumable ? <Link to={`/quiz/${s.id}`}>Reprendre</Link> : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
