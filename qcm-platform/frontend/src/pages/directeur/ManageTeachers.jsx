import { useEffect, useState } from "react";
import { myDomains } from "../../api/domains";
import { createUser, listUsers, suspendUser } from "../../api/users";
import TeacherAssignmentsEditor, { AssignmentChips } from "../../components/TeacherAssignments";

// Équivalent de la page admin, mais limitée au(x) domaine(s) que ce directeur dirige.
// Le domaine n'est pas à choisir : on affiche celui du directeur, et on l'utilise directement.
export default function DirectorManageTeachers() {
  const [domains, setDomains] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [form, setForm] = useState({ fullName: "", email: "", phone: "", password: "", domainId: "" });
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [editingId, setEditingId] = useState(null);

  async function refresh() {
    const [domainsRes, usersRes] = await Promise.all([myDomains(), listUsers()]);
    setDomains(domainsRes.data);
    setTeachers(usersRes.data.filter((u) => u.role === "enseignant"));
    // Pré-sélectionne automatiquement le domaine si le directeur n'en a qu'un seul
    if (domainsRes.data.length === 1) {
      setForm((f) => ({ ...f, domainId: domainsRes.data[0].id }));
    }
  }

  useEffect(() => { refresh(); }, []);

  function update(field) {
    return (e) => setForm({ ...form, [field]: e.target.value });
  }

  async function handleCreate(e) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    try {
      await createUser({ ...form, role: "enseignant" });
      setSuccess(`Enseignant ${form.fullName} créé et assigné à votre domaine.`);
      setForm({ fullName: "", email: "", phone: "", password: "", domainId: form.domainId });
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

  if (domains.length === 0) {
    return <p>Aucun domaine ne vous est encore attribué. Contactez l'administrateur central.</p>;
  }

  return (
    <div>
      <h1>Mes enseignants</h1>
      <p>Domaine(s) que vous dirigez : {domains.map((d) => d.name).join(", ")}</p>

      <form onSubmit={handleCreate}>
        <h2>Ajouter un enseignant</h2>
        {error && <p className="alert alert--error">{error}</p>}
        {success && <p className="alert alert--success">{success}</p>}

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

        {domains.length > 1 && (
          <label>Domaine
            <select value={form.domainId} onChange={update("domainId")} required>
              <option value="">-- choisir --</option>
              {domains.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </label>
        )}

        <button type="submit">Créer et assigner</button>
      </form>

      <h2>Mes enseignants actuels</h2>
      {teachers.length === 0 ? (
        <p style={{ color: "#999" }}>Aucun enseignant pour l'instant.</p>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={{ textAlign: "left" }}>Nom</th>
              <th style={{ textAlign: "left" }}>Email</th>
              <th style={{ textAlign: "left" }}>Domaine(s)</th>
              <th style={{ textAlign: "left" }}>Statut</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {teachers.map((t) => (
              <tr key={t.id}>
                <td>{t.fullName}</td>
                <td>{t.email}</td>
                <td>
                  <AssignmentChips assignments={t.teacherAssignments} />
                  {editingId === t.id && (
                    <TeacherAssignmentsEditor
                      teacher={t}
                      domains={domains}
                      onCancel={() => setEditingId(null)}
                      onSaved={() => { setEditingId(null); refresh(); }}
                    />
                  )}
                </td>
                <td>
                  <span className={`badge ${t.status === "actif" ? "badge--success" : "badge--error"}`}>
                    {t.status}
                  </span>
                </td>
                <td>
                  {editingId !== t.id && (
                    <button onClick={() => setEditingId(t.id)}>Domaines</button>
                  )}{" "}
                  {t.status === "actif" && (
                    <button onClick={() => handleSuspend(t.id)}>Suspendre</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
