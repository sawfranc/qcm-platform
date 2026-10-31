import { useEffect, useState } from "react";
import { listDomains } from "../../api/domains";
import { createUser, listUsers, suspendUser } from "../../api/users";
import TeacherAssignmentsEditor, { AssignmentChips } from "../../components/TeacherAssignments";

// Permet à l'administrateur de créer des comptes enseignant ou directeur,
// et de les rattacher directement à un domaine (pour les enseignants).
export default function ManageTeachers() {
  const [domains, setDomains] = useState([]);
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    phone: "",
    password: "",
    role: "enseignant",
    domainId: "",
  });
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [editingId, setEditingId] = useState(null);

  async function refresh() {
    const [domainsRes, usersRes] = await Promise.all([listDomains(), listUsers()]);
    setDomains(domainsRes.data);
    setUsers(usersRes.data.filter((u) => u.role !== "eleve"));
  }

  useEffect(() => {
    refresh();
  }, []);

  function update(field) {
    return (e) => setForm({ ...form, [field]: e.target.value });
  }

  async function handleCreate(e) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    try {
      await createUser(form);
      setSuccess(`Compte ${form.role} créé pour ${form.fullName}.`);
      setForm({ fullName: "", email: "", phone: "", password: "", role: "enseignant", domainId: "" });
      refresh();
    } catch (err) {
      setError(err.response?.data?.error || "Impossible de créer ce compte.");
    }
  }

  async function handleSuspend(id) {
    if (!window.confirm("Suspendre ce compte ?")) return;
    await suspendUser(id);
    refresh();
  }

  return (
    <div>
      <h1>Gérer les enseignants et directeurs</h1>

      <form onSubmit={handleCreate}>
        <h2>Créer un compte</h2>
        {error && <p className="alert alert--error">{error}</p>}
        {success && <p className="alert alert--success">{success}</p>}

        <label>Rôle
          <select value={form.role} onChange={update("role")}>
            <option value="enseignant">Enseignant</option>
            <option value="directeur">Directeur de domaine</option>
          </select>
        </label>

        <label>Nom complet
          <input value={form.fullName} onChange={update("fullName")} required />
        </label>
        <label>Email
          <input type="email" value={form.email} onChange={update("email")} required />
        </label>
        <label>Téléphone
          <input value={form.phone} onChange={update("phone")} />
        </label>
        <label>Mot de passe provisoire
          <input type="password" value={form.password} onChange={update("password")} required minLength={8} />
        </label>

        {form.role === "enseignant" && (
          <label>Domaine à assigner
            <select value={form.domainId} onChange={update("domainId")} required>
              <option value="">-- choisir --</option>
              {domains.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </label>
        )}

        <button type="submit">Créer le compte</button>
      </form>

      <h2>Comptes existants (enseignants / directeurs)</h2>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th style={{ textAlign: "left" }}>Nom</th>
            <th style={{ textAlign: "left" }}>Email</th>
            <th style={{ textAlign: "left" }}>Rôle</th>
            <th style={{ textAlign: "left" }}>Domaine(s)</th>
            <th style={{ textAlign: "left" }}>Statut</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.id}>
              <td>{u.fullName}</td>
              <td>{u.email}</td>
              <td>{u.role}</td>
              <td>
                {u.role === "enseignant" ? <AssignmentChips assignments={u.teacherAssignments} /> : "—"}
                {editingId === u.id && (
                  <TeacherAssignmentsEditor
                    teacher={u}
                    domains={domains}
                    onCancel={() => setEditingId(null)}
                    onSaved={() => { setEditingId(null); refresh(); }}
                  />
                )}
              </td>
              <td>
                <span className={`badge ${u.status === "actif" ? "badge--success" : "badge--error"}`}>
                  {u.status}
                </span>
              </td>
              <td>
                {u.role === "enseignant" && editingId !== u.id && (
                  <button onClick={() => setEditingId(u.id)}>Domaines</button>
                )}{" "}
                {u.status === "actif" && (
                  <button onClick={() => handleSuspend(u.id)}>Suspendre</button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
