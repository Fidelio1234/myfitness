import { useState, useEffect } from "react";
import { collection, addDoc, getDocs, deleteDoc, updateDoc, doc } from "firebase/firestore";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { db, authSecondary } from "../firebase";

function generaPassword(length = 10) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  return Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

function calcolaEta(dataNascita) {
    if (!dataNascita) return "";
    const oggi = new Date();
    const nascita = new Date(dataNascita + "T00:00:00");
    let eta = oggi.getFullYear() - nascita.getFullYear();
    const m = oggi.getMonth() - nascita.getMonth();
    if (m < 0 || (m === 0 && oggi.getDate() < nascita.getDate())) eta--;
    return eta;
  }

const initialForm = {
  nome: "", cognome: "", dataNascita: "", peso: "", altezza: "",
  problemi: "", obiettivo: ""
};

export default function GestioneClienti() {
  const [clienti, setClienti] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [passwordGenerata, setPasswordGenerata] = useState("");
  const [confermaPassword, setConfermaPassword] = useState("");
  const [errorePassword, setErrorePassword] = useState("");
  const [mostraForm, setMostraForm] = useState(false);
  const [clienteInModifica, setClienteInModifica] = useState(null);
  const [clienteDaEliminare, setClienteDaEliminare] = useState(null);
  const [loading, setLoading] = useState(false);
  const [successo, setSuccesso] = useState("");

  useEffect(() => {
    fetchClienti();
    setPasswordGenerata(generaPassword());
  }, []);

  async function fetchClienti() {
    const snap = await getDocs(collection(db, "clienti"));
    setClienti(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  }

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  function apriModifica(cliente) {
    setClienteInModifica(cliente);
    setForm({
      nome: cliente.nome,
      cognome: cliente.cognome,
      dataNascita: cliente.dataNascita,
      peso: cliente.peso,
      altezza: cliente.altezza,
      problemi: cliente.problemi || "",
      obiettivo: cliente.obiettivo
    });
    setMostraForm(true);
    setSuccesso("");
    setErrorePassword("");
  }

  function annulla() {
    setMostraForm(false);
    setClienteInModifica(null);
    setForm(initialForm);
    setConfermaPassword("");
    setErrorePassword("");
    setPasswordGenerata(generaPassword());
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setErrorePassword("");

    // Modalità modifica
    if (clienteInModifica) {
      setLoading(true);
      try {
        await updateDoc(doc(db, "clienti", clienteInModifica.id), {
          nome: form.nome,
          cognome: form.cognome,
          dataNascita: form.dataNascita,
          eta: calcolaEta(form.dataNascita),
          peso: parseFloat(form.peso),
          altezza: parseFloat(form.altezza),
          problemi: form.problemi,
          obiettivo: form.obiettivo
        });
        setSuccesso("Cliente aggiornato con successo!");
        annulla();
        fetchClienti();
      } catch (err) {
        setErrorePassword("Errore: " + err.message);
      }
      setLoading(false);
      return;
    }

    // Modalità creazione
    if (passwordGenerata !== confermaPassword) {
      setErrorePassword("Le password non coincidono.");
      return;
    }

    setLoading(true);
    try {
      const nomeClean = form.nome.toLowerCase().replace(/\s+/g, "");
      const cognomeClean = form.cognome.toLowerCase().replace(/\s+/g, "");
      const timestamp = Date.now();
const emailFittizia = `${nomeClean}.${cognomeClean}.${timestamp}@myfitness-app.com`;

      await createUserWithEmailAndPassword(authSecondary, emailFittizia, passwordGenerata);

      await addDoc(collection(db, "clienti"), {
        nome: form.nome,
        cognome: form.cognome,
        dataNascita: form.dataNascita,
        eta: calcolaEta(form.dataNascita),
        peso: parseFloat(form.peso),
        altezza: parseFloat(form.altezza),
        problemi: form.problemi,
        obiettivo: form.obiettivo,
        username: `${nomeClean}.${cognomeClean}`,
        email: emailFittizia,
        password: passwordGenerata,
        createdAt: new Date()
      });

      setSuccesso(`Cliente creato! Username: ${nomeClean}.${cognomeClean} — Password: ${passwordGenerata}`);
      annulla();
      fetchClienti();
    } catch (err) {
      setErrorePassword("Errore: " + err.message);
    }
    setLoading(false);
  }

  async function eliminaCliente() {
    if (!clienteDaEliminare) return;
    setLoading(true);
    try {
      await deleteDoc(doc(db, "clienti", clienteDaEliminare.id));
      setClienti(prev => prev.filter(c => c.id !== clienteDaEliminare.id));
      setSuccesso("Cliente eliminato.");
      setClienteDaEliminare(null);
    } catch (err) {
      setErrorePassword("Errore eliminazione: " + err.message);
    }
    setLoading(false);
  }

  return (
    <div>
      <div style={styles.header}>
        <h2 style={styles.titolo}>👤 Clienti</h2>
        <button style={styles.btnNuovo} onClick={() => { mostraForm && !clienteInModifica ? annulla() : (() => { setMostraForm(true); setClienteInModifica(null); setForm(initialForm); setPasswordGenerata(generaPassword()); setSuccesso(""); })() }}>
          {mostraForm && !clienteInModifica ? "Annulla" : "+ Nuovo Cliente"}
        </button>
      </div>

      {successo && (
        <div style={styles.successBox}>
          <p>✅ {successo}</p>
          {successo.includes("Password") && (
            <p style={{ fontSize: "0.8rem", color: "#aaa" }}>Comunica queste credenziali al cliente. Non saranno più visibili.</p>
          )}
        </div>
      )}

      {/* Modale conferma eliminazione */}
      {clienteDaEliminare && (
        <div style={styles.overlay}>
          <div style={styles.modale}>
            <p style={styles.modaleтитolo}>⚠️ Elimina cliente</p>
            <p style={styles.modaleTesto}>
              Sei sicuro di voler eliminare <strong>{clienteDaEliminare.nome} {clienteDaEliminare.cognome}</strong>? L'operazione è irreversibile.
            </p>
            <div style={styles.modaleBtn}>
              <button style={styles.btnAnnullaModale} onClick={() => setClienteDaEliminare(null)}>Annulla</button>
              <button style={styles.btnConfermaElimina} onClick={eliminaCliente} disabled={loading}>
                {loading ? "Eliminazione..." : "Elimina"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Form creazione / modifica */}
      {mostraForm && (
        <form onSubmit={handleSubmit} style={styles.form}>
          <p style={styles.formTitolo}>{clienteInModifica ? "✏️ Modifica cliente" : "➕ Nuovo cliente"}</p>

          <div style={styles.row}>
            <div style={styles.field}>
              <label style={styles.label}>Nome *</label>
              <input style={styles.input} name="nome" value={form.nome} onChange={handleChange} required />
            </div>
            <div style={styles.field}>
              <label style={styles.label}>Cognome *</label>
              <input style={styles.input} name="cognome" value={form.cognome} onChange={handleChange} required />
            </div>
          </div>

          <div style={styles.row}>
            <div style={styles.field}>
              <label style={styles.label}>Data di nascita *</label>
              <input style={styles.input} type="date" name="dataNascita" value={form.dataNascita} onChange={handleChange} required />
              {form.dataNascita && <span style={styles.eta}>Età: {calcolaEta(form.dataNascita)} anni</span>}
            </div>
            <div style={styles.field}>
              <label style={styles.label}>Peso (kg) *</label>
              <input style={styles.input} type="number" name="peso" value={form.peso} onChange={handleChange} required />
            </div>
            <div style={styles.field}>
              <label style={styles.label}>Altezza (cm) *</label>
              <input style={styles.input} type="number" name="altezza" value={form.altezza} onChange={handleChange} required />
            </div>
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Problemi fisici</label>
            <textarea style={styles.textarea} name="problemi" value={form.problemi} onChange={handleChange} placeholder="Es. mal di schiena, ginocchio operato..." />
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Obiettivo allenamento *</label>
            <select style={styles.input} name="obiettivo" value={form.obiettivo} onChange={handleChange} required>
              <option value="">Seleziona...</option>
              <option value="Dimagrimento">Dimagrimento</option>
              <option value="Massa muscolare">Massa muscolare</option>
              <option value="Tonificazione">Tonificazione</option>
              <option value="Resistenza">Resistenza</option>
              <option value="Riabilitazione">Riabilitazione</option>
              <option value="Mantenimento">Mantenimento</option>
            </select>
          </div>

          {/* Credenziali solo per nuovo cliente */}
          {!clienteInModifica && (
            <>
              <div style={styles.separator} />
              <p style={styles.labelSezione}>🔑 Credenziali accesso cliente</p>
              <div style={styles.row}>
                <div style={styles.field}>
                  <label style={styles.label}>Username (generato)</label>
                  <input style={{ ...styles.input, color: "#aaa" }}
                    value={form.nome && form.cognome ? `${form.nome.toLowerCase().replace(/\s+/g, "")}.${form.cognome.toLowerCase().replace(/\s+/g, "")}` : "Inserisci nome e cognome"}
                    readOnly />
                </div>
              </div>
              <div style={styles.row}>
                <div style={styles.field}>
                  <label style={styles.label}>Password generata</label>
                  <input style={{ ...styles.input, color: "#e63946", fontWeight: "700", letterSpacing: "2px" }}
                    value={passwordGenerata} readOnly />
                </div>
                <div style={styles.field}>
                  <label style={styles.label}>Conferma password *</label>
                  <input style={styles.input} type="text" value={confermaPassword}
                    onChange={e => setConfermaPassword(e.target.value)}
                    placeholder="Riscrivi la password" required />
                </div>
              </div>
            </>
          )}

          {errorePassword && <p style={styles.errore}>{errorePassword}</p>}

          <div style={styles.row}>
            <button style={styles.btnAnnullaForm} type="button" onClick={annulla}>Annulla</button>
            <button style={styles.btnSubmit} type="submit" disabled={loading}>
              {loading ? "Salvataggio..." : clienteInModifica ? "💾 Salva modifiche" : "Crea Cliente"}
            </button>
          </div>
        </form>
      )}

      {/* Lista clienti */}
      <div style={styles.listaClienti}>
        {clienti.length === 0 && <p style={styles.vuoto}>Nessun cliente ancora. Creane uno!</p>}
        {clienti.map(c => (
          <div key={c.id} style={styles.card}>
            <div style={{ flex: 1 }}>
              <p style={styles.cardNome}>{c.nome} {c.cognome}</p>
              <p style={styles.cardInfo}>{c.eta} anni · {c.peso} kg · {c.altezza} cm</p>
              <p style={styles.cardInfo}>🎯 {c.obiettivo}</p>
              {c.problemi && <p style={styles.cardProblemi}>⚠️ {c.problemi}</p>}
              <p style={styles.cardUsername}>@{c.username}</p>
              <p style={styles.cardPassword}>🔑 {c.password || "N/D"}</p>
            </div>
            <div style={styles.cardAzioni}>
              <button style={styles.btnModifica} onClick={() => apriModifica(c)}>✏️ Modifica</button>
              <button style={styles.btnElimina} onClick={() => setClienteDaEliminare(c)}>🗑️ Elimina</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const styles = {
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" },
  titolo: { color: "#fff", fontSize: "1.6rem", fontWeight: "800", margin: 0 },
  btnNuovo: { padding: "0.7rem 1.4rem", background: "#e63946", color: "#fff", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: "700" },
  form: { background: "#1a1a1a", padding: "2rem", borderRadius: "12px", marginBottom: "2rem", display: "flex", flexDirection: "column", gap: "1rem" },
  formTitolo: { color: "#fff", fontWeight: "800", fontSize: "1.1rem", margin: 0 },
  row: { display: "flex", gap: "1rem", flexWrap: "wrap" },
  field: { display: "flex", flexDirection: "column", gap: "0.3rem", flex: 1, minWidth: "180px" },
  label: { color: "#aaa", fontSize: "0.85rem" },
  labelSezione: { color: "#e63946", fontWeight: "700", fontSize: "1rem", margin: 0 },
  input: { padding: "0.8rem", borderRadius: "8px", border: "1px solid #333", background: "#111", color: "#fff", fontSize: "0.95rem" },
  textarea: { padding: "0.8rem", borderRadius: "8px", border: "1px solid #333", background: "#111", color: "#fff", fontSize: "0.95rem", minHeight: "80px", resize: "vertical" },
  eta: { color: "#e63946", fontSize: "0.85rem", fontWeight: "700" },
  separator: { borderTop: "1px solid #333", margin: "0.5rem 0" },
  btnSubmit: { flex: 1, padding: "0.9rem", background: "#e63946", color: "#fff", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: "700", fontSize: "1rem" },
  btnAnnullaForm: { flex: 1, padding: "0.9rem", background: "transparent", color: "#aaa", border: "1px solid #333", borderRadius: "8px", cursor: "pointer", fontWeight: "700", fontSize: "1rem" },
  errore: { color: "#e63946", fontSize: "0.85rem" },
  successBox: { background: "#1a2e1a", border: "1px solid #2d5a2d", borderRadius: "10px", padding: "1rem 1.5rem", marginBottom: "1.5rem", color: "#4caf50" },
  listaClienti: { display: "flex", flexDirection: "column", gap: "1rem" },
  card: { background: "#1a1a1a", borderRadius: "10px", padding: "1.2rem 1.5rem", display: "flex", justifyContent: "space-between", alignItems: "center", border: "1px solid #222", gap: "1rem" },
  cardNome: { color: "#fff", fontWeight: "700", fontSize: "1.1rem", margin: "0 0 0.3rem 0" },
  cardInfo: { color: "#aaa", fontSize: "0.85rem", margin: "0.1rem 0" },
  cardProblemi: { color: "#f4a261", fontSize: "0.85rem", margin: "0.3rem 0 0 0" },
  cardUsername: { color: "#e63946", fontSize: "0.85rem", fontWeight: "700", marginTop: "0.3rem" },
  cardAzioni: { display: "flex", flexDirection: "column", gap: "0.5rem", flexShrink: 0 },
  btnModifica: { padding: "0.5rem 1rem", background: "transparent", color: "#4a90d9", border: "1px solid #4a90d9", borderRadius: "8px", cursor: "pointer", fontWeight: "700", fontSize: "0.85rem" },
  btnElimina: { padding: "0.5rem 1rem", background: "transparent", color: "#e63946", border: "1px solid #e63946", borderRadius: "8px", cursor: "pointer", fontWeight: "700", fontSize: "0.85rem" },
  vuoto: { color: "#555", textAlign: "center", marginTop: "2rem" },
  overlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 },
  modale: { background: "#1a1a1a", borderRadius: "16px", padding: "2rem", maxWidth: "400px", width: "90%", border: "1px solid #333" },
  modaleтитolo: { color: "#fff", fontWeight: "800", fontSize: "1.2rem", marginBottom: "1rem" },
  modaleTesto: { color: "#aaa", fontSize: "0.95rem", marginBottom: "1.5rem", lineHeight: "1.5" },
  modaleBtn: { display: "flex", gap: "1rem" },
  btnAnnullaModale: { flex: 1, padding: "0.8rem", background: "transparent", color: "#aaa", border: "1px solid #333", borderRadius: "8px", cursor: "pointer", fontWeight: "700" },
  btnConfermaElimina: { flex: 1, padding: "0.8rem", background: "#e63946", color: "#fff", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: "700" },
  cardPassword: { color: "#f4a261", fontSize: "0.82rem", fontWeight: "600", marginTop: "0.2rem", letterSpacing: "1px" },
};