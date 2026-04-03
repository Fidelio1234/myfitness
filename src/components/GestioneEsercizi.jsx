import { useState, useEffect, useRef } from "react";
import { collection, addDoc, getDocs, deleteDoc, updateDoc, doc } from "firebase/firestore";
import { db } from "../firebase";

const GRUPPI_MUSCOLARI = [
  "Adduttori", "Petto", "Schiena", "Spalle", "Bicipiti", "Tricipiti",
  "Avambracci", "Addome", "Glutei", "Quadricipiti", "Femorali",
  "Polpacci", "Cardio", "Corpo libero,", 
];

const initialForm = { nome: "", gruppoMuscolare: "", descrizione: "" };

export default function GestioneEsercizi() {
  const [esercizi, setEsercizi] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [mostraForm, setMostraForm] = useState(false);
  const [esercizioInModifica, setEsercizioInModifica] = useState(null);
  const [esercizioDaEliminare, setEsercizioDaEliminare] = useState(null);
  const [loading, setLoading] = useState(false);
  const [successo, setSuccesso] = useState("");
  const [errore, setErrore] = useState("");
  const [filtroGruppo, setFiltroGruppo] = useState("Tutti");

  // Immagine
  const [modalitaImg, setModalitaImg] = useState("file"); // "file" | "url"
  const [anteprima, setAnteprima] = useState(null);       // base64 o url per preview
  const [immagineBase64, setImmagineBase64] = useState(""); // base64 da salvare
  const [immagineUrl, setImmagineUrl] = useState("");       // url esterno da salvare
  const fileInputRef = useRef(null);

  useEffect(() => {
    fetchEsercizi();
  }, []);

  async function fetchEsercizi() {
    const snap = await getDocs(collection(db, "esercizi"));
    setEsercizi(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  }

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  function handleFileChange(e) {
    const file = e.target.files[0];
    if (!file) return;

    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    img.onload = () => {
      // Ridimensiona a max 600px mantenendo proporzioni
      const MAX = 600;
      let w = img.width;
      let h = img.height;
      if (w > h && w > MAX) { h = Math.round(h * MAX / w); w = MAX; }
      else if (h > MAX) { w = Math.round(w * MAX / h); h = MAX; }

      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, w, h);

      // Comprimi a JPEG qualità 70%
      const base64 = canvas.toDataURL("image/jpeg", 0.7);
      setImmagineBase64(base64);
      setAnteprima(base64);
      URL.revokeObjectURL(objectUrl);
    };
    img.src = objectUrl;
  }

  function handleUrlChange(e) {
    setImmagineUrl(e.target.value);
    setAnteprima(e.target.value);
  }

  function switchModalita(m) {
    setModalitaImg(m);
    setAnteprima(null);
    setImmagineBase64("");
    setImmagineUrl("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function apriModifica(esercizio) {
    setEsercizioInModifica(esercizio);
    setForm({
      nome: esercizio.nome,
      gruppoMuscolare: esercizio.gruppoMuscolare,
      descrizione: esercizio.descrizione || ""
    });
    // Ripristina immagine esistente
    if (esercizio.immagineBase64) {
      setImmagineBase64(esercizio.immagineBase64);
      setAnteprima(esercizio.immagineBase64);
      setModalitaImg("file");
    } else if (esercizio.immagineUrl) {
      setImmagineUrl(esercizio.immagineUrl);
      setAnteprima(esercizio.immagineUrl);
      setModalitaImg("url");
    } else {
      setAnteprima(null);
      setImmagineBase64("");
      setImmagineUrl("");
    }
    setMostraForm(true);
    setSuccesso("");
    setErrore("");
  }

  function annulla() {
    setMostraForm(false);
    setEsercizioInModifica(null);
    setForm(initialForm);
    setErrore("");
    setAnteprima(null);
    setImmagineBase64("");
    setImmagineUrl("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setErrore("");
    setLoading(true);

    try {
      const dati = {
        nome: form.nome.trim(),
        gruppoMuscolare: form.gruppoMuscolare,
        descrizione: form.descrizione.trim(),
        immagineBase64: modalitaImg === "file" ? immagineBase64 : "",
        immagineUrl: modalitaImg === "url" ? immagineUrl.trim() : ""
      };

      if (esercizioInModifica) {
        await updateDoc(doc(db, "esercizi", esercizioInModifica.id), dati);
        setSuccesso("Esercizio aggiornato!");
      } else {
        await addDoc(collection(db, "esercizi"), { ...dati, createdAt: new Date() });
        setSuccesso("Esercizio creato!");
      }
      annulla();
      fetchEsercizi();
      setTimeout(() => setSuccesso(""), 3000);
    } catch (err) {
      setErrore("Errore: " + err.message);
    }
    setLoading(false);
  }

  async function eliminaEsercizio() {
    if (!esercizioDaEliminare) return;
    setLoading(true);
    try {
      await deleteDoc(doc(db, "esercizi", esercizioDaEliminare.id));
      setEsercizi(prev => prev.filter(e => e.id !== esercizioDaEliminare.id));
      setEsercizioDaEliminare(null);
      setSuccesso("Esercizio eliminato.");
      setTimeout(() => setSuccesso(""), 3000);
    } catch (err) {
      setErrore("Errore eliminazione: " + err.message);
    }
    setLoading(false);
  }

  // Ritorna la src dell'immagine per la card
  function getImgSrc(e) {
    if (e.immagineBase64) return e.immagineBase64;
    if (e.immagineUrl) return e.immagineUrl;
    return null;
  }

  const eserciziiFiltrati = filtroGruppo === "Tutti"
    ? esercizi
    : esercizi.filter(e => e.gruppoMuscolare === filtroGruppo);

  const gruppiPresenti = ["Tutti", ...GRUPPI_MUSCOLARI.filter(g =>
    esercizi.some(e => e.gruppoMuscolare === g)
  )];

  return (
    <div>
      {/* Header */}
      <div style={styles.header}>
        <h2 style={styles.titolo}>💪 Esercizi</h2>
        <button
          style={styles.btnNuovo}
          onClick={() => mostraForm && !esercizioInModifica ? annulla() : (() => { setMostraForm(true); setEsercizioInModifica(null); setForm(initialForm); setSuccesso(""); setAnteprima(null); setImmagineBase64(""); setImmagineUrl(""); })()}>
          {mostraForm && !esercizioInModifica ? "Annulla" : "+ Nuovo Esercizio"}
        </button>
      </div>

      {successo && <div style={styles.successBox}>✅ {successo}</div>}

      {/* Modale conferma eliminazione */}
      {esercizioDaEliminare && (
        <div style={styles.overlay}>
          <div style={styles.modale}>
            <p style={styles.modaleTitolo}>⚠️ Elimina esercizio</p>
            <p style={styles.modaleTesto}>
              Sei sicuro di voler eliminare <strong>{esercizioDaEliminare.nome}</strong>?
              L'operazione è irreversibile e potrebbe influenzare le schede esistenti.
            </p>
            <div style={styles.modaleBtn}>
              <button style={styles.btnAnnullaModale} onClick={() => setEsercizioDaEliminare(null)}>Annulla</button>
              <button style={styles.btnConfermaElimina} onClick={eliminaEsercizio} disabled={loading}>
                {loading ? "Eliminazione..." : "Elimina"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Form creazione / modifica */}
      {mostraForm && (
        <form onSubmit={handleSubmit} style={styles.form}>
          <p style={styles.formTitolo}>
            {esercizioInModifica ? "✏️ Modifica esercizio" : "➕ Nuovo esercizio"}
          </p>

          <div style={styles.row}>
            <div style={styles.field}>
              <label style={styles.label}>Nome esercizio *</label>
              <input
                style={styles.input}
                name="nome"
                value={form.nome}
                onChange={handleChange}
                placeholder="Es. Panca piana, Squat..."
                required
              />
            </div>
            <div style={styles.field}>
              <label style={styles.label}>Gruppo muscolare *</label>
              <select
                style={styles.input}
                name="gruppoMuscolare"
                value={form.gruppoMuscolare}
                onChange={handleChange}
                required
              >
                <option value="">Seleziona...</option>
                {GRUPPI_MUSCOLARI.map(g => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
            </div>
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Descrizione / Istruzioni per il cliente</label>
            <textarea
              style={styles.textarea}
              name="descrizione"
              value={form.descrizione}
              onChange={handleChange}
              placeholder="Es. Sdraiati sulla panca, impugna il bilanciere con presa larga, abbassa lentamente al petto e spingi verso l'alto..."
              rows={4}
            />
          </div>

          {/* ── Sezione immagine ── */}
          <div style={styles.separatore} />
          <p style={styles.labelSezione}>🖼️ Immagine esercizio</p>

          <div style={styles.switchRow}>
            <button type="button"
              style={{ ...styles.switchBtn, ...(modalitaImg === "file" ? styles.switchBtnActive : {}) }}
              onClick={() => switchModalita("file")}>
              📁 Carica dal PC
            </button>
            <button type="button"
              style={{ ...styles.switchBtn, ...(modalitaImg === "url" ? styles.switchBtnActive : {}) }}
              onClick={() => switchModalita("url")}>
              🔗 URL esterno
            </button>
          </div>

          {modalitaImg === "file" ? (
            <div>
              <div style={styles.uploadArea} onClick={() => fileInputRef.current?.click()}>
                {anteprima ? (
                  <img src={anteprima} alt="anteprima" style={styles.anteprima} />
                ) : (
                  <div style={styles.uploadPlaceholder}>
                    <span style={{ fontSize: "2rem" }}>📤</span>
                    <p style={styles.uploadTesto}>Clicca per scegliere un'immagine</p>
                    <p style={styles.uploadSotto}>JPG, PNG, WebP</p>
                  </div>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                style={{ display: "none" }}
                onChange={handleFileChange}
              />
              {anteprima && (
                <button type="button" style={styles.btnRimuoviImg}
                  onClick={() => { setAnteprima(null); setImmagineBase64(""); if (fileInputRef.current) fileInputRef.current.value = ""; }}>
                  ✕ Rimuovi immagine
                </button>
              )}
            </div>
          ) : (
            <div style={styles.field}>
              <label style={styles.label}>URL immagine</label>
              <input
                style={styles.input}
                value={immagineUrl}
                onChange={handleUrlChange}
                placeholder="https://esempio.com/immagine.jpg"
              />
              {anteprima && (
                <img
                  src={anteprima}
                  alt="anteprima"
                  style={styles.anteprimaUrl}
                  onError={() => setAnteprima(null)}
                />
              )}
            </div>
          )}

          {errore && <p style={styles.errore}>{errore}</p>}

          <div style={styles.row}>
            <button style={styles.btnAnnullaForm} type="button" onClick={annulla}>Annulla</button>
            <button style={styles.btnSubmit} type="submit" disabled={loading}>
              {loading ? "Salvataggio..." : esercizioInModifica ? "💾 Salva modifiche" : "Crea Esercizio"}
            </button>
          </div>
        </form>
      )}

      {/* Filtri per gruppo muscolare */}
      {!mostraForm && esercizi.length > 0 && (
        <div style={styles.filtriWrap}>
          {gruppiPresenti.map(g => (
            <button
              key={g}
              style={{ ...styles.filtroBtn, ...(filtroGruppo === g ? styles.filtroBtnActive : {}) }}
              onClick={() => setFiltroGruppo(g)}
            >
              {g}
            </button>
          ))}
        </div>
      )}

      {/* Lista esercizi */}
      <div style={styles.listaEsercizi}>
        {esercizi.length === 0 && (
          <p style={styles.vuoto}>Nessun esercizio ancora. Creane uno!</p>
        )}
        {eserciziiFiltrati.map(e => {
          const imgSrc = getImgSrc(e);
          return (
            <div key={e.id} style={styles.card}>
              {imgSrc
                ? <img src={imgSrc} alt={e.nome} style={styles.cardImmagine} />
                : <div style={styles.cardImmaginePlaceholder}>💪</div>
              }
              <div style={{ flex: 1 }}>
                <div style={styles.cardTop}>
                  <p style={styles.cardNome}>{e.nome}</p>
                  <span style={styles.cardGruppo}>{e.gruppoMuscolare}</span>
                </div>
                {e.descrizione && (
                  <p style={styles.cardDescrizione}>{e.descrizione}</p>
                )}
              </div>
              <div style={styles.cardAzioni}>
                <button style={styles.btnModifica} onClick={() => apriModifica(e)}>✏️ Modifica</button>
                <button style={styles.btnElimina} onClick={() => setEsercizioDaEliminare(e)}>🗑️ Elimina</button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const styles = {
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" },
  titolo: { color: "#fff", fontSize: "1.6rem", fontWeight: "800", margin: 0 },
  btnNuovo: { padding: "0.7rem 1.4rem", background: "#e63946", color: "#fff", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: "700" },
  successBox: { background: "#1a2e1a", border: "1px solid #2d5a2d", borderRadius: "10px", padding: "1rem 1.5rem", marginBottom: "1.5rem", color: "#4caf50" },
  form: { background: "#e8f4fd", padding: "2rem", borderRadius: "12px", marginBottom: "2rem", display: "flex", flexDirection: "column", gap: "1rem", border: "1px solid #b3d9f5" },
  formTitolo: { color: "#1a5276", fontWeight: "800", fontSize: "1.1rem", margin: 0 },
  row: { display: "flex", gap: "1rem", flexWrap: "wrap" },
  field: { display: "flex", flexDirection: "column", gap: "0.3rem", flex: 1, minWidth: "200px" },
  label: { color: "#2e86c1", fontSize: "0.85rem", fontWeight: "600" },
  labelSezione: { color: "#1a5276", fontWeight: "700", fontSize: "0.95rem", margin: "0 0 0.3rem 0" },
  input: { padding: "0.8rem", borderRadius: "8px", border: "1px solid #85c1e9", background: "#fff", color: "#1a1a2e", fontSize: "0.95rem" },
  textarea: { padding: "0.8rem", borderRadius: "8px", border: "1px solid #85c1e9", background: "#fff", color: "#1a1a2e", fontSize: "0.95rem", resize: "vertical", fontFamily: "inherit" },
  separatore: { borderTop: "1px solid #b3d9f5", margin: "0.2rem 0" },
  switchRow: { display: "flex", gap: "0.5rem", marginBottom: "0.5rem" },
  switchBtn: { padding: "0.5rem 1.2rem", borderRadius: "8px", border: "1px solid #85c1e9", background: "#fff", color: "#2e86c1", cursor: "pointer", fontWeight: "600", fontSize: "0.85rem" },
  switchBtnActive: { background: "#2e86c1", color: "#fff", border: "1px solid #2e86c1" },
  uploadArea: { border: "2px dashed #85c1e9", borderRadius: "10px", background: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", minHeight: "140px", overflow: "hidden" },
  uploadPlaceholder: { textAlign: "center", padding: "1.5rem" },
  uploadTesto: { color: "#2e86c1", fontWeight: "600", margin: "0.5rem 0 0.2rem 0", fontSize: "0.9rem" },
  uploadSotto: { color: "#888", fontSize: "0.78rem", margin: 0 },
  anteprima: { width: "100%", maxHeight: "220px", objectFit: "cover" },
  anteprimaUrl: { width: "100%", maxHeight: "180px", objectFit: "cover", borderRadius: "8px", marginTop: "0.5rem", border: "1px solid #b3d9f5" },
  btnRimuoviImg: { background: "transparent", border: "none", color: "#c0392b", cursor: "pointer", fontSize: "0.82rem", marginTop: "0.4rem", padding: 0 },
  errore: { color: "#c0392b", fontSize: "0.85rem" },
  btnSubmit: { flex: 1, padding: "0.9rem", background: "#2e86c1", color: "#fff", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: "700", fontSize: "1rem" },
  btnAnnullaForm: { flex: 1, padding: "0.9rem", background: "transparent", color: "#2e86c1", border: "1px solid #85c1e9", borderRadius: "8px", cursor: "pointer", fontWeight: "700", fontSize: "1rem" },
  filtriWrap: { display: "flex", gap: "0.5rem", flexWrap: "wrap", marginBottom: "1.5rem" },
  filtroBtn: { padding: "0.4rem 0.9rem", borderRadius: "20px", border: "1px solid #333", background: "#111", color: "#aaa", cursor: "pointer", fontSize: "0.82rem" },
  filtroBtnActive: { background: "#e63946", color: "#fff", border: "1px solid #e63946" },
  listaEsercizi: { display: "flex", flexDirection: "column", gap: "0.8rem" },
  card: { background: "#f5f5f5", borderRadius: "10px", padding: "1.2rem 1.5rem", display: "flex", alignItems: "flex-start", border: "1px solid #e0e0e0", gap: "1rem" },
  cardImmagine: { width: "80px", height: "80px", objectFit: "cover", borderRadius: "8px", flexShrink: 0, border: "1px solid #ddd" },
  cardImmaginePlaceholder: { width: "80px", height: "80px", borderRadius: "8px", flexShrink: 0, background: "#e8f4fd", border: "1px solid #b3d9f5", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.8rem" },
  cardTop: { display: "flex", alignItems: "center", gap: "0.8rem", marginBottom: "0.4rem" },
  cardNome: { color: "#1a1a1a", fontWeight: "700", fontSize: "1rem", margin: 0 },
  cardGruppo: { background: "#2a1a1a", color: "#e63946", border: "1px solid #e63946", borderRadius: "20px", padding: "0.15rem 0.7rem", fontSize: "0.75rem", fontWeight: "700", whiteSpace: "nowrap" },
  cardDescrizione: { color: "#555", fontSize: "0.85rem", lineHeight: "1.5", margin: 0 },
  cardAzioni: { display: "flex", flexDirection: "column", gap: "0.5rem", flexShrink: 0, marginLeft: "auto" },
  btnModifica: { padding: "0.5rem 1rem", background: "transparent", color: "#4a90d9", border: "1px solid #4a90d9", borderRadius: "8px", cursor: "pointer", fontWeight: "700", fontSize: "0.85rem" },
  btnElimina: { padding: "0.5rem 1rem", background: "transparent", color: "#e63946", border: "1px solid #e63946", borderRadius: "8px", cursor: "pointer", fontWeight: "700", fontSize: "0.85rem" },
  vuoto: { color: "#555", textAlign: "center", marginTop: "2rem" },
  overlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 },
  modale: { background: "#1a1a1a", borderRadius: "16px", padding: "2rem", maxWidth: "420px", width: "90%", border: "1px solid #333" },
  modaleTitolo: { color: "#fff", fontWeight: "800", fontSize: "1.2rem", marginBottom: "1rem" },
  modaleTesto: { color: "#aaa", fontSize: "0.95rem", marginBottom: "1.5rem", lineHeight: "1.5" },
  modaleBtn: { display: "flex", gap: "1rem" },
  btnAnnullaModale: { flex: 1, padding: "0.8rem", background: "transparent", color: "#aaa", border: "1px solid #333", borderRadius: "8px", cursor: "pointer", fontWeight: "700" },
  btnConfermaElimina: { flex: 1, padding: "0.8rem", background: "#e63946", color: "#fff", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: "700" },
};
