import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

/**
 * Protège une route selon l'authentification et, optionnellement, le rôle requis.
 * Usage : <ProtectedRoute roles={["admin","directeur"]}><Page/></ProtectedRoute>
 */
export default function ProtectedRoute({ children, roles }) {
  const { user } = useAuth();

  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;

  return children;
}
