import { useState, useEffect } from "react";
import { collection, addDoc, getDocs, deleteDoc, updateDoc, doc } from "firebase/firestore";
import { db } from "../firebase";

const GIORNI = ["Lunedì", "Martedì", "Mercoledì", "Giovedì", "Venerdì", "Sabato", "Domenica"];

const GRUPPI_MUSCOLARI = [
  "Tutti", "Petto", "Schiena", "Spalle", "Bicipiti", "Tricipiti",
  "Avambracci", "Addome", "Glutei", "Quadricipiti", "Femorali",
  "Polpacci", "Cardio", "Corpo libero"
];

function getImgSrc(ex) {
  if (ex.immagineBase64) return ex.immagineBase64;
  if (ex.immagineUrl) return ex.immagineUrl;
  return null;
}

export default function GestioneSchede() {
  const [clienti, setClienti] = useState([]);
  const [clienteSelezionato, setClienteSelezionato] = useState("");
  const [giornoSelezionato, setGiornoSelezionato] = useState("Lunedì");

  const [tuttiEsercizi, setTuttiEsercizi] = useState([]);
  const [filtroGruppo, setFiltroGruppo] = useState("Tutti");
  const [ricerca, setRicerca] = useState("");

  // Selezione multipla: array di { esercizio, dettagli }
  const [selezione, setSelezione] = useState([]);
  // Dettagli per esercizio selezionato attivo (quello su cui si stanno inserendo i dettagli)
  const [esercizioAttivo, setEsercizioAttivo] = useState(null);
  const [dettagliTemp, setDettagliTemp] = useState({ serie: "", ripetizioni: "", peso: "", recupero: "", note: "" });

  const [scheda, setScheda] = useState({});
  const [schedeSalvate, setSchedeSalvate] = useState([]);
  const [vistaScheda, setVistaScheda] = useState(null);
  const [schedaInModifica, setSchedaInModifica] = useState(null);
  const [schedaDaEliminare, setSchedaDaEliminare] = useState(null);

  const [loading, setLoading] = useState(false);
  const [successo, setSuccesso] = useState("");
  const [mostraForm, setMostraForm] = useState(false);

  useEffect(() => {
    fetchClienti();
    fetchEsercizi();
    fetchSchede();
  }, []);

  async function fetchClienti() {
    const snap = await getDocs(collection(db, "clienti"));
    setClienti(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  }

  async function fetchEsercizi() {
    const snap = await getDocs(collection(db, "esercizi"));
    setTuttiEsercizi(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  }

  async function fetchSchede() {
    const snap = await getDocs(collection(db, "schede"));
    setSchedeSalvate(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  }

  const eserciziMostrati = tuttiEsercizi.filter(e => {
    const matchGruppo = filtroGruppo === "Tutti" || e.gruppoMuscolare === filtroGruppo;
    const matchRicerca = e.nome.toLowerCase().includes(ricerca.toLowerCase());
    return matchGruppo && matchRicerca;
  });

  // Controlla se un esercizio è nella selezione
  function isSelezionato(id) {
    return selezione.some(s => s.esercizio.id === id);
  }

  // Toggle selezione esercizio
  function toggleSelezione(ex) {
    if (isSelezionato(ex.id)) {
      setSelezione(prev => prev.filter(s => s.esercizio.id !== ex.id));
      if (esercizioAttivo?.id === ex.id) setEsercizioAttivo(null);
    } else {
      setSelezione(prev => [...prev, {
        esercizio: ex,
        dettagli: { serie: "", ripetizioni: "", peso: "", recupero: "", note: "" }
      }]);
      setEsercizioAttivo(ex);
      setDettagliTemp({ serie: "", ripetizioni: "", peso: "", recupero: "", note: "" });
    }
  }

  // Aggiorna dettagli per un esercizio nella selezione
  function aggiornaDettagli() {
    if (!esercizioAttivo) return;
    setSelezione(prev => prev.map(s =>
      s.esercizio.id === esercizioAttivo.id
        ? { ...s, dettagli: { ...dettagliTemp } }
        : s
    ));
  }

  // Apri dettagli per un esercizio già selezionato
  function apriDettagli(ex) {
    const found = selezione.find(s => s.esercizio.id === ex.id);
    setEsercizioAttivo(ex);
    setDettagliTemp(found ? { ...found.dettagli } : { serie: "", ripetizioni: "", peso: "", recupero: "", note: "" });
  }

  // Aggiungi tutti gli esercizi selezionati al giorno
  function aggiungiTuttiAlGiorno() {
    if (selezione.length === 0) return;
    // Salva eventuali dettagli attivi non ancora confermati
    const selezioneAggiornata = selezione.map(s =>
      s.esercizio.id === esercizioAttivo?.id
        ? { ...s, dettagli: { ...dettagliTemp } }
        : s
    );
    const nuovi = selezioneAggiornata.map(({ esercizio, dettagli }) => ({
      id: esercizio.id,
      nome: esercizio.nome,
      gruppoMuscolare: esercizio.gruppoMuscolare,
      descrizione: esercizio.descrizione || "",
      immagineBase64: esercizio.immagineBase64 || "",
      immagineUrl: esercizio.immagineUrl || "",
      serie: dettagli.serie || "0",
      ripetizioni: dettagli.ripetizioni || "0",
      peso: dettagli.peso || "0",
      recupero: dettagli.recupero || "0",
      note: dettagli.note || ""
    }));
    setScheda(prev => ({
      ...prev,
      [giornoSelezionato]: [...(prev[giornoSelezionato] || []), ...nuovi]
    }));
    setSelezione([]);
    setEsercizioAttivo(null);
    setDettagliTemp({ serie: "", ripetizioni: "", peso: "", recupero: "", note: "" });
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
    setSelezione([]);
    setEsercizioAttivo(null);
  }

  function annulla() {
    setMostraForm(false);
    setSchedaInModifica(null);
    setClienteSelezionato("");
    setScheda({});
    setSelezione([]);
    setEsercizioAttivo(null);
    setDettagliTemp({ serie: "", ripetizioni: "", peso: "", recupero: "", note: "" });
    setFiltroGruppo("Tutti");
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
        {mostraForm && <button style={styles.btnAnnulla} onClick={annulla}>✕ Annulla</button>}
        {vistaScheda && <button style={styles.btnAnnulla} onClick={() => setVistaScheda(null)}>← Torna</button>}
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
          {schedeSalvate.length === 0 && <p style={styles.vuoto}>Nessuna scheda ancora. Creane una!</p>}
          {schedeSalvate.map(s => {
            const cliente = clienti.find(c => c.id === s.clienteId);
            return (
              <div key={s.id} style={styles.schedaCard}>
                <div style={{ flex: 1 }}>
                  <p style={styles.schedaNome}>{cliente ? `${cliente.nome} ${cliente.cognome}` : "Cliente sconosciuto"}</p>
                  <p style={styles.schedaInfo}>{Object.keys(s.scheda).length} giorni · {Object.values(s.scheda).flat().length} esercizi totali</p>
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
              Scheda di: <span style={{ color: "#1a5276", fontWeight: "700" }}>
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
                  {getImgSrc(ex) && <img src={getImgSrc(ex)} alt={ex.nome} style={styles.gifSmall} />}
                  <div>
                    <p style={styles.exNome}>{ex.nome}</p>
                    <p style={styles.exInfo}>{ex.serie} serie · {ex.ripetizioni} rip · {ex.peso}kg · {ex.recupero}sec recupero</p>
                    {ex.descrizione && <p style={styles.exDescrizione}>📖 {ex.descrizione}</p>}
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
          {/* Selezione cliente */}
          <div style={styles.sezione}>
            <p style={styles.formTitolo}>{schedaInModifica ? "✏️ Modifica scheda" : "➕ Nuova scheda"}</p>
            <label style={styles.label}>Seleziona cliente *</label>
            <select style={styles.select} value={clienteSelezionato}
              onChange={e => setClienteSelezionato(e.target.value)} disabled={!!schedaInModifica}>
              <option value="">Scegli un cliente...</option>
              {clienti.map(c => <option key={c.id} value={c.id}>{c.nome} {c.cognome}</option>)}
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
                      onClick={() => { setGiornoSelezionato(g); setSelezione([]); setEsercizioAttivo(null); }}>
                      {g.slice(0, 3)}
                      {scheda[g]?.length > 0 && <span style={styles.badge}>{scheda[g].length}</span>}
                    </button>
                  ))}
                </div>
              </div>

              {/* Catalogo esercizi con selezione multipla */}
              <div style={styles.sezione}>
                <label style={styles.label}>
                  Seleziona esercizi per {giornoSelezionato}
                  {selezione.length > 0 && (
                    <span style={styles.contatoreSelezione}>{selezione.length} selezionati</span>
                  )}
                </label>

                {tuttiEsercizi.length === 0 ? (
                  <div style={styles.avviso}>⚠️ Nessun esercizio nel catalogo. Vai nella sezione <strong>Esercizi</strong> e creane alcuni prima.</div>
                ) : (
                  <>
                    <input
                      style={{ ...styles.input, marginBottom: "0.8rem" }}
                      placeholder="Cerca esercizio per nome..."
                      value={ricerca}
                      onChange={e => setRicerca(e.target.value)}
                    />
                    <div style={styles.filtriWrap}>
                      {GRUPPI_MUSCOLARI.filter(g => g === "Tutti" || tuttiEsercizi.some(e => e.gruppoMuscolare === g)).map(g => (
                        <button key={g}
                          style={{ ...styles.filtroBtn, ...(filtroGruppo === g ? styles.filtroBtnActive : {}) }}
                          onClick={() => setFiltroGruppo(g)}>
                          {g}
                        </button>
                      ))}
                    </div>

                    {eserciziMostrati.length === 0 ? (
                      <p style={styles.vuoto}>Nessun esercizio trovato.</p>
                    ) : (
                      <div style={styles.listaEsercizi}>
                        {eserciziMostrati.map(ex => {
                          const sel = isSelezionato(ex.id);
                          const attivo = esercizioAttivo?.id === ex.id;
                          const imgSrc = getImgSrc(ex);
                          return (
                            <div key={ex.id}>
                              <div
                                style={{ ...styles.esercizioCard, ...(sel ? styles.esercizioCardSelected : {}) }}
                                onClick={() => toggleSelezione(ex)}
                              >
                                {imgSrc
                                  ? <img src={imgSrc} alt={ex.nome} style={styles.gifCard} />
                                  : <div style={styles.gifPlaceholder}>💪</div>
                                }
                                <div style={{ flex: 1 }}>
                                  <p style={styles.exNomeCard}>{ex.nome}</p>
                                  <span style={styles.exGruppo}>{ex.gruppoMuscolare}</span>
                                  {ex.descrizione && <p style={styles.exDescrizioneCard}>{ex.descrizione}</p>}
                                </div>
                                <div style={{ ...styles.checkCircle, ...(sel ? styles.checkCircleActive : {}) }}>
                                  {sel ? "✓" : "+"}
                                </div>
                              </div>

                              {/* Dettagli inline per esercizio selezionato */}
                              {sel && (
                                <div style={styles.dettagliInline}>
                                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.8rem" }}>
                                    <p style={styles.dettagliTitolo}>⚙️ Dettagli — {ex.nome}</p>
                                    {!attivo && (
                                      <button style={styles.btnModificaDettagli} onClick={() => apriDettagli(ex)}>
                                        ✏️ Modifica
                                      </button>
                                    )}
                                  </div>
                                  {attivo ? (
                                    <>
                                      <div style={styles.dettagliRow}>
                                        {[
                                          { key: "serie", label: "Serie" },
                                          { key: "ripetizioni", label: "Ripetizioni" },
                                          { key: "peso", label: "Peso (kg)" },
                                          { key: "recupero", label: "Recupero (sec)" }
                                        ].map(({ key, label }) => (
                                          <div key={key} style={styles.dettagliField}>
                                            <label style={styles.label}>{label}</label>
                                            <input style={styles.input} type="number"
                                              value={dettagliTemp[key]}
                                              onChange={e => setDettagliTemp({ ...dettagliTemp, [key]: e.target.value })} />
                                          </div>
                                        ))}
                                      </div>
                                      <div style={styles.dettagliField}>
                                        <label style={styles.label}>Note</label>
                                        <input style={styles.input} value={dettagliTemp.note}
                                          onChange={e => setDettagliTemp({ ...dettagliTemp, note: e.target.value })}
                                          placeholder="Es. mantieni la schiena dritta..." />
                                      </div>
                                      <button style={styles.btnConfermaDettagli} onClick={aggiornaDettagli}>
                                        ✓ Conferma dettagli
                                      </button>
                                    </>
                                  ) : (
                                    <p style={styles.riepilogoDettagli}>
                                      {selezione.find(s => s.esercizio.id === ex.id)?.dettagli?.serie || "—"} serie ·{" "}
                                      {selezione.find(s => s.esercizio.id === ex.id)?.dettagli?.ripetizioni || "—"} rip ·{" "}
                                      {selezione.find(s => s.esercizio.id === ex.id)?.dettagli?.peso || "—"} kg ·{" "}
                                      {selezione.find(s => s.esercizio.id === ex.id)?.dettagli?.recupero || "—"} sec
                                    </p>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {selezione.length > 0 && (
                      <button style={styles.btnAggiungiTutti} onClick={aggiungiTuttiAlGiorno}>
                        + Aggiungi {selezione.length} esercizi a {giornoSelezionato}
                      </button>
                    )}
                  </>
                )}
              </div>

              {/* Riepilogo scheda in costruzione */}
              {giorniConEsercizi.length > 0 && (
                <div style={styles.sezione}>
                  <p style={styles.label}>📋 Riepilogo scheda</p>
                  {giorniConEsercizi.map(giorno => (
                    <div key={giorno} style={styles.riepilogoGiorno}>
                      <p style={styles.riepilogoGiornoTitolo}>{giorno}</p>
                      {scheda[giorno].map((ex, i) => (
                        <div key={i} style={styles.riepilogoEsercizio}>
                          {getImgSrc(ex) && <img src={getImgSrc(ex)} alt={ex.nome} style={styles.gifSmall} />}
                          <div style={{ flex: 1 }}>
                            <p style={styles.exNome}>{ex.nome}</p>
                            <p style={styles.exInfo}>{ex.serie} serie · {ex.ripetizioni} rip · {ex.peso}kg · {ex.recupero}sec recupero</p>
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
  sezione: { background: "#e8f4fd", borderRadius: "12px", padding: "1.5rem", marginBottom: "1.5rem", border: "1px solid #b3d9f5" },
  formTitolo: { color: "#1a5276", fontWeight: "800", fontSize: "1.1rem", marginBottom: "1rem" },
  label: { color: "#2e86c1", fontSize: "0.85rem", marginBottom: "0.5rem", display: "block", fontWeight: "600" },
  contatoreSelezione: { marginLeft: "0.8rem", background: "#2e86c1", color: "#fff", borderRadius: "20px", padding: "0.1rem 0.7rem", fontSize: "0.78rem", fontWeight: "700" },
  select: { width: "100%", padding: "0.8rem", borderRadius: "8px", border: "1px solid #85c1e9", background: "#fff", color: "#1a1a2e", fontSize: "0.95rem" },
  input: { padding: "0.8rem", borderRadius: "8px", border: "1px solid #85c1e9", background: "#fff", color: "#1a1a2e", fontSize: "0.95rem", width: "100%", boxSizing: "border-box" },
  giorni: { display: "flex", gap: "0.5rem", flexWrap: "wrap", marginTop: "0.5rem" },
  giornoBtn: { padding: "0.5rem 0.9rem", borderRadius: "8px", border: "1px solid #85c1e9", background: "#fff", color: "#2e86c1", cursor: "pointer", fontSize: "0.85rem", position: "relative" },
  giornoBtnActive: { background: "#2e86c1", color: "#fff", border: "1px solid #2e86c1" },
  badge: { position: "absolute", top: "-6px", right: "-6px", background: "#e63946", color: "#fff", borderRadius: "50%", fontSize: "0.65rem", width: "16px", height: "16px", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "800" },
  avviso: { background: "#2a1f0a", border: "1px solid #f4a261", borderRadius: "8px", padding: "1rem", color: "#f4a261", fontSize: "0.9rem" },
  filtriWrap: { display: "flex", gap: "0.5rem", flexWrap: "wrap", marginBottom: "1rem" },
  filtroBtn: { padding: "0.4rem 0.9rem", borderRadius: "20px", border: "1px solid #85c1e9", background: "#fff", color: "#2e86c1", cursor: "pointer", fontSize: "0.8rem" },
  filtroBtnActive: { background: "#2e86c1", color: "#fff", border: "1px solid #2e86c1" },
  listaEsercizi: { display: "flex", flexDirection: "column", gap: "0.4rem", maxHeight: "450px", overflowY: "auto" },
  esercizioCard: { display: "flex", alignItems: "center", gap: "0.8rem", padding: "0.8rem 1rem", borderRadius: "8px", border: "1px solid #b3d9f5", background: "#fff", cursor: "pointer" },
  esercizioCardSelected: { border: "1px solid #2e86c1", background: "#eaf4fd" },
  gifCard: { width: "56px", height: "56px", objectFit: "cover", borderRadius: "6px", flexShrink: 0, border: "1px solid #ddd" },
  gifPlaceholder: { width: "56px", height: "56px", borderRadius: "6px", flexShrink: 0, background: "#e8f4fd", border: "1px solid #b3d9f5", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.4rem" },
  gifSmall: { width: "48px", height: "48px", objectFit: "cover", borderRadius: "6px", flexShrink: 0, border: "1px solid #ddd" },
  exNomeCard: { color: "#1a1a2e", fontSize: "0.9rem", fontWeight: "600", margin: "0 0 0.2rem 0" },
  exNome: { color: "#1a5276", fontSize: "0.9rem", fontWeight: "600", margin: "0 0 0.2rem 0" },
  exGruppo: { background: "#e8f4fd", color: "#2e86c1", border: "1px solid #85c1e9", borderRadius: "20px", padding: "0.1rem 0.6rem", fontSize: "0.72rem", fontWeight: "700" },
  exDescrizioneCard: { color: "#666", fontSize: "0.78rem", margin: "0.3rem 0 0 0", lineHeight: "1.4" },
  exInfo: { color: "#5d8aa8", fontSize: "0.78rem", margin: "0.2rem 0 0 0" },
  exDescrizione: { color: "#5d8aa8", fontSize: "0.82rem", margin: "0.3rem 0 0 0", lineHeight: "1.5", fontStyle: "italic" },
  exNote: { color: "#f4a261", fontSize: "0.78rem", margin: "0.2rem 0 0 0" },
  checkCircle: { width: "28px", height: "28px", borderRadius: "50%", border: "2px solid #b3d9f5", background: "#fff", color: "#aaa", fontSize: "0.9rem", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "800", flexShrink: 0 },
  checkCircleActive: { background: "#2e86c1", border: "2px solid #2e86c1", color: "#fff" },
  dettagliInline: { background: "#d6eaf8", borderRadius: "0 0 8px 8px", padding: "1rem 1rem 1rem 1rem", border: "1px solid #2e86c1", borderTop: "none", marginBottom: "0.4rem" },
  dettagliTitolo: { color: "#1a5276", fontWeight: "700", fontSize: "0.85rem", margin: 0 },
  dettagliRow: { display: "flex", gap: "0.8rem", flexWrap: "wrap", marginBottom: "0.8rem" },
  dettagliField: { flex: 1, minWidth: "100px", display: "flex", flexDirection: "column", gap: "0.2rem" },
  btnConfermaDettagli: { padding: "0.6rem 1.2rem", background: "#2e86c1", color: "#fff", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: "700", fontSize: "0.85rem", marginTop: "0.5rem" },
  btnModificaDettagli: { padding: "0.3rem 0.8rem", background: "transparent", color: "#2e86c1", border: "1px solid #85c1e9", borderRadius: "6px", cursor: "pointer", fontSize: "0.78rem", fontWeight: "600" },
  riepilogoDettagli: { color: "#2e6a8a", fontSize: "0.82rem", margin: 0 },
  btnAggiungiTutti: { width: "100%", padding: "0.9rem", background: "#e63946", color: "#fff", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: "700", fontSize: "0.95rem", marginTop: "1rem" },
  riepilogoGiorno: { marginBottom: "1.5rem" },
  riepilogoGiornoTitolo: { color: "#1a5276", fontWeight: "700", fontSize: "0.95rem", marginBottom: "0.5rem" },
  riepilogoEsercizio: { display: "flex", alignItems: "flex-start", gap: "0.8rem", background: "#fff", borderRadius: "8px", padding: "0.8rem 1rem", marginBottom: "0.4rem", border: "1px solid #b3d9f5" },
  btnRimuovi: { background: "transparent", border: "none", color: "#e63946", cursor: "pointer", fontSize: "1rem", fontWeight: "700", flexShrink: 0, paddingTop: "0.1rem" },
  btnSalva: { width: "100%", padding: "1rem", background: "#2e86c1", color: "#fff", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: "700", fontSize: "1rem", marginTop: "1rem" },
  successBox: { background: "#1a2e1a", border: "1px solid #2d5a2d", borderRadius: "10px", padding: "1rem 1.5rem", marginBottom: "1.5rem", color: "#4caf50" },
  schedaCard: { display: "flex", justifyContent: "space-between", alignItems: "center", background: "#1a1a1a", borderRadius: "10px", padding: "1.2rem 1.5rem", marginBottom: "0.8rem", border: "1px solid #222", gap: "1rem", flexWrap: "wrap" },
  schedaNome: { color: "#fff", fontWeight: "700", fontSize: "1rem", margin: 0 },
  schedaInfo: { color: "#888", fontSize: "0.82rem", margin: "0.2rem 0 0 0" },
  cardAzioni: { display: "flex", gap: "0.5rem", flexWrap: "wrap" },
  btnVedi: { padding: "0.5rem 1rem", background: "transparent", color: "#4caf50", border: "1px solid #4caf50", borderRadius: "8px", cursor: "pointer", fontWeight: "700", fontSize: "0.85rem" },
  btnModifica: { padding: "0.5rem 1rem", background: "transparent", color: "#4a90d9", border: "1px solid #4a90d9", borderRadius: "8px", cursor: "pointer", fontWeight: "700", fontSize: "0.85rem" },
  btnElimina: { padding: "0.5rem 1rem", background: "transparent", color: "#e63946", border: "1px solid #e63946", borderRadius: "8px", cursor: "pointer", fontWeight: "700", fontSize: "0.85rem" },
  vistaHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem", flexWrap: "wrap", gap: "1rem" },
  vuoto: { color: "#555", textAlign: "center", marginTop: "1rem" },
  overlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 },
  modale: { background: "#1a1a1a", borderRadius: "16px", padding: "2rem", maxWidth: "400px", width: "90%", border: "1px solid #333" },
  modaleTitolo: { color: "#fff", fontWeight: "800", fontSize: "1.2rem", marginBottom: "1rem" },
  modaleTesto: { color: "#aaa", fontSize: "0.95rem", marginBottom: "1.5rem", lineHeight: "1.5" },
  modaleBtn: { display: "flex", gap: "1rem" },
  btnAnnullaModale: { flex: 1, padding: "0.8rem", background: "transparent", color: "#aaa", border: "1px solid #333", borderRadius: "8px", cursor: "pointer", fontWeight: "700" },
  btnConfermaElimina: { flex: 1, padding: "0.8rem", background: "#e63946", color: "#fff", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: "700" },
};
