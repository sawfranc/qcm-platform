import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const ROLE_LINKS = {
  eleve: [
    { to: "/", label: "Tableau de bord" },
    { to: "/nouveau-test", label: "Nouveau test" },
    { to: "/historique", label: "Historique" },
  ],
};

export default function Navbar() {
  const { user, logout } = useAuth();
  const links = (user && ROLE_LINKS[user.role]) || [];

  return (
    <nav className="app-nav">
      <Link to="/" className="app-nav__brand">Plateforme QCM</Link>
      <div className="app-nav__links">
        {!user && (
          <>
            <Link to="/login">Connexion</Link>
            <Link to="/register">Inscription</Link>
          </>
        )}
        {user && (
          <>
            {links.map((l) => <Link key={l.to} to={l.to}>{l.label}</Link>)}
            <span className="app-nav__user">{user.fullName} · {user.role}</span>
            <button type="button" onClick={logout}>Déconnexion</button>
          </>
        )}
      </div>
    </nav>
  );
}
