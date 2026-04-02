import { useState, useEffect } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../firebase";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

export default function StoricoCliente({ clienteId }) {
  const [log, setLog] = useState([]);
  const [loading, setLoading] = useState(true);
  const [esercizioSelezionato, setEsercizioSelezionato] = useState("");
  const [eserciziDisponibili, setEserciziDisponibili] = useState([]);
  const [aperte, setAperte] = useState({});

  useEffect(() => {
    async function fetchLog() {
      const snap = await getDocs(
        query(collection(db, "log_allenamenti"), where("clienteId", "==", clienteId))
      );
      const data = snap.docs
        .map(d => ({ id: d.id, ...d.data(), data: d.data().data?.toDate() }))
        .sort((a, b) => a.data - b.data);
      setLog(data);

      const nomi = new Set();
      data.forEach(sessione => sessione.esercizi?.forEach(ex => nomi.add(ex.nome)));
      setEserciziDisponibili([...nomi]);
      if (nomi.size > 0) setEsercizioSelezionato([...nomi][0]);
      setLoading(false);
    }
    fetchLog();
  }, [clienteId]);

  function formattaData(data) {
    if (!data) return "";
    return data.toLocaleDateString("it-IT", { day: "2-digit", month: "2-digit" });
  }

  function toggleAperta(id) {
    setAperte(prev => ({ ...prev, [id]: !prev[id] }));
  }

  const datiGrafico = log
    .map(sessione => {
      const ex = sessione.esercizi?.find(e => e.nome === esercizioSelezionato);
      if (!ex) return null;
      // Supporta sia vecchio formato (pesoUsato diretto) che nuovo (array serie)
      const pesoUsato = ex.pesoUsato ?? ex.serie?.[0]?.pesoUsato ?? null;
      const ripEseguite = ex.ripetizioniEseguite ?? ex.serie?.[0]?.ripetizioniEseguite ?? null;
      return {
        data: formattaData(sessione.data),
        peso: pesoUsato ? parseFloat(pesoUsato) : null,
        rip: ripEseguite ? parseFloat(ripEseguite) : null
      };
    })
    .filter(Boolean);

  if (loading) return <p style={styles.loading}>Caricamento storico...</p>;
  if (log.length === 0) return <p style={styles.vuoto}>Nessun allenamento registrato ancora.</p>;

  return (
    <div>
      {/* GRAFICO SOPRA */}
      {eserciziDisponibili.length > 0 && (
        <div style={styles.graficoBox}>
          <p style={styles.titoloSezione}>📈 Progressi per esercizio</p>
          <select style={styles.select} value={esercizioSelezionato}
            onChange={e => setEsercizioSelezionato(e.target.value)}>
            {eserciziDisponibili.map(nome => (
              <option key={nome} value={nome}>{nome}</option>
            ))}
          </select>
          {datiGrafico.length > 1 ? (
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={datiGrafico} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                <XAxis dataKey="data" tick={{ fontSize: 11, fill: "#888" }} />
                <YAxis tick={{ fontSize: 11, fill: "#888" }} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="peso" stroke="#e63946" strokeWidth={2} name="Peso (kg)" dot={{ r: 4 }} activeDot={{ r: 6 }} />
                <Line type="monotone" dataKey="rip" stroke="#4a90d9" strokeWidth={2} name="Ripetizioni" dot={{ r: 4 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <p style={styles.vuoto}>Servono almeno 2 sessioni per vedere il grafico.</p>
          )}
        </div>
      )}

      {/* STORICO SOTTO */}
      <p style={{ ...styles.titoloSezione, marginTop: "1.5rem" }}>📅 Storico allenamenti</p>
      {[...log].reverse().map((sessione, i) => {
        const aperta = aperte[sessione.id] || false;
        return (
          <div key={i} style={styles.sessioneCard}>
            {/* Header cliccabile */}
            <div style={styles.sessioneHeader} onClick={() => toggleAperta(sessione.id)}>
              <div>
                <p style={styles.sessioneData}>
                  {sessione.data
                    ? sessione.data.toLocaleDateString("it-IT", { weekday: "long", day: "2-digit", month: "long" })
                    : "Data N/D"}
                </p>
                {sessione.pesoCorporeo && (
                  <p style={styles.pesoCorporeo}>⚖️ {sessione.pesoCorporeo} kg</p>
                )}
              </div>
              <div style={styles.headerDestra}>
                <span style={styles.sessioneGiorno}>{sessione.giorno}</span>
                <span style={styles.toggleIcon}>{aperta ? "▲" : "▼"}</span>
              </div>
            </div>

            {/* Contenuto espandibile */}
            {aperta && (
              <div style={styles.eserciziList}>
                {sessione.esercizi?.map((ex, j) => (
                  <div key={j} style={{ ...styles.exRow, ...(ex.completato ? styles.exCompletato : styles.exNonCompletato) }}>
                    <span style={styles.exCheck}>{ex.completato ? "✓" : "✗"}</span>
                    <span style={styles.exNome}>{ex.nome}</span>
                    {/* Supporta vecchio formato e nuovo formato con serie */}
                    {ex.serie ? (
                      <span style={styles.exDato}>{ex.serie.length} serie</span>
                    ) : (
                      <>
                        {ex.pesoUsato && <span style={styles.exDato}>{ex.pesoUsato}kg</span>}
                        {ex.ripetizioniEseguite && <span style={styles.exDato}>{ex.ripetizioniEseguite} rip</span>}
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

const styles = {
  loading: { color: "#888", textAlign: "center", padding: "2rem" },
  vuoto: { color: "#888", textAlign: "center", padding: "1rem", fontSize: "0.9rem" },
  titoloSezione: { color: "#111", fontWeight: "800", fontSize: "1rem", marginBottom: "1rem" },
  graficoBox: { background: "#fff", borderRadius: "12px", padding: "1.2rem", marginBottom: "1rem", border: "1px solid #eee", boxShadow: "0 2px 8px rgba(0,0,0,0.05)" },
  select: { width: "100%", padding: "0.7rem", borderRadius: "8px", border: "1px solid #ddd", background: "#f5f5f5", color: "#111", fontSize: "0.9rem", marginBottom: "1rem" },
  sessioneCard: { background: "#fff", borderRadius: "12px", padding: "1rem", marginBottom: "0.8rem", border: "1px solid #eee", boxShadow: "0 2px 8px rgba(0,0,0,0.05)" },
  sessioneHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" },
  sessioneData: { color: "#111", fontWeight: "700", fontSize: "0.9rem", margin: 0, textTransform: "capitalize" },
  pesoCorporeo: { color: "#666", fontSize: "0.78rem", margin: "0.2rem 0 0 0" },
  headerDestra: { display: "flex", alignItems: "center", gap: "0.6rem", flexShrink: 0 },
  sessioneGiorno: { color: "#e63946", fontSize: "0.8rem", fontWeight: "700" },
  toggleIcon: { fontSize: "0.75rem", color: "#999", fontWeight: "700" },
  eserciziList: { display: "flex", flexDirection: "column", gap: "0.3rem", marginTop: "0.8rem", borderTop: "1px solid #f0f0f0", paddingTop: "0.8rem" },
  exRow: { display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.4rem 0.6rem", borderRadius: "6px", fontSize: "0.82rem" },
  exCompletato: { background: "#f0faf0" },
  exNonCompletato: { background: "#fff5f5" },
  exCheck: { fontWeight: "800", fontSize: "0.85rem", width: "16px" },
  exNome: { flex: 1, color: "#333", textTransform: "capitalize" },
  exDato: { color: "#666", background: "#f0f0f0", padding: "0.1rem 0.4rem", borderRadius: "4px", fontSize: "0.78rem" },
};