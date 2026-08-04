import { useEffect, useState } from "react";
import { listDomains, createTheme } from "../../api/domains";
import apiClient from "../../api/client";

export default function ManageDomains() {
  const [domains, setDomains] = useState([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  // Un champ de saisie de thématique distinct par domaine (clé = domainId)
  const [themeInputs, setThemeInputs] = useState({});
  const [error, setError] = useState(null);

  async function refresh() {
    const { data } = await listDomains();
    setDomains(data);
  }

  useEffect(() => { refresh(); }, []);

  async function handleCreateDomain(e) {
    e.preventDefault();
    setError(null);
    try {
      await apiClient.post("/domains", { name, description });
      setName("");
      setDescription("");
      refresh();
    } catch (err) {
      setError(err.response?.data?.error || "Impossible de créer le domaine.");
    }
  }

  function updateThemeInput(domainId, value) {
    setThemeInputs({ ...themeInputs, [domainId]: value });
  }

  async function handleCreateTheme(domainId) {
    const themeName = (themeInputs[domainId] || "").trim();
    if (!themeName) return;
    setError(null);
    try {
      await createTheme(domainId, themeName);
      updateThemeInput(domainId, "");
      refresh();
    } catch (err) {
      setError(err.response?.data?.error || "Impossible de créer la thématique.");
    }
  }

  return (
    <div>
      <h1>Domaines</h1>
      {error && <p className="alert alert--error">{error}</p>}

      <form onSubmit={handleCreateDomain}>
        <h2>Créer un nouveau domaine</h2>
        <input placeholder="Nom du domaine" value={name} onChange={(e) => setName(e.target.value)} required />
        <input placeholder="Description" value={description} onChange={(e) => setDescription(e.target.value)} />
        <button type="submit">Créer</button>
      </form>

      <h2>Domaines existants</h2>
      {domains.map((d) => (
        <div key={d.id} className="card">
          <h3>{d.name}</h3>
          {d.description && <p style={{ color: "#666" }}>{d.description}</p>}

          <p><strong>Thématiques :</strong></p>
          {d.themes.length === 0 ? (
            <p style={{ color: "#999" }}>Aucune thématique pour l'instant.</p>
          ) : (
            <ul>
              {d.themes.map((t) => <li key={t.id}>{t.name}</li>)}
            </ul>
          )}

          <div style={{ display: "flex", gap: "0.5rem" }}>
            <input
              placeholder="Nom de la nouvelle thématique"
              value={themeInputs[d.id] || ""}
              onChange={(e) => updateThemeInput(d.id, e.target.value)}
            />
            <button type="button" onClick={() => handleCreateTheme(d.id)}>
              + Ajouter la thématique
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
