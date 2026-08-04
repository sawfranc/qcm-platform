import { useState } from "react";
import { useNavigate } from "react-router-dom";
import * as authApi from "../../api/auth";

// Auto-inscription réservée aux élèves/étudiants (les autres comptes sont créés par admin/directeur)
export default function Register() {
  const [form, setForm] = useState({ fullName: "", email: "", phone: "", password: "" });
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  function update(field) {
    return (e) => setForm({ ...form, [field]: e.target.value });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    try {
      await authApi.register(form);
      navigate("/login");
    } catch (err) {
      setError(err.response?.data?.error || "Échec de l'inscription.");
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <h1>Créer un compte élève / étudiant</h1>
      {error && <p className="alert alert--error">{error}</p>}
      <label>Nom complet
        <input value={form.fullName} onChange={update("fullName")} required />
      </label>
      <label>Email
        <input type="email" value={form.email} onChange={update("email")} />
      </label>
      <label>Téléphone
        <input value={form.phone} onChange={update("phone")} />
      </label>
      <label>Mot de passe
        <input type="password" value={form.password} onChange={update("password")} required minLength={8} />
      </label>
      <button type="submit">S'inscrire</button>
    </form>
  );
}
