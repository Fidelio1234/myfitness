import { useState, useEffect } from "react";
import { collection, getDocs, addDoc, query, where } from "firebase/firestore";
import { signOut } from "firebase/auth";
import { auth, db } from "../firebase";
import { useNavigate } from "react-router-dom";
import StoricoCliente from "./StoricoCliente";

const GIORNI = ["Lunedì", "Martedì", "Mercoledì", "Giovedì", "Venerdì", "Sabato", "Domenica"];

export default function AreaCliente() {
  const [cliente, setCliente] = useState(null);
  const [scheda, setScheda] = useState(null);
  const [giornoSelezionato, setGiornoSelezionato] = useState(null);
  const [completati, setCompletati] = useState({});
  const [logEsercizi, setLogEsercizi] = useState({});
  const [pesoCorporeo, setPesoCorporeo] = useState("");
  const [loading, setLoading] = useState(true);
  const [salvato, setSalvato] = useState(false);
  const [tab, setTab] = useState("oggi");
  const navigate = useNavigate();

  useEffect(() => {
    init();
  }, []);

  async function init() {
    const email = auth.currentUser?.email;
    if (!email) return;

    const snapClienti = await getDocs(query(collection(db, "clienti"), where("email", "==", email)));
    if (snapClienti.empty) { setLoading(false); return; }
    const clienteData = { id: snapClienti.docs[0].id, ...snapClienti.docs[0].data() };
    setCliente(clienteData);

    const snapSchede = await getDocs(query(collection(db, "schede"), where("clienteId", "==", clienteData.id)));
    if (!snapSchede.empty) {
      setScheda({ id: snapSchede.docs[0].id, ...snapSchede.docs[0].data() });
    }

    const oggi = new Date().getDay();
    const mapGiorno = [6, 0, 1, 2, 3, 4, 5];
    setGiornoSelezionato(GIORNI[mapGiorno[oggi]]);

    setLoading(false);
  }

  function toggleCompletato(esIndex) {
    setCompletati(prev => ({ ...prev, [esIndex]: !prev[esIndex] }));
  }

  function aggiornaLog(esIndex, campo, valore) {
    setLogEsercizi(prev => ({
      ...prev,
      [esIndex]: { ...(prev[esIndex] || {}), [campo]: valore }
    }));
  }

  async function salvaAllenamento() {
    if (!cliente || !scheda || !giornoSelezionato) return;
    const esercizi = scheda.scheda[giornoSelezionato] || [];

    await addDoc(collection(db, "log_allenamenti"), {
      clienteId: cliente.id,
      schedaId: scheda.id,
      giorno: giornoSelezionato,
      data: new Date(),
      pesoCorporeo: pesoCorporeo ? parseFloat(pesoCorporeo) : null,
      esercizi: esercizi.map((ex, i) => ({
        nome: ex.nome,
        completato: completati[i] || false,
        pesoUsato: logEsercizi[i]?.peso || null,
        ripetizioniEseguite: logEsercizi[i]?.rip || null,
        note: logEsercizi[i]?.note || ""
      }))
    });

    setSalvato(true);
    setCompletati({});
    setLogEsercizi({});
    setPesoCorporeo("");
    setTimeout(() => setSalvato(false), 3000);
  }

  async function handleLogout() {
    await signOut(auth);
    navigate("/");
  }

  if (loading) return <div style={styles.loading}>Caricamento...</div>;

  const eserciziOggi = (giornoSelezionato && scheda?.scheda?.[giornoSelezionato]) || [];
  const tuttiCompletati = eserciziOggi.length > 0 && eserciziOggi.every((_, i) => completati[i]);

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div>
          <p style={styles.benvenuto}>Ciao, {cliente?.nome} 👋</p>
          <p style={styles.obiettivo}>🎯 {cliente?.obiettivo}</p>
        </div>
        <button style={styles.logoutBtn} onClick={handleLogout}>Esci</button>
      </div>

      {/* Nessuna scheda */}
      {!scheda && (
        <div style={styles.noScheda}>
          <p>⏳ Il tuo PT non ha ancora creato una scheda per te.</p>
        </div>
      )}

      {scheda && (
        <>
          {/* Tab navigazione */}
          <div style={styles.tabBar}>
            <button style={{ ...styles.tabBtn, ...(tab === "oggi" ? styles.tabBtnActive : {}) }} onClick={() => setTab("oggi")}>
              🏋️ Oggi
            </button>
            <button style={{ ...styles.tabBtn, ...(tab === "storico" ? styles.tabBtnActive : {}) }} onClick={() => setTab("storico")}>
              📈 Progressi
            </button>
          </div>

          {/* TAB OGGI */}
          {tab === "oggi" && (
            <>
              {/* Selezione giorno */}
              <div style={styles.sezione}>
                <p style={styles.label}>Seleziona giorno</p>
                <div style={styles.giorni}>
                  {GIORNI.filter(g => scheda.scheda[g]?.length > 0).map(g => (
                    <button key={g}
                      style={{ ...styles.giornoBtn, ...(giornoSelezionato === g ? styles.giornoBtnActive : {}) }}
                      onClick={() => { setGiornoSelezionato(g); setCompletati({}); setLogEsercizi({}); }}>
                      {g.slice(0, 3)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Peso corporeo */}
              <div style={styles.sezione}>
                <p style={styles.label}>⚖️ Il tuo peso oggi (kg)</p>
                <input style={styles.input} type="number" placeholder="Es. 75.5"
                  value={pesoCorporeo} onChange={e => setPesoCorporeo(e.target.value)} />
              </div>

              {/* Esercizi del giorno */}
              {eserciziOggi.length === 0 ? (
                <div style={styles.noScheda}><p>Nessun esercizio per {giornoSelezionato}.</p></div>
              ) : (
                <>
                  <p style={styles.titoloGiorno}>{giornoSelezionato}</p>
                  {eserciziOggi.map((ex, i) => (
                    <div key={i} style={{ ...styles.esercizioCard, ...(completati[i] ? styles.esercizioCompletato : {}) }}>
                      <div style={styles.esercizioHeader}>
                        <img src={ex.gifUrl} alt={ex.nome} style={styles.gif} />
                        <div style={{ flex: 1 }}>
                          <p style={styles.exNome}>{ex.nome}</p>
                          <p style={styles.exInfo}>
                            {ex.serie} serie · {ex.ripetizioni} rip · {ex.peso}kg · {ex.recupero}sec
                          </p>
                          {ex.note && <p style={styles.exNote}>📝 {ex.note}</p>}
                        </div>
                        <button
                          style={{ ...styles.checkBtn, ...(completati[i] ? styles.checkBtnDone : {}) }}
                          onClick={() => toggleCompletato(i)}>
                          {completati[i] ? "✓" : "○"}
                        </button>
                      </div>

                      {/* Log prestazioni */}
                      <div style={styles.logRow}>
                        <div style={styles.logField}>
                          <label style={styles.labelSmall}>Peso usato (kg)</label>
                          <input style={styles.inputSmall} type="number"
                            placeholder={ex.peso}
                            value={logEsercizi[i]?.peso || ""}
                            onChange={e => aggiornaLog(i, "peso", e.target.value)} />
                        </div>
                        <div style={styles.logField}>
                          <label style={styles.labelSmall}>Ripetizioni fatte</label>
                          <input style={styles.inputSmall} type="number"
                            placeholder={ex.ripetizioni}
                            value={logEsercizi[i]?.rip || ""}
                            onChange={e => aggiornaLog(i, "rip", e.target.value)} />
                        </div>
                        <div style={styles.logField}>
                          <label style={styles.labelSmall}>Note</label>
                          <input style={styles.inputSmall} type="text"
                            placeholder="Come ti sei sentito?"
                            value={logEsercizi[i]?.note || ""}
                            onChange={e => aggiornaLog(i, "note", e.target.value)} />
                        </div>
                      </div>
                    </div>
                  ))}

                  {salvato && <div style={styles.successBox}>✅ Allenamento salvato!</div>}

                  <button
                    style={{ ...styles.btnSalva, ...(tuttiCompletati ? styles.btnSalvaCompleto : {}) }}
                    onClick={salvaAllenamento}>
                    {tuttiCompletati ? "🏆 Salva allenamento completato!" : "💾 Salva progressi"}
                  </button>
                </>
              )}
            </>
          )}

          {/* TAB STORICO */}
          {tab === "storico" && cliente && (
            <StoricoCliente clienteId={cliente.id} />
          )}
        </>
      )}
    </div>
  );
}

const styles = {
  container: { maxWidth: "480px", margin: "0 auto", minHeight: "100vh", background: "#ffffff", padding: "1.5rem 1rem 6rem 1rem" },
  loading: { minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", color: "#111", background: "#ffffff" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.5rem" },
  benvenuto: { color: "#111", fontSize: "1.3rem", fontWeight: "800", margin: 0 },
  obiettivo: { color: "#e63946", fontSize: "0.85rem", margin: "0.3rem 0 0 0" },
  logoutBtn: { padding: "0.5rem 1rem", background: "transparent", color: "#666", border: "1px solid #ddd", borderRadius: "8px", cursor: "pointer", fontSize: "0.85rem" },
  tabBar: { display: "flex", gap: "0.5rem", marginBottom: "1.5rem" },
  tabBtn: { flex: 1, padding: "0.7rem", borderRadius: "8px", border: "1px solid #ddd", background: "#f5f5f5", color: "#666", cursor: "pointer", fontWeight: "700", fontSize: "0.9rem" },
  tabBtnActive: { background: "#e63946", color: "#fff", border: "1px solid #e63946" },
  sezione: { background: "#f5f5f5", borderRadius: "12px", padding: "1.2rem", marginBottom: "1rem" },
  label: { color: "#666", fontSize: "0.85rem", marginBottom: "0.8rem" },
  labelSmall: { color: "#888", fontSize: "0.75rem", marginBottom: "0.3rem", display: "block" },
  input: { width: "100%", padding: "0.8rem", borderRadius: "8px", border: "1px solid #ddd", background: "#fff", color: "#111", fontSize: "1rem", boxSizing: "border-box" },
  inputSmall: { width: "100%", padding: "0.6rem", borderRadius: "6px", border: "1px solid #ddd", background: "#fff", color: "#111", fontSize: "0.9rem", boxSizing: "border-box" },
  giorni: { display: "flex", gap: "0.5rem", flexWrap: "wrap" },
  giornoBtn: { padding: "0.6rem 1rem", borderRadius: "8px", border: "1px solid #ddd", background: "#fff", color: "#666", cursor: "pointer", fontSize: "0.85rem", fontWeight: "600" },
  giornoBtnActive: { background: "#e63946", color: "#fff", border: "1px solid #e63946" },
  titoloGiorno: { color: "#111", fontWeight: "800", fontSize: "1.1rem", marginBottom: "1rem" },
  esercizioCard: { background: "#fff", borderRadius: "12px", padding: "1rem", marginBottom: "1rem", border: "2px solid #eee", transition: "border 0.2s", boxShadow: "0 2px 8px rgba(0,0,0,0.06)" },
  esercizioCompletato: { border: "2px solid #4caf50", background: "#f0faf0" },
  esercizioHeader: { display: "flex", alignItems: "flex-start", gap: "0.8rem", marginBottom: "1rem" },
  gif: { width: "64px", height: "64px", borderRadius: "8px", objectFit: "cover", flexShrink: 0 },
  exNome: { color: "#111", fontWeight: "700", fontSize: "0.95rem", margin: 0, textTransform: "capitalize" },
  exInfo: { color: "#888", fontSize: "0.78rem", margin: "0.3rem 0 0 0" },
  exNote: { color: "#f4a261", fontSize: "0.78rem", margin: "0.3rem 0 0 0" },
  checkBtn: { width: "36px", height: "36px", borderRadius: "50%", border: "2px solid #ccc", background: "transparent", color: "#aaa", fontSize: "1rem", cursor: "pointer", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "800" },
  checkBtnDone: { border: "2px solid #4caf50", background: "#4caf50", color: "#fff" },
  logRow: { display: "flex", gap: "0.5rem" },
  logField: { flex: 1, display: "flex", flexDirection: "column" },
  btnSalva: { width: "100%", padding: "1rem", background: "#e63946", color: "#fff", border: "none", borderRadius: "12px", cursor: "pointer", fontWeight: "800", fontSize: "1rem", marginTop: "1rem" },
  btnSalvaCompleto: { background: "#4caf50" },
  successBox: { background: "#f0faf0", border: "1px solid #4caf50", borderRadius: "10px", padding: "1rem", marginTop: "1rem", color: "#2e7d32", textAlign: "center", fontWeight: "700" },
  noScheda: { background: "#f5f5f5", borderRadius: "12px", padding: "2rem", textAlign: "center", color: "#888" }
};