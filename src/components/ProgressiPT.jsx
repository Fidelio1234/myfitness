import { useState, useEffect } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../firebase";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

export default function ProgressiPT() {
  const [clienti, setClienti] = useState([]);
  const [clienteSelezionato, setClienteSelezionato] = useState("");
  const [log, setLog] = useState([]);
  const [eserciziDisponibili, setEserciziDisponibili] = useState([]);
  const [esercizioSelezionato, setEsercizioSelezionato] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => { fetchClienti(); }, []);

  async function fetchClienti() {
    const snap = await getDocs(collection(db, "clienti"));
    setClienti(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  }

  async function fetchLog(clienteId) {
    setLoading(true);
    const snap = await getDocs(
        query(collection(db, "log_allenamenti"),
          where("clienteId", "==", clienteId))
      );
      const data = snap.docs
        .map(d => ({ id: d.id, ...d.data(), data: d.data().data?.toDate() }))
        .sort((a, b) => a.data - b.data);
        setLog(data);

    const nomi = new Set();
    data.forEach(s => s.esercizi?.forEach(ex => nomi.add(ex.nome)));
    setEserciziDisponibili([...nomi]);
    if (nomi.size > 0) setEsercizioSelezionato([...nomi][0]);
    setLoading(false);
  }

  function formattaData(data) {
    if (!data) return "";
    return data.toLocaleDateString("it-IT", { day: "2-digit", month: "2-digit" });
  }

  const datiGrafico = log
    .map(sessione => {
      const ex = sessione.esercizi?.find(e => e.nome === esercizioSelezionato);
      if (!ex) return null;
      return {
        data: formattaData(sessione.data),
        peso: ex.pesoUsato ? parseFloat(ex.pesoUsato) : null,
        rip: ex.ripetizioniEseguite ? parseFloat(ex.ripetizioniEseguite) : null
      };
    })
    .filter(Boolean);

  const totaleSessioni = log.length;
  const sessioniCompletate = log.filter(s => s.esercizi?.every(e => e.completato)).length;

  return (
    <div>
      <div style={styles.header}>
        <h2 style={styles.titolo}>📈 Progressi Clienti</h2>
      </div>

      <div style={styles.sezione}>
        <label style={styles.label}>Seleziona cliente</label>
        <select style={styles.select} value={clienteSelezionato}
          onChange={e => { setClienteSelezionato(e.target.value); fetchLog(e.target.value); }}>
          <option value="">Scegli un cliente...</option>
          {clienti.map(c => (
            <option key={c.id} value={c.id}>{c.nome} {c.cognome}</option>
          ))}
        </select>
      </div>

      {loading && <p style={styles.loading}>Caricamento dati...</p>}

      {!loading && clienteSelezionato && log.length === 0 && (
        <p style={styles.vuoto}>Nessun allenamento registrato per questo cliente.</p>
      )}

      {!loading && log.length > 0 && (
        <>
          {/* Statistiche rapide */}
          <div style={styles.stats}>
            <div style={styles.statCard}>
              <p style={styles.statNum}>{totaleSessioni}</p>
              <p style={styles.statLabel}>Sessioni totali</p>
            </div>
            <div style={styles.statCard}>
              <p style={styles.statNum}>{sessioniCompletate}</p>
              <p style={styles.statLabel}>Completate al 100%</p>
            </div>
            <div style={styles.statCard}>
              <p style={styles.statNum}>{Math.round((sessioniCompletate / totaleSessioni) * 100)}%</p>
              <p style={styles.statLabel}>Tasso completamento</p>
            </div>
          </div>

          {/* Grafico progressi */}
          {eserciziDisponibili.length > 0 && (
            <div style={styles.sezione}>
              <p style={styles.label}>Seleziona esercizio</p>
              <select style={styles.select} value={esercizioSelezionato}
                onChange={e => setEsercizioSelezionato(e.target.value)}>
                {eserciziDisponibili.map(nome => (
                  <option key={nome} value={nome}>{nome}</option>
                ))}
              </select>

              {datiGrafico.length > 1 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={datiGrafico} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                    <XAxis dataKey="data" tick={{ fontSize: 11, fill: "#aaa" }} />
                    <YAxis tick={{ fontSize: 11, fill: "#aaa" }} />
                    <Tooltip contentStyle={{ background: "#f5f5f5", border: "1px solid #333", color: "#fff" }} />
                    <Legend />
                    <Line type="monotone" dataKey="peso" stroke="#e63946" strokeWidth={2} name="Peso usato (kg)" dot={{ r: 4 }} activeDot={{ r: 6 }} />
                    <Line type="monotone" dataKey="rip" stroke="#4a90d9" strokeWidth={2} name="Ripetizioni" dot={{ r: 4 }} activeDot={{ r: 6 }} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <p style={styles.vuoto}>Servono almeno 2 sessioni per vedere il grafico.</p>
              )}
            </div>
          )}

          {/* Storico sessioni */}
          <div style={styles.sezione}>
            <p style={styles.label}>Storico sessioni</p>
            {[...log].reverse().map((sessione, i) => (
              <div key={i} style={styles.sessioneCard}>
                <div style={styles.sessioneHeader}>
                  <p style={styles.sessioneData}>
                    {sessione.data ? sessione.data.toLocaleDateString("it-IT", { weekday: "long", day: "2-digit", month: "long" }) : "Data N/D"}
                  </p>
                  <p style={styles.sessioneGiorno}>{sessione.giorno}</p>
                </div>
                {sessione.pesoCorporeo && (
                  <p style={styles.pesoCorporeo}>⚖️ Peso corporeo: {sessione.pesoCorporeo} kg</p>
                )}
                <div style={styles.eserciziList}>
                  {sessione.esercizi?.map((ex, j) => (
                    <div key={j} style={{ ...styles.exRow, ...(ex.completato ? styles.exCompletato : styles.exNonCompletato) }}>
                      <span style={styles.exCheck}>{ex.completato ? "✓" : "✗"}</span>
                      <span style={styles.exNome}>{ex.nome}</span>
                      {ex.pesoUsato && <span style={styles.exDato}>{ex.pesoUsato}kg</span>}
                      {ex.ripetizioniEseguite && <span style={styles.exDato}>{ex.ripetizioniEseguite} rip</span>}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

const styles = {
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" },
  titolo: { color: "#1a1a1a", fontSize: "1.6rem", fontWeight: "800", margin: 0 },
  sezione: { background: "#e8f4fd", borderRadius: "12px", padding: "1.5rem", marginBottom: "1.5rem", border: "1px solid #b3d9f5" },
  label: { color: "#2e86c1", fontSize: "0.85rem", marginBottom: "0.8rem", display: "block", fontWeight: "600" },
  select: { width: "100%", padding: "0.8rem", borderRadius: "8px", border: "1px solid #85c1e9", background: "#fff", color: "#1a1a2e", fontSize: "0.95rem", marginBottom: "1rem" },
  loading: { color: "#aaa", textAlign: "center", padding: "2rem" },
  vuoto: { color: "#555", textAlign: "center", padding: "2rem" },
  stats: { display: "flex", gap: "1rem", marginBottom: "1.5rem", flexWrap: "wrap" },
  statCard: { flex: 1, minWidth: "120px", background: "#e8f4fd", borderRadius: "12px", padding: "1.2rem", textAlign: "center", border: "1px solid #b3d9f5" },
  statNum: { color: "#2e86c1", fontSize: "2rem", fontWeight: "800", margin: 0 },
  statLabel: { color: "#5d8aa8", fontSize: "0.8rem", marginTop: "0.3rem" },
  sessioneCard: { background: "#fff", borderRadius: "10px", padding: "1rem", marginBottom: "0.8rem", border: "1px solid #b3d9f5" },
  sessioneHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" },
  sessioneData: { color: "#1a5276", fontWeight: "700", fontSize: "0.85rem", margin: 0, textTransform: "capitalize" },
  sessioneGiorno: { color: "#2e86c1", fontSize: "0.8rem", fontWeight: "700" },
  pesoCorporeo: { color: "#5d8aa8", fontSize: "0.82rem", marginBottom: "0.5rem" },
  eserciziList: { display: "flex", flexDirection: "column", gap: "0.3rem" },
  exRow: { display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.4rem 0.6rem", borderRadius: "6px", fontSize: "0.82rem" },
  exCompletato: { background: "#0d1f0d" },
  exNonCompletato: { background: "#1f0d0d" },
  exCheck: { fontWeight: "800", fontSize: "0.85rem", width: "16px" },
  exNome: { flex: 1, color: "#ccc", textTransform: "capitalize" },
  exDato: { color: "#aaa", background: "#222", padding: "0.1rem 0.4rem", borderRadius: "4px", fontSize: "0.78rem" }
};