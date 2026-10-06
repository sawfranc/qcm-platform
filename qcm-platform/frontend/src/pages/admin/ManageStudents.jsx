import { useEffect, useState } from "react";
import { listStudents, updateQuota } from "../../api/students";

function StudentRow({ student, onSaved }) {
  const [unlimited, setUnlimited] = useState(student.unlimited);
  const [quota, setQuota] = useState(student.quota ?? 0);
  const [reset, setReset] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  async function save() {
    setSaving(true);
    setMessage(null);
    try {
      const value = unlimited ? null : Number(quota);
      const { data } = await updateQuota(student.id, value, reset);
      setReset(false);
      onSaved(data);
      setMessage("Enregistré ✓");
    } catch (err) {
      setMessage(err.response?.data?.error || "Échec de l'enregistrement.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <tr>
      <td>
        <strong>{student.fullName}</strong>
        <div className="muted">{student.email || student.phone || "—"}</div>
      </td>
      <td>{student.unlimited ? "∞" : `${student.used} / ${student.quota}`}</td>
      <td>{student.unlimited ? "Illimité" : student.remaining}</td>
      <td>
        <div className="quota-edit">
          <input
            type="number"
            min={0}
            value={quota}
            disabled={unlimited}
            onChange={(e) => setQuota(e.target.value)}
            aria-label={`Quota de ${student.fullName}`}
          />
          <label><input type="checkbox" checked={unlimited} onChange={(e) => setUnlimited(e.target.checked)} />Illimité</label>
          <label><input type="checkbox" checked={reset} onChange={(e) => setReset(e.target.checked)} />Remettre le compteur à 0</label>
          <button type="button" disabled={saving} onClick={save}>{saving ? "…" : "Enregistrer"}</button>
        </div>
        {message && <div className="muted">{message}</div>}
      </td>
    </tr>
  );
}

export default function ManageStudents() {
  const [students, setStudents] = useState(null);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    listStudents()
      .then((res) => setStudents(res.data))
      .catch((err) => setError(err.response?.data?.error || "Impossible de charger les étudiants."));
  }, []);

  if (error) return <p className="alert alert--error">{error}</p>;
  if (!students) return <p className="muted">Chargement…</p>;

  const q = search.trim().toLowerCase();
  const filtered = q
    ? students.filter((s) => `${s.fullName} ${s.email || ""} ${s.phone || ""}`.toLowerCase().includes(q))
    : students;

  function replace(updated) {
    setStudents((list) => list.map((s) => (s.id === updated.id ? { ...s, ...updated } : s)));
  }

  return (
    <div>
      <h1>Étudiants et quotas de questions</h1>
      <p className="muted">
        Le quota est le nombre maximum de questions auxquelles un étudiant peut répondre. Chaque première réponse à une question consomme 1 unité.
      </p>
      <label>
        Rechercher
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Nom, email ou téléphone" />
      </label>

      {filtered.length === 0 ? (
        <p>Aucun étudiant.</p>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>Étudiant</th><th>Utilisé</th><th>Restant</th><th>Affecter un quota</th></tr>
            </thead>
            <tbody>
              {filtered.map((s) => <StudentRow key={s.id} student={s} onSaved={replace} />)}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
