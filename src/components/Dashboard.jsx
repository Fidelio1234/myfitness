import { useState } from "react";
import { signOut } from "firebase/auth";
import { auth } from "../firebase";
import { useNavigate } from "react-router-dom";
import { useTheme } from "../App";
import GestioneClienti from "./GestioneClienti";
import GestioneSchede from "./GestioneSchede";
import ProgressiPT from "./ProgressiPT";
import GestioneEsercizi from "./GestioneEsercizi";

export default function Dashboard() {
  const navigate = useNavigate();
  const [sezione, setSezione] = useState("home");
  const { tema, setTema, t } = useTheme();

  async function handleLogout() {
    await signOut(auth);
    navigate("/");
  }

  const styles = getStyles(t);

  return (
    <div style={styles.container}>
      <div style={styles.sidebar}>
        <h2 style={styles.logo}>MyFitness</h2>
        <nav style={styles.nav}>
          <button style={{ ...styles.navBtn, ...(sezione === "clienti" ? styles.navBtnActive : {}) }} onClick={() => setSezione("clienti")}>
            👤 Clienti
          </button>
          <button style={{ ...styles.navBtn, ...(sezione === "esercizi" ? styles.navBtnActive : {}) }} onClick={() => setSezione("esercizi")}>
            💪 Esercizi
          </button>
          <button style={{ ...styles.navBtn, ...(sezione === "schede" ? styles.navBtnActive : {}) }} onClick={() => setSezione("schede")}>
            📋 Schede
          </button>
          <button style={{ ...styles.navBtn, ...(sezione === "progressi" ? styles.navBtnActive : {}) }} onClick={() => setSezione("progressi")}>
            📈 Progressi
          </button>
        </nav>
        <button style={styles.temaBtn} onClick={() => setTema(tema === "scuro" ? "chiaro" : "scuro")}>
          {tema === "scuro" ? "☀️ Tema chiaro" : "🌙 Tema scuro"}
        </button>
        <button style={styles.logoutBtn} onClick={handleLogout}>Esci</button>
      </div>
      <div style={styles.main}>
        {sezione === "home" && (
          <>
            <h1 style={styles.welcome}>Benvenuto, PT 👋</h1>
            <p style={styles.sub}>Seleziona una sezione dalla barra laterale per iniziare.</p>
          </>
        )}
        {sezione === "clienti" && <GestioneClienti />}
        {sezione === "esercizi" && <GestioneEsercizi />}
        {sezione === "schede" && <GestioneSchede />}
        {sezione === "progressi" && <ProgressiPT />}
      </div>
    </div>
  );
}

function getStyles(t) {
  return {
    container: { display: "flex", minHeight: "100vh", background: t.bg },
    sidebar: { width: "220px", background: t.surface, display: "flex", flexDirection: "column", padding: "2rem 1rem", gap: "0.5rem", borderRight: `1px solid ${t.bordo}` },
    logo: { color: t.testo, fontSize: "1.4rem", fontWeight: "800", marginBottom: "2rem", textAlign: "center" },
    nav: { display: "flex", flexDirection: "column", gap: "0.5rem", flex: 1 },
    navBtn: { padding: "0.8rem 1rem", background: t.surface2, color: t.testoSub, border: `1px solid ${t.bordo}`, borderRadius: "8px", cursor: "pointer", textAlign: "left", fontSize: "0.95rem" },
    navBtnActive: { background: t.accent, color: "#fff", border: `1px solid ${t.accent}` },
    temaBtn: { padding: "0.7rem", background: "transparent", color: t.testoSub, border: `1px solid ${t.bordo}`, borderRadius: "8px", cursor: "pointer", fontSize: "0.85rem" },
    logoutBtn: { padding: "0.8rem", background: "transparent", color: t.accent, border: `1px solid ${t.accent}`, borderRadius: "8px", cursor: "pointer", fontWeight: "700" },
    main: { flex: 1, padding: "3rem", display: "flex", flexDirection: "column" },
    welcome: { color: t.testo, fontSize: "2rem", fontWeight: "800", textAlign: "center" },
    sub: { color: t.testoSub, marginTop: "0.5rem", textAlign: "center" }
  };
}
