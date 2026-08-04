import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { createQuestion } from "../../api/questions";
import { listDomains } from "../../api/domains";
import { listLevels } from "../../api/levels";

export default function CreateQuestion() {
  const [domains, setDomains] = useState([]);
  const [levels, setLevels] = useState([]);

  const [statement, setStatement] = useState("");
  const [explanation, setExplanation] = useState("");
  const [domainId, setDomainId] = useState("");
  const [themeId, setThemeId] = useState("");
  const [levelId, setLevelId] = useState("");
  const [options, setOptions] = useState([{ label: "", isCorrect: false }, { label: "", isCorrect: false }]);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    listDomains().then((res) => setDomains(res.data));
    listLevels().then((res) => setLevels(res.data));
  }, []);

  // Réinitialise la thématique choisie si on change de domaine, pour éviter une incohérence
  function handleDomainChange(e) {
    setDomainId(e.target.value);
    setThemeId("");
  }

  const selectedDomain = domains.find((d) => d.id === domainId);

  function updateOption(i, field, value) {
    const next = [...options];
    next[i] = { ...next[i], [field]: value };
    setOptions(next);
  }

  function addOption() {
    setOptions([...options, { label: "", isCorrect: false }]);
  }

  function removeOption(i) {
    if (options.length <= 2) return; // toujours garder au moins 2 options
    setOptions(options.filter((_, idx) => idx !== i));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);

    if (!options.some((o) => o.isCorrect)) {
      setError("Il faut cocher au moins une bonne réponse.");
      return;
    }

    try {
      await createQuestion({ statement, explanation, domainId, themeId, levelId, options });
      navigate("/enseignant");
    } catch (err) {
      setError(err.response?.data?.error || "Impossible de créer la question.");
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <h1>Nouvelle question</h1>
      {error && <p className="alert alert--error">{error}</p>}

      <label>Domaine
        <select value={domainId} onChange={handleDomainChange} required>
          <option value="">-- choisir un domaine --</option>
          {domains.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
      </label>

      <label>Thématique
        <select
          value={themeId}
          onChange={(e) => setThemeId(e.target.value)}
          required
          disabled={!selectedDomain}
        >
          <option value="">
            {selectedDomain ? "-- choisir une thématique --" : "-- choisir d'abord un domaine --"}
          </option>
          {selectedDomain?.themes.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
      </label>

      <label>Niveau
        <select value={levelId} onChange={(e) => setLevelId(e.target.value)} required>
          <option value="">-- choisir un niveau --</option>
          {levels.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
        </select>
      </label>

      <label>Énoncé
        <textarea value={statement} onChange={(e) => setStatement(e.target.value)} required />
      </label>
      <label>Indication / méthode
        <textarea value={explanation} onChange={(e) => setExplanation(e.target.value)} />
      </label>

      <h3>Options de réponse</h3>
      {options.map((opt, i) => (
        <div key={i} style={{ display: "flex", gap: "0.5rem", alignItems: "center", marginBottom: "0.5rem" }}>
          <input
            placeholder={`Option ${i + 1}`}
            value={opt.label}
            onChange={(e) => updateOption(i, "label", e.target.value)}
            required
            style={{ flex: 1 }}
          />
          <label style={{ whiteSpace: "nowrap" }}>
            <input
              type="checkbox"
              checked={opt.isCorrect}
              onChange={(e) => updateOption(i, "isCorrect", e.target.checked)}
            />
            {" "}Bonne réponse
          </label>
          {options.length > 2 && (
            <button type="button" onClick={() => removeOption(i)}>✕</button>
          )}
        </div>
      ))}
      <button type="button" onClick={addOption}>+ Ajouter une option</button>

      <br /><br />
      <button type="submit">Soumettre pour validation</button>
    </form>
  );
}
