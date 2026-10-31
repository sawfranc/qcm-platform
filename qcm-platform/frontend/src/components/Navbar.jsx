import { NavLink, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { homeFor } from "../utils/roleHome";

const ROLE_LINKS = {
  admin: [
    { to: "/admin", label: "Accueil", end: true },
    { to: "/admin/domains", label: "Domaines" },
    { to: "/admin/teachers", label: "Comptes" },
    { to: "/admin/students", label: "Étudiants" },
  ],
  directeur: [
    { to: "/directeur", label: "Accueil", end: true },
    { to: "/directeur/enseignants", label: "Enseignants" },
    { to: "/directeur/validation", label: "Validation" },
  ],
  enseignant: [
    { to: "/enseignant", label: "Accueil", end: true },
    { to: "/enseignant/nouvelle-question", label: "Nouvelle question" },
    { to: "/enseignant/import", label: "Importer" },
  ],
  eleve: [
    { to: "/", label: "Tableau de bord", end: true },
    { to: "/nouveau-test", label: "Nouveau test" },
    { to: "/historique", label: "Historique" },
  ],
};

export default function Navbar() {
  const { user, logout } = useAuth();
  const links = (user && ROLE_LINKS[user.role]) || [];

  return (
    <nav className="app-nav">
      <Link to={user ? homeFor(user.role) : "/login"} className="app-nav__brand">Plateforme QCM</Link>
      <div className="app-nav__links">
        {!user && (
          <>
            <Link to="/login">Connexion</Link>
            <Link to="/register">Inscription</Link>
          </>
        )}
        {user && (
          <>
            {links.map((l) => (
              <NavLink key={l.to} to={l.to} end={l.end} className={({ isActive }) => (isActive ? "is-active" : undefined)}>
                {l.label}
              </NavLink>
            ))}
            <NavLink to="/mot-de-passe" className={({ isActive }) => (isActive ? "is-active" : undefined)}>Mot de passe</NavLink>
            <span className="app-nav__user">{user.fullName} · {user.role}</span>
            <button type="button" onClick={logout}>Déconnexion</button>
          </>
        )}
      </div>
    </nav>
  );
}
