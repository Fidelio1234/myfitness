import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { createContext, useContext, useState } from "react";
import Login from "./pages/Login";
import Dashboard from "./components/Dashboard";
import AreaCliente from "./pages/AreaCliente";

export const ThemeContext = createContext();
export function useTheme() { return useContext(ThemeContext); }

export const temi = {
  scuro: {
    bg: "#0f0f0f", surface: "#1a1a1a", surface2: "#111",
    testo: "#ffffff", testoSub: "#aaa", bordo: "#333", accent: "#e63946"
  },
  chiaro: {
    bg: "#f4f4f4", surface: "#ffffff", surface2: "#f0f0f0",
    testo: "#111111", testoSub: "#666", bordo: "#ddd", accent: "#e63946"
  }
};

const PT_EMAIL = "dmivanlecce@gmail.com";

function PrivateRoute({ children }) {
  const { currentUser } = useAuth();
  return currentUser ? children : <Navigate to="/" />;
}

function RootRedirect() {
  const { currentUser } = useAuth();
  if (!currentUser) return <Login />;
  if (currentUser.email === PT_EMAIL) return <Navigate to="/dashboard" />;
  return <Navigate to="/cliente" />;
}

export default function App() {
  const [tema, setTema] = useState("scuro");
  return (
    <ThemeContext.Provider value={{ tema, setTema, t: temi[tema] }}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<RootRedirect />} />
            <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
            <Route path="/cliente" element={<PrivateRoute><AreaCliente /></PrivateRoute>} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeContext.Provider>
  );
}