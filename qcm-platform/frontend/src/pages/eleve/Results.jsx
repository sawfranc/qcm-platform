import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getResult } from "../../api/quizSessions";
import ProgressBar from "../../components/ProgressBar";
import { formatDuration, describeFilters, scoreTone } from "../../utils/format";

export default function Results() {
  const { sessionId } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [onlyErrors, setOnlyErrors] = useState(false);

  useEffect(() => {
    getResult(sessionId)
      .then((res) => setData(res.data))
      .catch((err) => setError(err.response?.data?.error || "Résultat indisponible."));
  }, [sessionId]);

  if (error) return <p className="alert alert--error">{error}</p>;
  if (!data) return <p className="muted">Chargement…</p>;

  const { score, note20, total, correct, answered, unanswered, durationSeconds, timedOut, advice, review, session } = data;
  const tone = scoreTone(score);
  const shown = onlyErrors ? review.filter((q) => !q.isCorrect) : review;

  return (
    <div>
      <span className="eyebrow">Résultat du test</span>
      <h1>Ma note</h1>

      {timedOut && <p className="alert alert--error">Le temps imparti est écoulé : le test a été clôturé automatiquement.</p>}

      <div className={`card score-hero score-hero--${tone}`}>
        <div className="score-hero__note">{note20}<span>/20</span></div>
        <div>
          <p className="score-hero__line"><strong>{score}%</strong> de réussite · {correct} bonne(s) réponse(s) sur {total}</p>
          <p className="muted">
            {describeFilters(session.filters)}
            {unanswered > 0 && ` · ${unanswered} sans réponse`}
            {` · ${answered} répondue(s) · durée ${formatDuration(durationSeconds)}`}
          </p>
        </div>
      </div>

      <h2>Conseils par thématique</h2>
      {advice.map((a) => (
        <div key={a.theme} className="card">
          <h3>
            {a.theme}{" "}
            <span className={`badge ${a.needsReview ? "badge--error" : "badge--success"}`}>{a.successRate}% de réussite</span>
          </h3>
          <ProgressBar value={a.successRate} tone={a.needsReview ? "error" : "success"} label={a.theme} />
          {a.needsReview ? (
            <>
              <p style={{ marginTop: "0.8rem" }}>Thématique à retravailler ({a.correct}/{a.total}).</p>
              {a.recommendedReferences.length > 0 && (
                <ul>
                  {a.recommendedReferences.map((r) => (
                    <li key={r.title}>
                      {r.url ? <a href={r.url} target="_blank" rel="noreferrer">{r.title}</a> : r.title}
                    </li>
                  ))}
                </ul>
              )}
            </>
          ) : (
            <p style={{ marginTop: "0.8rem" }}>Bon niveau de maîtrise.</p>
          )}
        </div>
      ))}

      <div className="card__head">
        <h2>Correction détaillée</h2>
        <label className="inline-check">
          <input type="checkbox" checked={onlyErrors} onChange={(e) => setOnlyErrors(e.target.checked)} />
          Erreurs seulement
        </label>
      </div>

      {shown.length === 0 && <p className="alert alert--success">Aucune erreur, bravo !</p>}
      {shown.map((q) => {
        const number = review.indexOf(q) + 1;
        return (
          <div key={q.id} className="card">
            <span className="eyebrow">
              Question {number} · {q.theme}{" "}
              <span className={`badge ${q.isCorrect ? "badge--success" : "badge--error"}`}>
                {q.isCorrect ? "Juste" : q.answered ? "Faux" : "Sans réponse"}
              </span>
            </span>
            <p><strong>{q.statement}</strong></p>
            <ul className="review-options">
              {q.options.map((o) => {
                const cls = o.isCorrect ? "is-correct" : o.id === q.selectedOptionId ? "is-wrong" : "";
                return (
                  <li key={o.id} className={cls}>
                    {o.isCorrect ? "✓ " : o.id === q.selectedOptionId ? "✗ " : ""}
                    {o.label}
                    {o.id === q.selectedOptionId && <span className="muted"> (votre réponse)</span>}
                  </li>
                );
              })}
            </ul>
            {q.explanation && <p className="muted">💡 {q.explanation}</p>}
          </div>
        );
      })}

      <p>
        <Link to="/nouveau-test" className="btn-link">Refaire un test</Link>{" "}
        <Link to="/historique">Mon historique</Link>
      </p>
    </div>
  );
}
