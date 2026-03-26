import { useState, useEffect } from "react";
import { collection, addDoc, getDocs, deleteDoc, updateDoc, doc } from "firebase/firestore";
import { db } from "../firebase";
import { getBodyParts, getExercisesByBodyPart, searchExercises } from "../services/exerciseService";

const GIORNI = ["Lunedì", "Martedì", "Mercoledì", "Giovedì", "Venerdì", "Sabato", "Domenica"];

const traduzioniBodyPart = {
  "back": "Schiena", "cardio": "Cardio", "chest": "Petto",
  "lower arms": "Avambracci", "lower legs": "Polpacci",
  "neck": "Collo", "shoulders": "Spalle", "upper arms": "Braccia",
  "upper legs": "Gambe", "waist": "Addome"
};

export default function GestioneSchede() {
  const [clienti, setClienti] = useState([]);
  const [clienteSelezionato, setClienteSelezionato] = useState("");
  const [giornoSelezionato, setGiornoSelezionato] = useState("Lunedì");
  const [bodyParts, setBodyParts] = useState([]);
  const [bodyPartSelezionata, setBodyPartSelezionata] = useState("");
  const [esercizi, setEsercizi] = useState([]);
  const [ricerca, setRicerca] = useState("");
  const [esercizioSelezionato, setEsercizioSelezionato] = useState(null);
  const [dettagli, setDettagli] = useState({ serie: "", ripetizioni: "", peso: "", recupero: "", note: "" });
  const [scheda, setScheda] = useState({});
  const [schedeSalvate, setSchedeSalvate] = useState([]);
  const [vistaScheda, setVistaScheda] = useState(null);
  const [schedaInModifica, setSchedaInModifica] = useState(null);
  const [schedaDaEliminare, setSchedaDaEliminare] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingEsercizi, setLoadingEsercizi] = useState(false);
  const [successo, setSuccesso] = useState("");
  const [mostraRicerca, setMostraRicerca] = useState(false);
  const [mostraForm, setMostraForm] = useState(false);

  useEffect(() => {
    fetchClienti();
    fetchBodyParts();
    fetchSchede();
  }, []);

  async function fetchClienti() {
    const snap = await getDocs(collection(db, "clienti"));
    setClienti(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  }

  async function fetchBodyParts() {
    const parts = await getBodyParts();
    setBodyParts(parts);
  }

  async function fetchSchede() {
    const snap = await getDocs(collection(db, "schede"));
    setSchedeSalvate(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  }

  async function handleBodyPartChange(bp) {
    setBodyPartSelezionata(bp);
    setLoadingEsercizi(true);
    setEsercizi([]);
    setEsercizioSelezionato(null);
    const data = await getExercisesByBodyPart(bp);
    setEsercizi(data);
    setLoadingEsercizi(false);
  }

  async function handleRicerca() {
    if (!ricerca.trim()) return;
    setLoadingEsercizi(true);
    setEsercizi([]);
    setEsercizioSelezionato(null);
    const data = await searchExercises(ricerca);
    setEsercizi(data);
    setLoadingEsercizi(false);
  }

  function aggiungiEsercizioAlGiorno() {
    if (!esercizioSelezionato) return;
    const esercizioCompleto = {
      id: esercizioSelezionato.id || "",
      nome: esercizioSelezionato.name || "",
      gifUrl: esercizioSelezionato.gifUrl || "",
      bodyPart: esercizioSelezionato.bodyPart || "",
      target: esercizioSelezionato.target || "",
      serie: dettagli.serie || "0",
      ripetizioni: dettagli.ripetizioni || "0",
      peso: dettagli.peso || "0",
      recupero: dettagli.recupero || "0",
      note: dettagli.note || ""
    };
    setScheda(prev => ({
      ...prev,
      [giornoSelezionato]: [...(prev[giornoSelezionato] || []), esercizioCompleto]
    }));
    setEsercizioSelezionato(null);
    setDettagli({ serie: "", ripetizioni: "", peso: "", recupero: "", note: "" });
  }

  function rimuoviEsercizio(giorno, index) {
    setScheda(prev => ({
      ...prev,
      [giorno]: prev[giorno].filter((_, i) => i !== index)
    }));
  }

  function apriModifica(s) {
    setSchedaInModifica(s);
    setClienteSelezionato(s.clienteId);
    setScheda(s.scheda);
    setMostraForm(true);
    setVistaScheda(null);
    setSuccesso("");
  }

  function annulla() {
    setMostraForm(false);
    setSchedaInModifica(null);
    setClienteSelezionato("");
    setScheda({});
    setEsercizi([]);
    setEsercizioSelezionato(null);
    setDettagli({ serie: "", ripetizioni: "", peso: "", recupero: "", note: "" });
    setBodyPartSelezionata("");
    setRicerca("");
  }

  async function salvaScheda() {
    if (!clienteSelezionato) return;
    setLoading(true);
    try {
      if (schedaInModifica) {
        await updateDoc(doc(db, "schede", schedaInModifica.id), {
          clienteId: clienteSelezionato,
          scheda,
          updatedAt: new Date()
        });
        setSuccesso("Scheda aggiornata con successo!");
      } else {
        await addDoc(collection(db, "schede"), {
          clienteId: clienteSelezionato,
          scheda,
          createdAt: new Date()
        });
        setSuccesso("Scheda salvata con successo!");
      }
      annulla();
      fetchSchede();
      setTimeout(() => setSuccesso(""), 4000);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  }

  async function eliminaScheda() {
    if (!schedaDaEliminare) return;
    setLoading(true);
    try {
      await deleteDoc(doc(db, "schede", schedaDaEliminare.id));
      setSchedeSalvate(prev => prev.filter(s => s.id !== schedaDaEliminare.id));
      setSchedaDaEliminare(null);
      setVistaScheda(null);
      setSuccesso("Scheda eliminata.");
      setTimeout(() => setSuccesso(""), 4000);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  }

  const giorniConEsercizi = Object.keys(scheda).filter(g => scheda[g]?.length > 0);

  return (
    <div>
      {/* Header */}
      <div style={styles.header}>
        <h2 style={styles.titolo}>📋 Schede Allenamento</h2>
        {!mostraForm && !vistaScheda && (
          <button style={styles.btnNuovo} onClick={() => { setMostraForm(true); setSchedaInModifica(null); setScheda({}); setClienteSelezionato(""); }}>
            + Nuova Scheda
          </button>
        )}
        {mostraForm && (
          <button style={styles.btnAnnulla} onClick={annulla}>✕ Annulla</button>
        )}
        {vistaScheda && (
          <button style={styles.btnAnnulla} onClick={() => setVistaScheda(null)}>← Torna</button>
        )}
      </div>

      {successo && <div style={styles.successBox}>✅ {successo}</div>}

      {/* Modale conferma eliminazione */}
      {schedaDaEliminare && (
        <div style={styles.overlay}>
          <div style={styles.modale}>
            <p style={styles.modaleTitolo}>⚠️ Elimina scheda</p>
            <p style={styles.modaleTesto}>
              Sei sicuro di voler eliminare la scheda di{" "}
              <strong>
                {clienti.find(c => c.id === schedaDaEliminare.clienteId)?.nome}{" "}
                {clienti.find(c => c.id === schedaDaEliminare.clienteId)?.cognome}
              </strong>? L'operazione è irreversibile.
            </p>
            <div style={styles.modaleBtn}>
              <button style={styles.btnAnnullaModale} onClick={() => setSchedaDaEliminare(null)}>Annulla</button>
              <button style={styles.btnConfermaElimina} onClick={eliminaScheda} disabled={loading}>
                {loading ? "Eliminazione..." : "Elimina"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lista schede salvate */}
      {!mostraForm && !vistaScheda && (
        <div>
          {schedeSalvate.length === 0 && (
            <p style={styles.vuoto}>Nessuna scheda ancora. Creane una!</p>
          )}
          {schedeSalvate.map(s => {
            const cliente = clienti.find(c => c.id === s.clienteId);
            return (
              <div key={s.id} style={styles.schedaCard}>
                <div style={{ flex: 1 }}>
                  <p style={styles.schedaNome}>
                    {cliente ? `${cliente.nome} ${cliente.cognome}` : "Cliente sconosciuto"}
                  </p>
                  <p style={styles.schedaInfo}>
                    {Object.keys(s.scheda).length} giorni · {Object.values(s.scheda).flat().length} esercizi totali
                  </p>
                </div>
                <div style={styles.cardAzioni}>
                  <button style={styles.btnVedi} onClick={() => { setVistaScheda(s); setMostraForm(false); }}>👁 Vedi</button>
                  <button style={styles.btnModifica} onClick={() => apriModifica(s)}>✏️ Modifica</button>
                  <button style={styles.btnElimina} onClick={() => setSchedaDaEliminare(s)}>🗑️ Elimina</button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Dettaglio scheda salvata */}
      {vistaScheda && !mostraForm && (
        <div style={styles.sezione}>
          <div style={styles.vistaHeader}>
            <p style={styles.label}>
              Scheda di:{" "}
              <span style={{ color: "#fff", fontWeight: "700" }}>
                {clienti.find(c => c.id === vistaScheda.clienteId)?.nome}{" "}
                {clienti.find(c => c.id === vistaScheda.clienteId)?.cognome}
              </span>
            </p>
            <div style={styles.cardAzioni}>
              <button style={styles.btnModifica} onClick={() => apriModifica(vistaScheda)}>✏️ Modifica</button>
              <button style={styles.btnElimina} onClick={() => setSchedaDaEliminare(vistaScheda)}>🗑️ Elimina</button>
            </div>
          </div>
          {Object.entries(vistaScheda.scheda).map(([giorno, esercizi]) => (
            <div key={giorno} style={styles.riepilogoGiorno}>
              <p style={styles.riepilogoGiornoTitolo}>{giorno}</p>
              {esercizi.map((ex, i) => (
                <div key={i} style={styles.riepilogoEsercizio}>
                  <img src={ex.gifUrl} alt={ex.nome} style={styles.gif} />
                  <div>
                    <p style={styles.exNome}>{ex.nome}</p>
                    <p style={styles.exInfo}>
                      {ex.serie} serie · {ex.ripetizioni} rip · {ex.peso}kg · {ex.recupero}sec recupero
                    </p>
                    {ex.note && <p style={styles.exNote}>📝 {ex.note}</p>}
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      {/* Form nuova scheda / modifica */}
      {mostraForm && (
        <>
          <div style={styles.sezione}>
            <p style={styles.formTitolo}>{schedaInModifica ? "✏️ Modifica scheda" : "➕ Nuova scheda"}</p>
            <label style={styles.label}>Seleziona cliente *</label>
            <select style={styles.select} value={clienteSelezionato} onChange={e => setClienteSelezionato(e.target.value)} disabled={!!schedaInModifica}>
              <option value="">Scegli un cliente...</option>
              {clienti.map(c => (
                <option key={c.id} value={c.id}>{c.nome} {c.cognome}</option>
              ))}
            </select>
          </div>

          {clienteSelezionato && (
            <>
              {/* Selezione giorno */}
              <div style={styles.sezione}>
                <label style={styles.label}>Giorno della settimana</label>
                <div style={styles.giorni}>
                  {GIORNI.map(g => (
                    <button key={g}
                      style={{ ...styles.giornoBtn, ...(giornoSelezionato === g ? styles.giornoBtnActive : {}) }}
                      onClick={() => setGiornoSelezionato(g)}>
                      {g.slice(0, 3)}
                      {scheda[g]?.length > 0 && <span style={styles.badge}>{scheda[g].length}</span>}
                    </button>
                  ))}
                </div>
              </div>

              {/* Ricerca esercizi */}
              <div style={styles.sezione}>
                <label style={styles.label}>Aggiungi esercizio per {giornoSelezionato}</label>
                <div style={styles.tabs}>
                  <button style={{ ...styles.tab, ...(!mostraRicerca ? styles.tabActive : {}) }} onClick={() => setMostraRicerca(false)}>
                    Per gruppo muscolare
                  </button>
                  <button style={{ ...styles.tab, ...(mostraRicerca ? styles.tabActive : {}) }} onClick={() => setMostraRicerca(true)}>
                    Cerca per nome
                  </button>
                </div>

                {!mostraRicerca ? (
                  <div style={styles.bodyParts}>
                    {bodyParts.map(bp => (
                      <button key={bp}
                        style={{ ...styles.bpBtn, ...(bodyPartSelezionata === bp ? styles.bpBtnActive : {}) }}
                        onClick={() => handleBodyPartChange(bp)}>
                        {traduzioniBodyPart[bp] || bp}
                      </button>
                    ))}
                  </div>
                ) : (
                  <div style={styles.ricercaRow}>
                    <input style={styles.input} placeholder="Es. squat, bench press..."
                      value={ricerca} onChange={e => setRicerca(e.target.value)}
                      onKeyDown={e => e.key === "Enter" && handleRicerca()} />
                    <button style={styles.btnCerca} onClick={handleRicerca}>Cerca</button>
                  </div>
                )}

                {loadingEsercizi && <p style={styles.loading}>Caricamento esercizi...</p>}

                {esercizi.length > 0 && (
                  <div style={styles.listaEsercizi}>
                    {esercizi.map(ex => (
                      <div key={ex.id}
                        style={{ ...styles.esercizioCard, ...(esercizioSelezionato?.id === ex.id ? styles.esercizioCardSelected : {}) }}
                        onClick={() => setEsercizioSelezionato(ex)}>
                        <img src={ex.gifUrl} alt={ex.name} style={styles.gif} />
                        <div>
                          <p style={styles.exNome}>{ex.name}</p>
                          <p style={styles.exInfo}>{traduzioniBodyPart[ex.bodyPart] || ex.bodyPart} · {ex.target}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Dettagli esercizio selezionato */}
              {esercizioSelezionato && (
                <div style={styles.dettagliBox}>
                  <p style={styles.dettagliTitolo}>
                    ⚙️ Dettagli per: <span style={{ color: "#e63946" }}>{esercizioSelezionato.name}</span>
                  </p>
                  <div style={styles.dettagliRow}>
                    {[
                      { key: "serie", label: "Serie" },
                      { key: "ripetizioni", label: "Ripetizioni" },
                      { key: "peso", label: "Peso (kg)" },
                      { key: "recupero", label: "Recupero (sec)" }
                    ].map(({ key, label }) => (
                      <div key={key} style={styles.dettagliField}>
                        <label style={styles.label}>{label}</label>
                        <input style={styles.input} type="number" value={dettagli[key]}
                          onChange={e => setDettagli({ ...dettagli, [key]: e.target.value })} />
                      </div>
                    ))}
                  </div>
                  <div style={styles.dettagliField}>
                    <label style={styles.label}>Note</label>
                    <input style={styles.input} value={dettagli.note}
                      onChange={e => setDettagli({ ...dettagli, note: e.target.value })}
                      placeholder="Es. mantieni la schiena dritta..." />
                  </div>
                  <button style={styles.btnAggiungi} onClick={aggiungiEsercizioAlGiorno}>
                    + Aggiungi a {giornoSelezionato}
                  </button>
                </div>
              )}

              {/* Riepilogo scheda in costruzione */}
              {giorniConEsercizi.length > 0 && (
                <div style={styles.sezione}>
                  <p style={styles.label}>📋 Riepilogo scheda</p>
                  {giorniConEsercizi.map(giorno => (
                    <div key={giorno} style={styles.riepilogoGiorno}>
                      <p style={styles.riepilogoGiornoTitolo}>{giorno}</p>
                      {scheda[giorno].map((ex, i) => (
                        <div key={i} style={styles.riepilogoEsercizio}>
                          <img src={ex.gifUrl} alt={ex.nome} style={styles.gif} />
                          <div style={{ flex: 1 }}>
                            <p style={styles.exNome}>{ex.nome}</p>
                            <p style={styles.exInfo}>
                              {ex.serie} serie · {ex.ripetizioni} rip · {ex.peso}kg · {ex.recupero}sec recupero
                            </p>
                            {ex.note && <p style={styles.exNote}>📝 {ex.note}</p>}
                          </div>
                          <button style={styles.btnRimuovi} onClick={() => rimuoviEsercizio(giorno, i)}>✕</button>
                        </div>
                      ))}
                    </div>
                  ))}
                  <button style={styles.btnSalva} onClick={salvaScheda} disabled={loading}>
                    {loading ? "Salvataggio..." : schedaInModifica ? "💾 Salva modifiche" : "💾 Salva Scheda"}
                  </button>
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}

const styles = {
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" },
  titolo: { color: "#fff", fontSize: "1.6rem", fontWeight: "800", margin: 0 },
  btnNuovo: { padding: "0.7rem 1.4rem", background: "#e63946", color: "#fff", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: "700" },
  btnAnnulla: { padding: "0.7rem 1.4rem", background: "transparent", color: "#aaa", border: "1px solid #333", borderRadius: "8px", cursor: "pointer", fontWeight: "700" },
  sezione: { background: "#1a1a1a", borderRadius: "12px", padding: "1.5rem", marginBottom: "1.5rem" },
  formTitolo: { color: "#fff", fontWeight: "800", fontSize: "1.1rem", marginBottom: "1rem" },
  label: { color: "#aaa", fontSize: "0.85rem", marginBottom: "0.5rem", display: "block" },
  select: { width: "100%", padding: "0.8rem", borderRadius: "8px", border: "1px solid #333", background: "#111", color: "#fff", fontSize: "0.95rem" },
  input: { padding: "0.8rem", borderRadius: "8px", border: "1px solid #333", background: "#111", color: "#fff", fontSize: "0.95rem", width: "100%", boxSizing: "border-box" },
  giorni: { display: "flex", gap: "0.5rem", flexWrap: "wrap", marginTop: "0.5rem" },
  giornoBtn: { padding: "0.5rem 0.9rem", borderRadius: "8px", border: "1px solid #333", background: "#111", color: "#aaa", cursor: "pointer", fontSize: "0.85rem", position: "relative" },
  giornoBtnActive: { background: "#e63946", color: "#fff", border: "1px solid #e63946" },
  badge: { position: "absolute", top: "-6px", right: "-6px", background: "#fff", color: "#e63946", borderRadius: "50%", fontSize: "0.65rem", width: "16px", height: "16px", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "800" },
  tabs: { display: "flex", gap: "0.5rem", marginBottom: "1rem" },
  tab: { padding: "0.5rem 1rem", borderRadius: "8px", border: "1px solid #333", background: "#111", color: "#aaa", cursor: "pointer", fontSize: "0.85rem" },
  tabActive: { background: "#e63946", color: "#fff", border: "1px solid #e63946" },
  bodyParts: { display: "flex", gap: "0.5rem", flexWrap: "wrap", marginBottom: "1rem" },
  bpBtn: { padding: "0.5rem 1rem", borderRadius: "20px", border: "1px solid #333", background: "#111", color: "#aaa", cursor: "pointer", fontSize: "0.85rem" },
  bpBtnActive: { background: "#333", color: "#fff", border: "1px solid #555" },
  ricercaRow: { display: "flex", gap: "0.5rem", marginBottom: "1rem" },
  btnCerca: { padding: "0.8rem 1.2rem", background: "#e63946", color: "#fff", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: "700", whiteSpace: "nowrap" },
  loading: { color: "#aaa", textAlign: "center", padding: "1rem" },
  listaEsercizi: { display: "flex", flexDirection: "column", gap: "0.5rem", maxHeight: "350px", overflowY: "auto", marginTop: "1rem" },
  esercizioCard: { display: "flex", alignItems: "center", gap: "1rem", padding: "0.8rem", borderRadius: "8px", border: "1px solid #333", background: "#111", cursor: "pointer" },
  esercizioCardSelected: { border: "1px solid #e63946", background: "#1a0a0b" },
  gif: { width: "60px", height: "60px", borderRadius: "6px", objectFit: "cover", flexShrink: 0 },
  exNome: { color: "#fff", fontSize: "0.9rem", fontWeight: "600", margin: 0, textTransform: "capitalize" },
  exInfo: { color: "#888", fontSize: "0.78rem", margin: "0.2rem 0 0 0", textTransform: "capitalize" },
  exNote: { color: "#f4a261", fontSize: "0.78rem", margin: "0.2rem 0 0 0" },
  dettagliBox: { background: "#1a1a1a", borderRadius: "12px", padding: "1.5rem", marginBottom: "1.5rem", border: "1px solid #e63946" },
  dettagliTitolo: { color: "#fff", fontWeight: "700", marginBottom: "1rem" },
  dettagliRow: { display: "flex", gap: "1rem", flexWrap: "wrap", marginBottom: "1rem" },
  dettagliField: { flex: 1, minWidth: "120px", display: "flex", flexDirection: "column", gap: "0.3rem" },
  btnAggiungi: { padding: "0.8rem 1.5rem", background: "#e63946", color: "#fff", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: "700", marginTop: "1rem" },
  riepilogoGiorno: { marginBottom: "1.5rem" },
  riepilogoGiornoTitolo: { color: "#e63946", fontWeight: "700", fontSize: "0.95rem", marginBottom: "0.5rem" },
  riepilogoEsercizio: { display: "flex", alignItems: "center", gap: "1rem", background: "#111", borderRadius: "8px", padding: "0.8rem 1rem", marginBottom: "0.4rem" },
  btnRimuovi: { background: "transparent", border: "none", color: "#e63946", cursor: "pointer", fontSize: "1rem", fontWeight: "700", flexShrink: 0 },
  btnSalva: { width: "100%", padding: "1rem", background: "#e63946", color: "#fff", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: "700", fontSize: "1rem", marginTop: "1rem" },
  successBox: { background: "#1a2e1a", border: "1px solid #2d5a2d", borderRadius: "10px", padding: "1rem 1.5rem", marginBottom: "1.5rem", color: "#4caf50" },
  schedaCard: { display: "flex", justifyContent: "space-between", alignItems: "center", background: "#1a1a1a", borderRadius: "10px", padding: "1.2rem 1.5rem", marginBottom: "0.8rem", border: "1px solid #222", gap: "1rem", flexWrap: "wrap" },
  schedaNome: { color: "#fff", fontWeight: "700", fontSize: "1rem", margin: 0 },
  schedaInfo: { color: "#888", fontSize: "0.82rem", margin: "0.2rem 0 0 0" },
  cardAzioni: { display: "flex", gap: "0.5rem", flexWrap: "wrap" },
  btnVedi: { padding: "0.5rem 1rem", background: "transparent", color: "#4caf50", border: "1px solid #4caf50", borderRadius: "8px", cursor: "pointer", fontWeight: "700", fontSize: "0.85rem" },
  btnModifica: { padding: "0.5rem 1rem", background: "transparent", color: "#4a90d9", border: "1px solid #4a90d9", borderRadius: "8px", cursor: "pointer", fontWeight: "700", fontSize: "0.85rem" },
  btnElimina: { padding: "0.5rem 1rem", background: "transparent", color: "#e63946", border: "1px solid #e63946", borderRadius: "8px", cursor: "pointer", fontWeight: "700", fontSize: "0.85rem" },
  vistaHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem", flexWrap: "wrap", gap: "1rem" },
  vuoto: { color: "#555", textAlign: "center", marginTop: "2rem" },
  overlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 },
  modale: { background: "#1a1a1a", borderRadius: "16px", padding: "2rem", maxWidth: "400px", width: "90%", border: "1px solid #333" },
  modaleTitolo: { color: "#fff", fontWeight: "800", fontSize: "1.2rem", marginBottom: "1rem" },
  modaleTesto: { color: "#aaa", fontSize: "0.95rem", marginBottom: "1.5rem", lineHeight: "1.5" },
  modaleBtn: { display: "flex", gap: "1rem" },
  btnAnnullaModale: { flex: 1, padding: "0.8rem", background: "transparent", color: "#aaa", border: "1px solid #333", borderRadius: "8px", cursor: "pointer", fontWeight: "700" },
  btnConfermaElimina: { flex: 1, padding: "0.8rem", background: "#e63946", color: "#fff", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: "700" },
};