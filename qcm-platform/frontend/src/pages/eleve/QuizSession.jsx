import { useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { submitAnswer, completeSession } from "../../api/quizSessions";

export default function QuizSession() {
  const { sessionId } = useParams();
  const { state } = useLocation(); // { session, questions, subscriptionId }
  const navigate = useNavigate();
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState({});

  if (!state) {
    return <p>Session introuvable. Merci de redémarrer un test depuis le tableau de bord.</p>;
  }

  const { questions, subscriptionId } = state;
  const current = questions[index];
  const isLast = index === questions.length - 1;

  async function handleSelect(optionId) {
    setSelected({ ...selected, [current.id]: optionId });
    await submitAnswer(sessionId, { questionId: current.id, selectedOptionId: optionId });
  }

  async function handleNext() {
    if (isLast) {
      const { data } = await completeSession(sessionId, { subscriptionId });
      navigate(`/quiz/${sessionId}/resultats`, { state: data });
    } else {
      setIndex(index + 1);
    }
  }

  return (
    <div className="card">
      <span className="eyebrow">Question {index + 1} / {questions.length}</span>
      <h2>{current.statement}</h2>
      <ul style={{ listStyle: "none", padding: 0 }}>
        {current.options.map((opt) => (
          <li key={opt.id} style={{ marginBottom: "0.5rem" }}>
            <label style={{ fontWeight: 400, display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer" }}>
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
      <button disabled={!selected[current.id]} onClick={handleNext}>
        {isLast ? "Terminer le test" : "Question suivante"}
      </button>
    </div>
  );
}
