import { useEffect, useState } from "react";
import { listQuestions, validateQuestion, rejectQuestion } from "../../api/questions";

export default function ValidateQuestions() {
  const [questions, setQuestions] = useState([]);

  async function refresh() {
    const { data } = await listQuestions({ status: "en_attente" });
    setQuestions(data);
  }

  useEffect(() => { refresh(); }, []);

  async function handleValidate(id) {
    await validateQuestion(id);
    refresh();
  }

  async function handleReject(id) {
    const reason = window.prompt("Motif du rejet :");
    if (reason) {
      await rejectQuestion(id, reason);
      refresh();
    }
  }

  return (
    <div>
      <h1>Validation des questions</h1>
      {questions.map((q) => (
        <div key={q.id} className="card">
          <p><strong>{q.statement}</strong></p>
          <p className="muted">Auteur : {q.author.fullName}</p>
          <ul>
            {q.options.map((o) => (
              <li key={o.id}>
                {o.label}{" "}
                {o.isCorrect && <span className="badge badge--success">bonne réponse</span>}
              </li>
            ))}
          </ul>
          <button onClick={() => handleValidate(q.id)}>Valider</button>{" "}
          <button type="button" onClick={() => handleReject(q.id)}>Rejeter</button>
        </div>
      ))}
    </div>
  );
}
