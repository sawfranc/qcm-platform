import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { listDomains } from "../../api/domains";
import { startSession } from "../../api/quizSessions";

export default function StudentDashboard() {
  const [domains, setDomains] = useState([]);
  const [domainId, setDomainId] = useState("");
  const [themeId, setThemeId] = useState("");
  const [questionCount, setQuestionCount] = useState(10);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    listDomains().then((res) => setDomains(res.data));
  }, []);

  const selectedDomain = domains.find((d) => d.id === domainId);

  async function handleStart(e) {
    e.preventDefault();
    setError(null);
    try {
      const { data } = await startSession({ domainId, themeId: themeId || undefined, questionCount: Number(questionCount) });
      // On transmet les questions et l'abonnement via l'état de navigation pour éviter un second appel
      navigate(`/quiz/${data.session.id}`, { state: data });
    } catch (err) {
      setError(err.response?.data?.error || "Impossible de démarrer la session.");
    }
  }

  return (
    <div>
      <h1>Choisir un test</h1>
      {error && <p className="alert alert--error">{error}</p>}
      <form onSubmit={handleStart}>
        <label>Domaine
          <select value={domainId} onChange={(e) => setDomainId(e.target.value)} required>
            <option value="">-- choisir --</option>
            {domains.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        </label>
        {selectedDomain && (
          <label>Thématique (optionnel)
            <select value={themeId} onChange={(e) => setThemeId(e.target.value)}>
              <option value="">Toutes</option>
              {selectedDomain.themes.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </label>
        )}
        <label>Nombre de questions
          <input type="number" min={5} max={50} value={questionCount} onChange={(e) => setQuestionCount(e.target.value)} />
        </label>
        <button type="submit">Démarrer le test</button>
      </form>
    </div>
  );
}
