import { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../firebase";
import { useNavigate } from "react-router-dom";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../firebase";


export default function Login() {
  const [tab, setTab] = useState("pt");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  async function handleLoginPT(e) {
    e.preventDefault();
    setError("");
    try {
      await signInWithEmailAndPassword(auth, email, password);
      navigate("/dashboard");
    } catch {
      setError("Credenziali non valide. Riprova.");
    }
  }

  async function handleLoginCliente(e) {
    e.preventDefault();
    setError("");
    try {
      const usernameClean = username.toLowerCase().trim();
      const snap = await getDocs(
        query(collection(db, "clienti"), where("username", "==", usernameClean))
      );
      if (snap.empty) {
        setError("Username non trovato.");
        return;
      }
      const clienteData = snap.docs[0].data();
      await signInWithEmailAndPassword(auth, clienteData.email, password);
      navigate("/cliente");
    } catch {
      setError("Username o password errati. Riprova.");
    }
  }

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.title}>MyFitness</h1>

        <div style={styles.tabs}>
          <button style={{ ...styles.tab, ...(tab === "pt" ? styles.tabActive : {}) }} onClick={() => { setTab("pt"); setError(""); }}>
            🏋️ Personal Trainer
          </button>
          <button style={{ ...styles.tab, ...(tab === "cliente" ? styles.tabActive : {}) }} onClick={() => { setTab("cliente"); setError(""); }}>
            👤 Cliente
          </button>
        </div>

        {tab === "pt" ? (
          <form onSubmit={handleLoginPT} style={styles.form}>
            <input style={styles.input} type="email" placeholder="Email" value={email}
              onChange={e => setEmail(e.target.value)} required />
            <input style={styles.input} type="password" placeholder="Password" value={password}
              onChange={e => setPassword(e.target.value)} required />
            {error && <p style={styles.error}>{error}</p>}
            <button style={styles.button} type="submit">Accedi come PT</button>
          </form>
        ) : (
          <form onSubmit={handleLoginCliente} style={styles.form}>
            <input style={styles.input} type="text" placeholder="Username (es. mario.rossi)" value={username}
              onChange={e => setUsername(e.target.value)} required />
            <input style={styles.input} type="password" placeholder="Password" value={password}
              onChange={e => setPassword(e.target.value)} required />
            {error && <p style={styles.error}>{error}</p>}
            <button style={styles.button} type="submit">Accedi</button>
          </form>
        )}
      </div>
    </div>
  );
}

const styles = {
  container: { minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#0f0f0f", padding: "1rem" },
  card: { background: "#1a1a1a", padding: "2.5rem", borderRadius: "16px", width: "100%", maxWidth: "400px", boxShadow: "0 0 40px rgba(0,0,0,0.5)" },
  title: { color: "#fff", fontSize: "2rem", fontWeight: "800", margin: "0 0 1.5rem 0", textAlign: "center" },
  tabs: { display: "flex", gap: "0.5rem", marginBottom: "1.5rem" },
  tab: { flex: 1, padding: "0.7rem", borderRadius: "8px", border: "1px solid #333", background: "#111", color: "#aaa", cursor: "pointer", fontSize: "0.85rem", fontWeight: "600" },
  tabActive: { background: "#e63946", color: "#fff", border: "1px solid #e63946" },
  form: { display: "flex", flexDirection: "column", gap: "1rem" },
  input: { padding: "0.9rem 1rem", borderRadius: "8px", border: "1px solid #333", background: "#111", color: "#fff", fontSize: "1rem" },
  button: { padding: "0.9rem", borderRadius: "8px", background: "#e63946", color: "#fff", fontWeight: "700", fontSize: "1rem", border: "none", cursor: "pointer" },
  error: { color: "#e63946", fontSize: "0.85rem", textAlign: "center" }
};