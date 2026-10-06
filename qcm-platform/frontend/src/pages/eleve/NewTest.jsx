import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { listDomains } from "../../api/domains";
import { listLevels } from "../../api/levels";
import { startSession, getDashboard, getAvailability } from "../../api/quizSessions";

const TIME_PRESETS = [10, 20, 30, 45, 60];
const MAX_QUESTIONS = 50;

function toggle(list, id) {
  return list.includes(id) ? list.filter((x) => x !== id) : [...list, id];
}

function Chips({ items, selected, onToggle }) {
  return (
    <div className="chips">
      {items.map((it) => (
        <button
          key={it.id}
          type="button"
          className="chip"
          aria-pressed={selected.includes(it.id)}
          onClick={() => onToggle(it.id)}
        >
          {it.name}
        </button>
      ))}
    </div>
  );
}

export default function NewTest() {
  const navigate = useNavigate();
  const [domains, setDomains] = useState([]);
  const [levels, setLevels] = useState([]);
  const [quota, setQuota] = useState(null);

  const [domainIds, setDomainIds] = useState([]);
  const [themeIds, setThemeIds] = useState([]);
  const [levelIds, setLevelIds] = useState([]);
  const [questionCount, setQuestionCount] = useState(10);
  const [timeLimit, setTimeLimit] = useState(""); // "" = sans limite
  const [available, setAvailable] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    Promise.all([listDomains(), listLevels(), getDashboard()])
      .then(([d, l, dash]) => {
        setDomains(d.data);
        setLevels(l.data);
        setQuota(dash.data.quota);
      })
      .catch(() => setError("Impossible de charger les données."));
  }, []);

  // Thématiques proposées : celles des matières cochées (ou toutes si aucune matière cochée)
  const visibleThemes = useMemo(() => {
    const source = domainIds.length ? domains.filter((d) => domainIds.includes(d.id)) : domains;
    return source.flatMap((d) => d.themes.map((t) => ({ ...t, name: domainIds.length ? t.name : `${t.name} (${d.name})` })));
  }, [domains, domainIds]);

  function toggleDomain(id) {
    const next = toggle(domainIds, id);
    setDomainIds(next);
    // Retire les thématiques qui n'appartiennent plus aux matières choisies
    if (next.length) {
      const allowed = new Set(domains.filter((d) => next.includes(d.id)).flatMap((d) => d.themes.map((t) => t.id)));
      setThemeIds((prev) => prev.filter((t) => allowed.has(t)));
    }
  }

  // Nombre de questions réellement disponibles pour ces critères
  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(() => {
      getAvailability({ domainIds, themeIds, levelIds })
        .then((res) => !cancelled && setAvailable(res.data.available))
        .catch(() => !cancelled && setAvailable(null));
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [domainIds, themeIds, levelIds]);

  const quotaLeft = quota ? (quota.unlimited ? Infinity : quota.remaining) : 0;
  const maxCount = Math.max(0, Math.min(MAX_QUESTIONS, quotaLeft, available ?? MAX_QUESTIONS));
  const count = Number(questionCount);
  const countOk = Number.isInteger(count) && count >= 1 && count <= maxCount;

  async function handleStart(e) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const { data } = await startSession({
        domainIds,
        themeIds,
        levelIds,
        questionCount: count,
        timeLimitMinutes: timeLimit === "" ? null : Number(timeLimit),
      });
      navigate(`/quiz/${data.session.id}`);
    } catch (err) {
      setError(err.response?.data?.error || "Impossible de démarrer le test.");
      setLoading(false);
    }
  }

  if (!quota && !error) return <p className="muted">Chargement…</p>;

  return (
    <div>
      <span className="eyebrow">Nouveau test</span>
      <h1>Composer mon test</h1>

      {quota && (
        <p className="muted">
          Quota restant : <strong>{quota.unlimited ? "illimité" : `${quota.remaining} question(s)`}</strong>
        </p>
      )}
      {error && <p className="alert alert--error">{error}</p>}
      {quota && !quota.unlimited && quota.remaining === 0 && (
        <p className="alert alert--error">Votre quota est épuisé. Contactez l'administration pour le recharger.</p>
      )}

      <form onSubmit={handleStart}>
        <fieldset className="field">
          <legend>Matières <span className="muted">(aucune sélection = toutes)</span></legend>
          <Chips items={domains} selected={domainIds} onToggle={toggleDomain} />
        </fieldset>

        <fieldset className="field">
          <legend>Thématiques <span className="muted">(aucune sélection = toutes)</span></legend>
          {visibleThemes.length === 0 ? (
            <p className="muted">Aucune thématique disponible.</p>
          ) : (
            <Chips items={visibleThemes} selected={themeIds} onToggle={(id) => setThemeIds(toggle(themeIds, id))} />
          )}
        </fieldset>

        <fieldset className="field">
          <legend>Niveaux <span className="muted">(aucune sélection = tous)</span></legend>
          <Chips items={levels} selected={levelIds} onToggle={(id) => setLevelIds(toggle(levelIds, id))} />
        </fieldset>

        <p className="muted">
          {available === null ? "…" : `${available} question(s) validée(s) disponible(s) pour ces critères.`}
        </p>

        <label>
          Nombre de questions (max. {maxCount})
          <input
            type="number"
            min={1}
            max={Math.max(1, maxCount)}
            value={questionCount}
            onChange={(e) => setQuestionCount(e.target.value)}
            required
          />
        </label>
        {!countOk && maxCount > 0 && (
          <p className="alert alert--error">Choisissez entre 1 et {maxCount} questions.</p>
        )}

        <fieldset className="field">
          <legend>Temps limite</legend>
          <div className="chips">
            <button type="button" className="chip" aria-pressed={timeLimit === ""} onClick={() => setTimeLimit("")}>
              Sans limite
            </button>
            {TIME_PRESETS.map((m) => (
              <button
                key={m}
                type="button"
                className="chip"
                aria-pressed={String(timeLimit) === String(m)}
                onClick={() => setTimeLimit(m)}
              >
                {m} min
              </button>
            ))}
          </div>
          <label className="inline-input">
            Ou personnalisé (minutes)
            <input
              type="number"
              min={1}
              max={240}
              placeholder="ex. 25"
              value={timeLimit}
              onChange={(e) => setTimeLimit(e.target.value)}
            />
          </label>
        </fieldset>

        <button type="submit" disabled={loading || !countOk || maxCount === 0}>
          {loading ? "Préparation…" : "Démarrer le test"}
        </button>
      </form>
    </div>
  );
}
