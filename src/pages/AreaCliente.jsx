import { useState, useEffect, useRef } from "react";
import { collection, getDocs, addDoc, query, where } from "firebase/firestore";
import { signOut } from "firebase/auth";
import { auth, db } from "../firebase";
import { useNavigate } from "react-router-dom";
import StoricoCliente from "./StoricoCliente";

const GIORNI = ["Lunedì", "Martedì", "Mercoledì", "Giovedì", "Venerdì", "Sabato", "Domenica"];

function getImgSrc(ex) {
  if (ex.immagineBase64) return ex.immagineBase64;
  if (ex.immagineUrl) return ex.immagineUrl;
  return null;
}

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
  const [descrizioneAperta, setDescrizioneAperta] = useState(null);
  const [timer, setTimer] = useState({}); // { [index]: secondi_rimanenti }
  const [timerAttivo, setTimerAttivo] = useState({}); // { [index]: true/false }
  const intervalRef = useRef({});
  const audioCtxRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => { init(); }, []);

  function initAudio() {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtxRef.current.state === "suspended") {
      audioCtxRef.current.resume();
    }
  }

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

  function playBip() {
    initAudio();
    const ctx = audioCtxRef.current;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 880;
    osc.type = "sine";
    gain.gain.setValueAtTime(1, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 1);
  }

  function avviaTimer(index, secondi) {
    if (intervalRef.current[index]) clearInterval(intervalRef.current[index]);
    const sec = parseInt(secondi) > 0 ? parseInt(secondi) : 60;
    setTimer(prev => ({ ...prev, [index]: sec }));
    setTimerAttivo(prev => ({ ...prev, [index]: true }));
    let remaining = sec;
    intervalRef.current[index] = setInterval(() => {
      remaining -= 1;
      setTimer(prev => ({ ...prev, [index]: remaining }));
      if (remaining <= 0) {
        clearInterval(intervalRef.current[index]);
        setTimerAttivo(prev => ({ ...prev, [index]: false }));
        playBip();
      }
    }, 1000);
  }

  function resetTimer(index, secondi) {
    if (intervalRef.current[index]) clearInterval(intervalRef.current[index]);
    setTimerAttivo(prev => ({ ...prev, [index]: false }));
    setTimer(prev => ({ ...prev, [index]: parseInt(secondi) || 60 }));
  }

  function toggleDescrizione(index) {
    setDescrizioneAperta(prev => prev === index ? null : index);
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
      <div style={styles.header}>
        <div>
          <p style={styles.benvenuto}>Ciao, {cliente?.nome} 👋</p>
          <p style={styles.obiettivo}>🎯 {cliente?.obiettivo}</p>
        </div>
        <button style={styles.logoutBtn} onClick={handleLogout}>Esci</button>
      </div>

      {!scheda && (
        <div style={styles.noScheda}>
          <p>⏳ Il tuo PT non ha ancora creato una scheda per te.</p>
        </div>
      )}

      {scheda && (
        <>
          <div style={styles.tabBar}>
            <button style={{ ...styles.tabBtn, ...(tab === "oggi" ? styles.tabBtnActive : {}) }} onClick={() => setTab("oggi")}>
              🏋️ Oggi
            </button>
            <button style={{ ...styles.tabBtn, ...(tab === "storico" ? styles.tabBtnActive : {}) }} onClick={() => setTab("storico")}>
              📈 Progressi
            </button>
          </div>

          {tab === "oggi" && (
            <>
              <div style={styles.sezione}>
                <p style={styles.label}>Seleziona giorno</p>
                <div style={styles.giorni}>
                  {GIORNI.filter(g => scheda.scheda[g]?.length > 0).map(g => (
                    <button key={g}
                      style={{ ...styles.giornoBtn, ...(giornoSelezionato === g ? styles.giornoBtnActive : {}) }}
                      onClick={() => { setGiornoSelezionato(g); setCompletati({}); setLogEsercizi({}); setDescrizioneAperta(null); }}>
                      {g.slice(0, 3)}
                    </button>
                  ))}
                </div>
              </div>

              <div style={styles.sezione}>
                <p style={styles.label}>⚖️ Il tuo peso oggi (kg)</p>
                <input style={styles.input} type="number" placeholder="Es. 75.5"
                  value={pesoCorporeo} onChange={e => setPesoCorporeo(e.target.value)} />
              </div>

              {eserciziOggi.length === 0 ? (
                <div style={styles.noScheda}><p>Nessun esercizio per {giornoSelezionato}.</p></div>
              ) : (
                <>
                  <p style={styles.titoloGiorno}>{giornoSelezionato}</p>
                  {eserciziOggi.map((ex, i) => (
                    <div key={i} style={{ ...styles.esercizioCard, ...(completati[i] ? styles.esercizioCompletato : {}) }}>

                      {/* Immagine in primo piano, tutta larghezza */}
                      {getImgSrc(ex) && (
                        <img src={getImgSrc(ex)} alt={ex.nome} style={styles.exImmagine} />
                      )}

                      {/* Riga testo + check */}
                      <div style={styles.esercizioHeader}>
                        <div style={{ flex: 1 }}>
                          <p style={styles.exNome}>{ex.nome}</p>
                          <p style={styles.exInfo}>
                            {ex.serie} serie · {ex.ripetizioni} rip · {ex.peso}kg · {ex.recupero}sec
                          </p>
                          {ex.note && <p style={styles.exNote}>📝 {ex.note}</p>}

                          {/* Cronometro recupero */}
                          {ex.recupero !== undefined && (
                            <div style={styles.timerBox}>
                              <span style={styles.timerDisplay}>
                                ⏱ {timer[i] !== undefined ? `${Math.floor(timer[i] / 60).toString().padStart(2,"0")}:${(timer[i] % 60).toString().padStart(2,"0")}` : `${Math.floor(parseInt(ex.recupero) / 60).toString().padStart(2,"0")}:${(parseInt(ex.recupero) % 60).toString().padStart(2,"0")}`}
                              </span>
                              <div style={styles.timerBtns}>
                                <button style={{ ...styles.timerBtn, ...(timerAttivo[i] ? styles.timerBtnStop : styles.timerBtnStart) }}
                                  onClick={() => { initAudio(); timerAttivo[i] ? resetTimer(i, ex.recupero) : avviaTimer(i, ex.recupero); }}>
                                  {timerAttivo[i] ? "■ Stop" : "▶ Start"}
                                </button>
                              </div>
                            </div>
                          )}
                          {ex.descrizione && (
                            <button style={styles.btnDescrizione} onClick={() => toggleDescrizione(i)}>
                              {descrizioneAperta === i ? "▲ Nascondi istruzioni" : "▼ Vedi istruzioni"}
                            </button>
                          )}
                          {ex.descrizione && descrizioneAperta === i && (
                            <div style={styles.descrizioneBox}>
                              <p style={styles.descrizioneText}>📖 {ex.descrizione}</p>
                            </div>
                          )}
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
  esercizioCard: { background: "#fff", borderRadius: "12px", overflow: "hidden", marginBottom: "1rem", border: "2px solid #eee", transition: "border 0.2s", boxShadow: "0 2px 8px rgba(0,0,0,0.06)" },
  esercizioCompletato: { border: "2px solid #4caf50", background: "#f0faf0" },
  exImmagine: { width: "100%", height: "280px", objectFit: "contain", display: "block", background: "#111" },
  esercizioHeader: { display: "flex", alignItems: "flex-start", gap: "0.8rem", padding: "1rem", paddingBottom: "0" },
  exNome: { color: "#111", fontWeight: "700", fontSize: "0.95rem", margin: 0, textTransform: "capitalize" },
  exInfo: { color: "#888", fontSize: "0.78rem", margin: "0.3rem 0 0 0" },
  exNote: { color: "#f4a261", fontSize: "0.78rem", margin: "0.3rem 0 0 0" },
  btnDescrizione: { background: "transparent", border: "none", color: "#4a90d9", fontSize: "0.78rem", cursor: "pointer", padding: "0.3rem 0", fontWeight: "600", marginTop: "0.3rem" },
  descrizioneBox: { background: "#f0f5ff", borderRadius: "8px", padding: "0.8rem", marginTop: "0.5rem", border: "1px solid #d0e4ff" },
  descrizioneText: { color: "#333", fontSize: "0.82rem", lineHeight: "1.6", margin: 0 },
  checkBtn: { width: "36px", height: "36px", borderRadius: "50%", border: "2px solid #ccc", background: "transparent", color: "#aaa", fontSize: "1rem", cursor: "pointer", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "800" },
  checkBtnDone: { border: "2px solid #4caf50", background: "#4caf50", color: "#fff" },
  logRow: { display: "flex", gap: "0.5rem", padding: "1rem" },
  logField: { flex: 1, display: "flex", flexDirection: "column" },
  btnSalva: { width: "100%", padding: "1rem", background: "#e63946", color: "#fff", border: "none", borderRadius: "12px", cursor: "pointer", fontWeight: "800", fontSize: "1rem", marginTop: "1rem" },
  btnSalvaCompleto: { background: "#4caf50" },
  successBox: { background: "#f0faf0", border: "1px solid #4caf50", borderRadius: "10px", padding: "1rem", marginTop: "1rem", color: "#2e7d32", textAlign: "center", fontWeight: "700" },
  noScheda: { background: "#f5f5f5", borderRadius: "12px", padding: "2rem", textAlign: "center", color: "#888" },
  timerBox: { display: "flex", alignItems: "center", justifyContent: "space-between", background: "#f0f0f0", borderRadius: "8px", padding: "0.5rem 0.8rem", marginTop: "0.6rem" },
  timerDisplay: { fontSize: "1.1rem", fontWeight: "800", color: "#111", fontVariantNumeric: "tabular-nums" },
  timerBtns: { display: "flex", gap: "0.4rem" },
  timerBtn: { padding: "0.3rem 0.8rem", borderRadius: "6px", border: "none", cursor: "pointer", fontWeight: "700", fontSize: "0.8rem" },
  timerBtnStart: { background: "#e63946", color: "#fff" },
  timerBtnStop: { background: "#555", color: "#fff" }
};
