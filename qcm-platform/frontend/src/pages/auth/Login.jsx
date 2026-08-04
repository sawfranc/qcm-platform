import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

const REDIRECTS = {
  admin: "/admin",
  directeur: "/directeur",
  enseignant: "/enseignant",
  eleve: "/",
};

export default function Login() {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const { login } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    try {
      const user = await login(identifier, password);
      navigate(REDIRECTS[user.role] || "/");
    } catch (err) {
      setError(err.response?.data?.error || "Échec de la connexion.");
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <h1>Connexion</h1>
      {error && <p className="alert alert--error">{error}</p>}
      <label>Email ou téléphone
        <input value={identifier} onChange={(e) => setIdentifier(e.target.value)} required />
      </label>
      <label>Mot de passe
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
      </label>
      <button type="submit">Se connecter</button>
    </form>
  );
}
