import { useState } from "react";
import { changePassword } from "../../api/auth";

export default function ChangePassword() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState(null);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setDone(false);
    if (newPassword !== confirm) {
      setError("La confirmation ne correspond pas au nouveau mot de passe.");
      return;
    }
    setBusy(true);
    try {
      await changePassword(currentPassword, newPassword);
      setDone(true);
      setCurrentPassword("");
      setNewPassword("");
      setConfirm("");
    } catch (err) {
      setError(err.response?.data?.error || "Impossible de modifier le mot de passe.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <h1>Changer mon mot de passe</h1>
      {error && <p className="alert alert--error">{error}</p>}
      {done && <p className="alert alert--success">Mot de passe modifié. Utilisez-le à votre prochaine connexion.</p>}
      <label>Mot de passe actuel
        <input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} required autoComplete="current-password" />
      </label>
      <label>Nouveau mot de passe (8 caractères minimum)
        <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required minLength={8} autoComplete="new-password" />
      </label>
      <label>Confirmer le nouveau mot de passe
        <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required minLength={8} autoComplete="new-password" />
      </label>
      <button type="submit" disabled={busy}>{busy ? "Enregistrement…" : "Enregistrer"}</button>
    </form>
  );
}
