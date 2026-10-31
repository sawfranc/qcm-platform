import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { homeFor } from "../utils/roleHome";

/**
 * Protège une route selon l'authentification et, optionnellement, le rôle requis.
 * Un utilisateur sans le bon rôle est renvoyé vers l'accueil de SON rôle.
 * Usage : <ProtectedRoute roles={["admin","directeur"]}><Page/></ProtectedRoute>
 */
export default function ProtectedRoute({ children, roles }) {
  const { user } = useAuth();

  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to={homeFor(user.role)} replace />;

  return children;
}
