import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getSession, submitAnswer, completeSession } from "../../api/quizSessions";
import { formatClock } from "../../utils/format";

export default function QuizSession() {
  const { sessionId } = useParams();
  const navigate = useNavigate();

  const [session, setSession] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [selected, setSelected] = useState({});
  const [index, setIndex] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(null);
  const [error, setError] = useState(null);
  const [finishing, setFinishing] = useState(false);

  const offsetRef = useRef(0); // décalage horloge serveur / client
  const finishedRef = useRef(false);

  const goToResults = useCallback(() => navigate(`/quiz/${sessionId}/resultats`, { replace: true }), [navigate, sessionId]);

  const finish = useCallback(async () => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    setFinishing(true);
    try {
      await completeSession(sessionId);
    } catch (err) {
      finishedRef.current = false;
      setFinishing(false);
      setError(err.response?.data?.error || "Impossible de terminer le test.");
      return;
    }
    goToResults();
  }, [sessionId, goToResults]);

  // Chargement (reprise possible après rafraîchissement de la page)
  useEffect(() => {
    getSession(sessionId)
      .then(({ data }) => {
        if (data.finished) return goToResults();
        offsetRef.current = Date.parse(data.session.serverTime) - Date.now();
        setSession(data.session);
        setQuestions(data.questions);
        setSelected(data.answers || {});
        // Reprend à la première question sans réponse
        const firstOpen = data.questions.findIndex((q) => !data.answers?.[q.id]);
        setIndex(firstOpen === -1 ? 0 : firstOpen);
      })
      .catch((err) => setError(err.response?.data?.error || "Session introuvable."));
  }, [sessionId, goToResults]);

  // Compte à rebours basé sur l'horloge du serveur
  useEffect(() => {
    if (!session?.expiresAt) return undefined;
    const expires = Date.parse(session.expiresAt);
    const tick = () => {
      const left = Math.ceil((expires - (Date.now() + offsetRef.current)) / 1000);
      setSecondsLeft(left);
      if (left <= 0) finish();
    };
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [session, finish]);

  if (error && !session) return <p className="alert alert--error">{error}</p>;
  if (!session) return <p className="muted">Chargement…</p>;

  const current = questions[index];
  const isLast = index === questions.length - 1;
  const answeredCount = Object.keys(selected).length;
  const lowTime = secondsLeft !== null && secondsLeft <= 60;

  async function handleSelect(optionId) {
    const previous = selected[current.id];
    setSelected({ ...selected, [current.id]: optionId });
    setError(null);
    try {
      await submitAnswer(sessionId, { questionId: current.id, selectedOptionId: optionId });
    } catch (err) {
      if (err.response?.status === 410) return goToResults(); // temps écoulé côté serveur
      setSelected((s) => {
        const copy = { ...s };
        if (previous) copy[current.id] = previous;
        else delete copy[current.id];
        return copy;
      });
      setError(err.response?.data?.error || "Réponse non enregistrée, réessayez.");
    }
  }

  function handleFinish() {
    const missing = questions.length - answeredCount;
    const msg = missing > 0
      ? `Il vous reste ${missing} question(s) sans réponse (comptées fausses). Terminer le test ?`
      : "Terminer le test et voir ma note ?";
    if (window.confirm(msg)) finish();
  }

  return (
    <div>
      <div className="quiz-bar">
        <span className="eyebrow">Question {index + 1} / {questions.length} · {answeredCount} répondue(s)</span>
        {secondsLeft !== null && (
          <span className={`timer ${lowTime ? "timer--low" : ""}`} role="timer" aria-label="Temps restant">
            ⏱ {formatClock(secondsLeft)}
          </span>
        )}
      </div>

      <div className="qnav" aria-label="Navigation entre les questions">
        {questions.map((q, i) => (
          <button
            key={q.id}
            type="button"
            className={`qnav__dot ${i === index ? "is-current" : ""} ${selected[q.id] ? "is-done" : ""}`}
            onClick={() => setIndex(i)}
            aria-label={`Question ${i + 1}${selected[q.id] ? " (répondue)" : ""}`}
          >
            {i + 1}
          </button>
        ))}
      </div>

      {error && <p className="alert alert--error">{error}</p>}

      <div className="card">
        <h2 style={{ marginTop: 0 }}>{current.statement}</h2>
        <ul style={{ listStyle: "none", padding: 0 }}>
          {current.options.map((opt) => (
            <li key={opt.id} style={{ marginBottom: "0.5rem" }}>
              <label className={`option ${selected[current.id] === opt.id ? "is-selected" : ""}`}>
                <input
                  type="radio"
                  name={current.id}
                  checked={selected[current.id] === opt.id}
                  onChange={() => handleSelect(opt.id)}
                />
                {opt.label}
              </label>
            </li>
          ))}
        </ul>

        <div className="quiz-actions">
          <button type="button" disabled={index === 0} onClick={() => setIndex(index - 1)}>← Précédente</button>
          {isLast ? (
            <button type="button" className="primary" disabled={finishing} onClick={handleFinish}>
              {finishing ? "Correction…" : "Terminer le test"}
            </button>
          ) : (
            <button type="button" className="primary" onClick={() => setIndex(index + 1)}>Suivante →</button>
          )}
        </div>
      </div>

      {!isLast && (
        <p><button type="button" disabled={finishing} onClick={handleFinish}>Terminer maintenant</button></p>
      )}
    </div>
  );
}
