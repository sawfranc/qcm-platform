import { useState } from "react";
import { Link } from "react-router-dom";
import { importQuestions } from "../../api/questions";
import { parseQuestionFile, downloadTemplate } from "../../utils/parseQuestionFile";

export default function ImportQuestions() {
  const [fileName, setFileName] = useState("");
  const [rows, setRows] = useState(null);
  const [createMissingLevels, setCreateMissingLevels] = useState(false);
  const [check, setCheck] = useState(null); // résultat de la vérification
  const [done, setDone] = useState(null); // résultat de l'import
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  async function runCheck(currentRows, createLevels) {
    setBusy(true);
    setError(null);
    try {
      const { data } = await importQuestions(currentRows, { dryRun: true, createMissingLevels: createLevels });
      setCheck(data);
    } catch (err) {
      setCheck(null);
      setError(err.response?.data?.error || "Vérification impossible.");
    } finally {
      setBusy(false);
    }
  }

  async function handleFile(e) {
    const file = e.target.files?.[0];
    setCheck(null);
    setDone(null);
    setError(null);
    setRows(null);
    if (!file) return;
    setFileName(file.name);
    try {
      const parsed = await parseQuestionFile(file);
      setRows(parsed);
      await runCheck(parsed, createMissingLevels);
    } catch (err) {
      setError(err.message || "Fichier illisible.");
    }
  }

  async function handleToggleLevels(e) {
    const value = e.target.checked;
    setCreateMissingLevels(value);
    if (rows) await runCheck(rows, value);
  }

  async function handleImport() {
    setBusy(true);
    setError(null);
    try {
      const { data } = await importQuestions(rows, { dryRun: false, createMissingLevels });
      setDone(data);
      setCheck(null);
      setRows(null);
    } catch (err) {
      setError(err.response?.data?.error || "Import impossible.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <span className="eyebrow">Banque de questions</span>
      <h1>Importer des questions</h1>
      <p className="muted">
        Déposez un fichier Excel (.xlsx) ou CSV. Chaque ligne est vérifiée avant l'import. Les questions importées sont créées
        « en attente » : le directeur du domaine les valide ensuite, comme pour une question saisie à la main.
      </p>

      {error && <p className="alert alert--error">{error}</p>}

      {done ? (
        <div className="card">
          <p className="alert alert--success">
            {done.imported} question(s) importée(s) et envoyée(s) pour validation.
            {done.invalid > 0 && ` ${done.invalid} ligne(s) ignorée(s).`}
          </p>
          {done.invalid > 0 && <ReportTable report={done.report.filter((r) => !r.ok)} />}
          <p><Link to="/enseignant">Retour à mes questions</Link></p>
        </div>
      ) : (
        <>
          <div className="card">
            <h3>1. Préparer le fichier</h3>
            <p className="muted">
              Colonnes : matiere, thematique, niveau, enonce, option_a à option_d, bonne_reponse (A, B, C ou D), explication, difficulte (1 à 3).
              La matière, la thématique et le niveau doivent porter exactement le nom existant dans la plateforme (accents et majuscules sans importance).
              Maximum 200 lignes par import.
            </p>
            <button type="button" onClick={downloadTemplate}>Télécharger un modèle (CSV)</button>
          </div>

          <div className="card">
            <h3>2. Déposer le fichier</h3>
            <label>
              Fichier .xlsx ou .csv
              <input type="file" accept=".xlsx,.csv,.txt" onChange={handleFile} />
            </label>
            <label className="inline-check">
              <input type="checkbox" checked={createMissingLevels} onChange={handleToggleLevels} />
              Créer automatiquement les niveaux qui n'existent pas encore (ex. « Licence »)
            </label>
          </div>
        </>
      )}

      {busy && <p className="muted">Traitement en cours…</p>}

      {check && !done && (
        <div className="card">
          <h3>3. Vérification — {fileName}</h3>
          <p>
            <span className="badge badge--success">{check.valid} valide(s)</span>{" "}
            <span className={`badge ${check.invalid ? "badge--error" : "badge--neutral"}`}>{check.invalid} à corriger</span>{" "}
            <span className="muted">sur {check.total} ligne(s)</span>
          </p>
          {check.newLevels.length > 0 && (
            <p className="alert alert--success">Niveau(x) qui seront créés : {check.newLevels.join(", ")}.</p>
          )}
          <ReportTable report={check.report} />
          {check.invalid > 0 && check.valid > 0 && (
            <p className="muted">Les lignes en erreur seront ignorées. Corrigez-les dans le fichier et redéposez-le pour les importer.</p>
          )}
          <button type="button" className="primary" disabled={busy || check.valid === 0} onClick={handleImport}>
            Importer {check.valid} question(s)
          </button>
        </div>
      )}
    </div>
  );
}

function ReportTable({ report }) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr><th>Ligne</th><th>Question</th><th>Résultat</th></tr>
        </thead>
        <tbody>
          {report.map((r) => (
            <tr key={r.line}>
              <td>{r.line}</td>
              <td>{r.statement || "—"}</td>
              <td>
                {r.ok ? (
                  <span className="badge badge--success">OK{r.note ? ` · ${r.note}` : ""}</span>
                ) : (
                  <ul style={{ margin: 0, paddingLeft: "1.1rem" }}>
                    {r.errors.map((m) => <li key={m} style={{ color: "var(--error)" }}>{m}</li>)}
                  </ul>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
