import { useState } from "react";
import { setTeacherAssignments } from "../api/users";

// Affiche les domaines/thèmes d'un enseignant et permet de les modifier.
// Props : teacher (avec teacherAssignments), domains (domaines modifiables par l'utilisateur,
// avec leurs themes), onSaved (rafraîchissement).
// Une affectation sans thème = tout le domaine.
export function AssignmentChips({ assignments }) {
  if (!assignments || assignments.length === 0) {
    return <span style={{ color: "#999" }}>Aucun domaine</span>;
  }
  const byDomain = new Map();
  for (const a of assignments) {
    if (!byDomain.has(a.domain.id)) byDomain.set(a.domain.id, { name: a.domain.name, whole: false, themes: [] });
    const e = byDomain.get(a.domain.id);
    if (a.theme) e.themes.push(a.theme.name);
    else e.whole = true;
  }
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
      {[...byDomain.values()].map((e) => (
        <span key={e.name} className="badge badge--success" title={e.whole ? "Tout le domaine" : "Thèmes choisis"}>
          {e.name}
          {e.whole ? "" : ` (${e.themes.join(", ")})`}
        </span>
      ))}
    </div>
  );
}

function initialState(teacher, domains) {
  const state = {};
  for (const d of domains) state[d.id] = { whole: false, themes: new Set() };
  for (const a of teacher.teacherAssignments || []) {
    if (!state[a.domainId]) continue;
    if (a.themeId) state[a.domainId].themes.add(a.themeId);
    else state[a.domainId].whole = true;
  }
  return state;
}

export default function TeacherAssignmentsEditor({ teacher, domains, onSaved, onCancel }) {
  const [state, setState] = useState(() => initialState(teacher, domains));
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  function toggleWhole(domainId) {
    setState((s) => ({ ...s, [domainId]: { ...s[domainId], whole: !s[domainId].whole } }));
  }
  function toggleTheme(domainId, themeId) {
    setState((s) => {
      const themes = new Set(s[domainId].themes);
      themes.has(themeId) ? themes.delete(themeId) : themes.add(themeId);
      return { ...s, [domainId]: { ...s[domainId], themes } };
    });
  }

  async function save() {
    setSaving(true);
    setError(null);
    const assignments = [];
    for (const d of domains) {
      const st = state[d.id];
      if (st.whole) assignments.push({ domainId: d.id, themeId: null });
      else st.themes.forEach((themeId) => assignments.push({ domainId: d.id, themeId }));
    }
    // Les affectations hors périmètre (autres domaines) sont conservées côté serveur pour un directeur.
    try {
      await setTeacherAssignments(teacher.id, assignments);
      onSaved();
    } catch (err) {
      setError(err.response?.data?.error || "Impossible d'enregistrer les affectations.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ border: "1px solid #ddd", borderRadius: 6, padding: 12, margin: "8px 0", background: "#fafafa" }}>
      <strong>Domaines et thèmes de {teacher.fullName}</strong>
      {error && <p className="alert alert--error">{error}</p>}
      {domains.length === 0 && <p>Aucun domaine disponible.</p>}
      {domains.map((d) => (
        <div key={d.id} style={{ margin: "8px 0" }}>
          <label style={{ fontWeight: 600 }}>
            <input type="checkbox" checked={state[d.id].whole} onChange={() => toggleWhole(d.id)} /> {d.name} (tout le domaine)
          </label>
          {!state[d.id].whole && (d.themes || []).length > 0 && (
            <div style={{ marginLeft: 24, display: "flex", flexDirection: "column" }}>
              {d.themes.map((t) => (
                <label key={t.id}>
                  <input
                    type="checkbox"
                    checked={state[d.id].themes.has(t.id)}
                    onChange={() => toggleTheme(d.id, t.id)}
                  /> {t.name}
                </label>
              ))}
            </div>
          )}
        </div>
      ))}
      <button onClick={save} disabled={saving}>{saving ? "Enregistrement…" : "Enregistrer"}</button>{" "}
      <button type="button" onClick={onCancel}>Annuler</button>
    </div>
  );
}
