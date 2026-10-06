import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getDashboard } from "../../api/quizSessions";
import { useAuth } from "../../context/AuthContext";
import LineChart from "../../components/LineChart";
import ProgressBar from "../../components/ProgressBar";
import { formatShortDate } from "../../utils/format";

function Kpi({ label, value, hint }) {
  return (
    <div className="kpi">
      <span className="kpi__label">{label}</span>
      <span className="kpi__value">{value}</span>
      {hint && <span className="kpi__hint">{hint}</span>}
    </div>
  );
}

export default function StudentDashboard() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    getDashboard()
      .then((res) => setData(res.data))
      .catch((err) => setError(err.response?.data?.error || "Impossible de charger le tableau de bord."));
  }, []);

  if (error) return <p className="alert alert--error">{error}</p>;
  if (!data) return <p className="muted">Chargement…</p>;

  const { quota, totals, progression, byTheme, byDomain, weakThemes, inProgress } = data;
  const usedPct = quota.unlimited || !quota.total ? 0 : Math.round((quota.used / quota.total) * 100);
  const quotaTone = quota.unlimited ? "board" : usedPct >= 90 ? "error" : usedPct >= 70 ? "gold" : "board";
  const hasTests = totals.testsCompleted > 0;

  return (
    <div>
      <span className="eyebrow">Tableau de bord</span>
      <h1>Bonjour, {user?.fullName?.split(" ")[0]}</h1>

      {inProgress && (
        <div className="alert alert--success">
          Vous avez un test en cours ({inProgress.questionCount} questions).{" "}
          <Link to={`/quiz/${inProgress.id}`}>Reprendre le test</Link>
        </div>
      )}

      <div className="card quota-card">
        <div className="quota-card__head">
          <div>
            <span className="eyebrow">Mon quota de questions</span>
            <p className="quota-card__figure">
              {quota.unlimited ? "Illimité" : (
                <>
                  <strong>{quota.remaining}</strong> restantes <span className="muted">sur {quota.total}</span>
                </>
              )}
            </p>
          </div>
          <Link to="/nouveau-test" className="btn-link">Nouveau test</Link>
        </div>
        {!quota.unlimited && <ProgressBar value={usedPct} tone={quotaTone} label="Quota consommé" />}
        {!quota.unlimited && <p className="muted">{quota.used} question(s) déjà utilisée(s).</p>}
        {!quota.unlimited && quota.remaining === 0 && (
          <p className="alert alert--error">Votre quota est épuisé. Contactez l'administration pour le recharger.</p>
        )}
      </div>

      {!hasTests ? (
        <div className="card">
          <h3>Pas encore de test terminé</h3>
          <p>Lancez votre premier test pour voir apparaître votre note, votre progression et vos points à travailler.</p>
          <Link to="/nouveau-test" className="btn-link">Commencer un test</Link>
        </div>
      ) : (
        <>
          <div className="kpi-grid">
            <Kpi label="Dernière note" value={`${totals.lastNote20}/20`} hint={`${totals.lastScore}%`} />
            <Kpi label="Moyenne" value={`${totals.averageNote20}/20`} hint={`${totals.averageScore}%`} />
            <Kpi label="Meilleure note" value={`${totals.bestNote20}/20`} hint={`${totals.bestScore}%`} />
            <Kpi label="Tests terminés" value={totals.testsCompleted} hint={`${totals.questionsAnswered} questions répondues`} />
          </div>

          <div className="card">
            <div className="card__head">
              <h3>Ma progression</h3>
              {totals.trend != null && (
                <span className={`badge ${totals.trend >= 0 ? "badge--success" : "badge--error"}`}>
                  {totals.trend >= 0 ? "▲" : "▼"} {Math.abs(totals.trend)} pts
                </span>
              )}
            </div>
            {progression.length < 2 ? (
              <p className="muted">Terminez au moins deux tests pour voir la courbe de progression.</p>
            ) : (
              <LineChart points={progression.map((p) => ({ label: formatShortDate(p.date), value: p.score }))} />
            )}
            <p className="muted">Ligne pointillée : seuil de maîtrise (60 %).</p>
          </div>

          <div className="card">
            <h3>Réussite par thématique</h3>
            {byTheme.length === 0 ? (
              <p className="muted">Aucune donnée.</p>
            ) : (
              <ul className="bars">
                {byTheme.slice(0, 8).map((t) => (
                  <li key={t.name}>
                    <div className="bars__row">
                      <span>{t.name}</span>
                      <span className="muted">{t.successRate}% · {t.correct}/{t.total}</span>
                    </div>
                    <ProgressBar value={t.successRate} tone={t.successRate >= 60 ? "success" : "error"} label={t.name} />
                  </li>
                ))}
              </ul>
            )}
          </div>

          {weakThemes.length > 0 && (
            <div className="card">
              <h3>À retravailler en priorité</h3>
              <ul>
                {weakThemes.map((t) => (
                  <li key={t.name}><strong>{t.name}</strong> — {t.successRate}% de réussite sur {t.total} questions</li>
                ))}
              </ul>
            </div>
          )}

          {byDomain.length > 1 && (
            <div className="card">
              <h3>Par matière</h3>
              <ul className="bars">
                {byDomain.map((d) => (
                  <li key={d.name}>
                    <div className="bars__row">
                      <span>{d.name}</span>
                      <span className="muted">{d.successRate}% · {d.total} questions</span>
                    </div>
                    <ProgressBar value={d.successRate} tone={d.successRate >= 60 ? "success" : "error"} label={d.name} />
                  </li>
                ))}
              </ul>
            </div>
          )}

          <p><Link to="/historique">Voir tout mon historique →</Link></p>
        </>
      )}
    </div>
  );
}
