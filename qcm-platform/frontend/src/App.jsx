import { BrowserRouter } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import AppRoutes from "./routes/AppRoutes";
import Navbar from "./components/Navbar";

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Navbar />
        <main>
          <AppRoutes />
        </main>
      </BrowserRouter>
    </AuthProvider>
  );
}
