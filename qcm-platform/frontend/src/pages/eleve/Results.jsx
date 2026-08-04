import { useLocation } from "react-router-dom";

export default function Results() {
  const { state } = useLocation(); // { score, total, correct, advice }

  if (!state) return <p>Résultat indisponible.</p>;

  const { score, total, correct, advice } = state;

  return (
    <div>
      <h1>Résultat du test</h1>
      <p>Score : <strong>{score}%</strong> ({correct} / {total} bonnes réponses)</p>

      <h2>Conseils par thématique</h2>
      {advice.map((a) => (
        <div key={a.theme} className="card">
          <h3>
            {a.theme}{" "}
            <span className={`badge ${a.needsReview ? "badge--error" : "badge--success"}`}>
              {a.successRate}% de réussite
            </span>
          </h3>
          {a.needsReview ? (
            <>
              <p>Thématique à retravailler.</p>
              {a.recommendedReferences.length > 0 && (
                <ul>
                  {a.recommendedReferences.map((ref) => <li key={ref}>{ref}</li>)}
                </ul>
              )}
            </>
          ) : (
            <p>Bon niveau de maîtrise.</p>
          )}
        </div>
      ))}
    </div>
  );
}
