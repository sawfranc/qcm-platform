import { Routes, Route } from "react-router-dom";
import ProtectedRoute from "./ProtectedRoute";

import Login from "../pages/auth/Login";
import Register from "../pages/auth/Register";
import ChangePassword from "../pages/auth/ChangePassword";

import AdminDashboard from "../pages/admin/AdminDashboard";
import ManageDomains from "../pages/admin/ManageDomains";
import ManageTeachers from "../pages/admin/ManageTeachers";
import ManageStudents from "../pages/admin/ManageStudents";

import DirectorDashboard from "../pages/directeur/DirectorDashboard";
import DirectorManageTeachers from "../pages/directeur/ManageTeachers";
import ValidateQuestions from "../pages/directeur/ValidateQuestions";

import TeacherDashboard from "../pages/enseignant/TeacherDashboard";
import CreateQuestion from "../pages/enseignant/CreateQuestion";
import ImportQuestions from "../pages/enseignant/ImportQuestions";

import StudentDashboard from "../pages/eleve/StudentDashboard";
import QuizSession from "../pages/eleve/QuizSession";
import Results from "../pages/eleve/Results";
import NewTest from "../pages/eleve/NewTest";
import History from "../pages/eleve/History";

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      <Route path="/mot-de-passe" element={<ProtectedRoute><ChangePassword /></ProtectedRoute>} />

      {/* Administrateur central */}
      <Route path="/admin" element={<ProtectedRoute roles={["admin"]}><AdminDashboard /></ProtectedRoute>} />
      <Route path="/admin/domains" element={<ProtectedRoute roles={["admin"]}><ManageDomains /></ProtectedRoute>} />
      <Route path="/admin/teachers" element={<ProtectedRoute roles={["admin"]}><ManageTeachers /></ProtectedRoute>} />
      <Route path="/admin/students" element={<ProtectedRoute roles={["admin"]}><ManageStudents /></ProtectedRoute>} />

      {/* Directeur de domaine */}
      <Route path="/directeur" element={<ProtectedRoute roles={["directeur"]}><DirectorDashboard /></ProtectedRoute>} />
      <Route path="/directeur/enseignants" element={<ProtectedRoute roles={["directeur"]}><DirectorManageTeachers /></ProtectedRoute>} />
      <Route path="/directeur/validation" element={<ProtectedRoute roles={["directeur"]}><ValidateQuestions /></ProtectedRoute>} />

      {/* Enseignant */}
      <Route path="/enseignant" element={<ProtectedRoute roles={["enseignant"]}><TeacherDashboard /></ProtectedRoute>} />
      <Route path="/enseignant/nouvelle-question" element={<ProtectedRoute roles={["enseignant"]}><CreateQuestion /></ProtectedRoute>} />

      <Route path="/enseignant/import" element={<ProtectedRoute roles={["enseignant"]}><ImportQuestions /></ProtectedRoute>} />

      {/* Élève / étudiant */}
      <Route path="/" element={<ProtectedRoute roles={["eleve"]}><StudentDashboard /></ProtectedRoute>} />
      <Route path="/nouveau-test" element={<ProtectedRoute roles={["eleve"]}><NewTest /></ProtectedRoute>} />
      <Route path="/historique" element={<ProtectedRoute roles={["eleve"]}><History /></ProtectedRoute>} />
      <Route path="/quiz/:sessionId" element={<ProtectedRoute roles={["eleve"]}><QuizSession /></ProtectedRoute>} />
      <Route path="/quiz/:sessionId/resultats" element={<ProtectedRoute roles={["eleve"]}><Results /></ProtectedRoute>} />
    </Routes>
  );
}
