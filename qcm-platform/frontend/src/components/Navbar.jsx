import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Navbar() {
  const { user, logout } = useAuth();

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
            <span className="app-nav__user">{user.fullName} · {user.role}</span>
            <button type="button" onClick={logout}>Déconnexion</button>
          </>
        )}
      </div>
    </nav>
  );
}
