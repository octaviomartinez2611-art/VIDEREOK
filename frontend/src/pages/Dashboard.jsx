import { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { AnimatePresence, motion } from 'framer-motion';
import {
  RotateCcw, ArrowRight, ArrowUpRight, Check, Table2, LoaderCircle,
  CircleHelp, ChevronDown, FileCheck2, MessageCircle, X,
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';

const API = `${process.env.REACT_APP_BACKEND_URL}/api/producto`;
const api = (action, payload) => axios.post(`${API}/${action}`, payload, { timeout: 30000 }).then(r => r.data);

const workspaceId = (() => {
  const k = 'videre_workspace';
  let id = localStorage.getItem(k);
  if (!id) { id = crypto.randomUUID(); localStorage.setItem(k, id); }
  return id;
})();
const sessionId = (() => {
  const k = 'videre_session';
  let id = localStorage.getItem(k);
  if (!id) { id = crypto.randomUUID(); localStorage.setItem(k, id); }
  return id;
})();

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// ---------------------------------------------------------------------
// 0. ONBOARDING — la conversación real, primera pantalla
// ---------------------------------------------------------------------
function Onboarding({ onListo }) {
  const [historial, setHistorial] = useState([{ role: 'user', content: 'Hola, quiero conectar los datos de mi negocio.' }]);
  const [mensajes, setMensajes] = useState([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      setBusy(true);
      try {
        const r = await api('onboarding', { historial });
        setMensajes([{ from: 'agente', texto: r.mensaje }]);
      } catch {
        setMensajes([{ from: 'agente', texto: '¿Qué tipo de negocio tenés, y qué datos solés manejar?' }]);
      }
      setBusy(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const enviar = async () => {
    const texto = input.trim();
    if (!texto || busy) return;
    setInput('');
    setMensajes(m => [...m, { from: 'usuario', texto }]);
    const nuevoHistorial = [...historial, { role: 'user', content: texto }];
    setBusy(true);
    try {
      const r = await api('onboarding', { historial: nuevoHistorial });
      setMensajes(m => [...m, { from: 'agente', texto: r.mensaje }]);
      setHistorial([...nuevoHistorial, { role: 'assistant', content: JSON.stringify(r) }]);
      if (r.listo_para_datos) setTimeout(onListo, 1000);
    } catch {
      setMensajes(m => [...m, { from: 'agente', texto: 'No pude procesar eso ahora — probá de nuevo.' }]);
    }
    setBusy(false);
  };

  return (
    <div className="demo-workspace onboarding-panel">
      <div className="demo-panel-heading">
        <div><h3>Contame de tu negocio.</h3><p>Un par de preguntas, y vemos qué datos tiene sentido conectar.</p></div>
      </div>
      <div className="onboarding-chat">
        {mensajes.map((m, i) => (
          <div key={i} className={`onboarding-message ${m.from}`}>{m.texto}</div>
        ))}
        {busy && <div className="onboarding-message agente"><LoaderCircle className="spin" size={14} /></div>}
      </div>
      <div className="demo-panel-footer" style={{ gap: 10 }}>
        <Input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && enviar()}
          placeholder="Escribí acá..." disabled={busy} />
        <Button className="action" onClick={enviar} disabled={busy}>
          {busy ? <LoaderCircle className="spin" size={16} /> : 'Enviar'}
        </Button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------
// 1. CONECTAR — sin datos de ejemplo, solo lo que el usuario suba
// ---------------------------------------------------------------------
function Conectar({ tablasPerfiladas, setTablasPerfiladas, onNext }) {
  const [status, setStatus] = useState('');
  const [sheetUrl, setSheetUrl] = useState('');
  const [showSheet, setShowSheet] = useState(false);

  const fusionar = (r) => setTablasPerfiladas(prev => ({ ...prev, ...r.tablas }));

  const subir = async (e) => {
    const files = [...e.target.files];
    if (!files.length) return;
    setStatus('Subiendo y perfilando...');
    try {
      const archivos = await Promise.all(files.map(async f => ({ nombre: f.name, base64: await fileToBase64(f) })));
      const r = await api('importar', { archivos });
      fusionar(r);
      setStatus(`Listo: ${Object.keys(r.tablas).length} tabla(s) cargada(s).`);
    } catch (err) {
      setStatus(`No se pudo procesar (${err.message}).`);
    }
  };

  const importarSheet = async () => {
    if (!sheetUrl.trim()) return;
    setStatus('Leyendo la hoja...');
    try {
      const r = await api('importar_google_sheet', { url: sheetUrl.trim() });
      fusionar(r);
      setStatus('Hoja importada.');
    } catch (err) {
      setStatus(`No se pudo leer (${err.response?.data?.detail || err.message}).`);
    }
  };

  const totalFilas = Object.values(tablasPerfiladas).reduce((s, t) => s + t.rows.length, 0);

  return (
    <div className="demo-sources">
      <div className="demo-panel-heading">
        <div><h3>Subí los datos de tu negocio.</h3><p>CSV o Excel — el que tengas: clientes, ventas, lo que sea.</p></div>
      </div>

      <label className="demo-table-card" style={{ display: 'block', textAlign: 'center', padding: 28, cursor: 'pointer', borderStyle: 'dashed' }}>
        📎 Arrastrá o hacé click para subir tus archivos (CSV / Excel)
        <input type="file" accept=".csv,.xlsx,.xls" multiple style={{ display: 'none' }} onChange={subir} />
      </label>

      <button className="table-footer" onClick={() => setShowSheet(s => !s)} style={{ marginTop: 12 }}>
        📄 Conectar Google Sheet (link público)
      </button>
      {showSheet && (
        <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
          <Input value={sheetUrl} onChange={e => setSheetUrl(e.target.value)} placeholder="Pegá el link (compartido como 'cualquiera con el link')" />
          <Button className="action" onClick={importarSheet}>Importar</Button>
        </div>
      )}

      {status && <p style={{ marginTop: 12, fontSize: 13.5, opacity: .8 }}>{status}</p>}

      {Object.keys(tablasPerfiladas).length > 0 && (
        <div className="demo-tables" style={{ marginTop: 20 }}>
          {Object.entries(tablasPerfiladas).map(([nombre, t]) => (
            <div className="demo-table-card" key={nombre}>
              <div className="table-card-heading">
                <span className="table-icon"><Table2 size={17} strokeWidth={1.4} /></span>
                <div><strong>{nombre}</strong><span>{t.rows.length} filas</span></div>
                <Check size={14} />
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="demo-panel-footer">
        <span>{Object.keys(tablasPerfiladas).length} tabla(s) · {totalFilas} registros</span>
        <Button className="action" onClick={onNext} disabled={Object.keys(tablasPerfiladas).length === 0}>
          Conectar estos datos <ArrowRight size={16} />
        </Button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------
// 2. ENTENDER — matching real contra el backend
// ---------------------------------------------------------------------
function Entender({ tablasPerfiladas, resoluciones, setResoluciones, onNext }) {
  const [candidatos, setCandidatos] = useState(null);
  const [estados, setEstados] = useState({});

  useEffect(() => {
    (async () => {
      const r = await api('encontrar_coincidencias', { tablas: tablasPerfiladas });
      setCandidatos(r.candidatos);
      for (const m of r.candidatos) {
        const key = [`${m.tableA}.${m.colA}`, `${m.tableB}.${m.colB}`].sort().join('::');
        try {
          const res = await api('resolver_coincidencia', { workspace_id: workspaceId, match: m });
          setEstados(e => ({ ...e, [key]: res }));
          if (!res.fromMemory || res.confianza) {
            setResoluciones(prev => ({ ...prev, [key]: { match: m, merge: res.merge } }));
          } else {
            setResoluciones(prev => ({ ...prev, [key]: { match: m, merge: res.merge } }));
          }
        } catch {
          setEstados(e => ({ ...e, [key]: { error: true } }));
        }
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tablasPerfiladas]);

  const confirmar = async (m, key, merge) => {
    setResoluciones(prev => ({ ...prev, [key]: { match: m, merge } }));
    setEstados(e => ({ ...e, [key]: { ...e[key], merge, manual: true } }));
    try { await api('confirmar_coincidencia', { workspace_id: workspaceId, match: m, merge }); } catch {}
  };

  if (candidatos === null) return <div className="demo-sources"><p>Buscando coincidencias entre tus tablas...</p></div>;
  if (candidatos.length === 0) return (
    <div className="demo-connect">
      <p>No encontramos nada repetido entre tus tablas — cada una parece independiente.</p>
      <div className="demo-panel-footer"><span /><Button className="action" onClick={onNext}>Crear mi visión del negocio <ArrowRight size={16} /></Button></div>
    </div>
  );

  const todosResueltos = candidatos.every(m => {
    const key = [`${m.tableA}.${m.colA}`, `${m.tableB}.${m.colB}`].sort().join('::');
    return estados[key] !== undefined;
  });

  return (
    <div className="demo-connect">
      <div className="demo-panel-heading"><div><h3>Encontramos lo que tienen en común.</h3></div></div>
      {candidatos.map((m) => {
        const key = [`${m.tableA}.${m.colA}`, `${m.tableB}.${m.colB}`].sort().join('::');
        const est = estados[key];
        return (
          <div key={key} className="connection-evidence" style={{ flexWrap: 'wrap', marginBottom: 14 }}>
            <span>{m.tableA}.<strong>{m.colA}</strong></span>
            <div className="evidence-line"><Check size={15} /></div>
            <span>{m.tableB}.<strong>{m.colB}</strong></span>
            <span className="match-percentage">{Math.round(m.ratio * 100)}% de coincidencia</span>
            {est && (
              <div style={{ width: '100%', marginTop: 10 }}>
                {est.confianza && !est.manual ? (
                  <p style={{ fontSize: 13.5 }}>[{est.confianza}] {est.merge ? 'se tratan como la misma entidad' : 'quedan separadas'}</p>
                ) : (
                  <div className="decision-options">
                    <button className={est.merge ? 'selected' : ''} onClick={() => confirmar(m, key, true)}>
                      <span className="radio-dot" />Sí, es lo mismo{est.merge && <Check size={15} />}
                    </button>
                    <button className={est.merge === false ? 'selected' : ''} onClick={() => confirmar(m, key, false)}>
                      <span className="radio-dot" />No, son distintas{est.merge === false && <Check size={15} />}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
      <div className="demo-panel-footer">
        <span>Tu decisión se recordará.</span>
        <Button className="action" onClick={onNext} disabled={!todosResueltos}>Crear mi visión del negocio <ArrowRight size={16} /></Button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------
// 3. PREGUNTAR — ontología real + preguntas reales + exportar
// ---------------------------------------------------------------------
function Preguntar({ tablasPerfiladas, resoluciones }) {
  const [ontologia, setOntologia] = useState(null);
  const [pregunta, setPregunta] = useState('');
  const [respuesta, setRespuesta] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      const r = await api('construir_ontologia', {
        workspace_id: workspaceId, tablas: tablasPerfiladas, resueltas: Object.values(resoluciones),
      });
      setOntologia(r);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const datosParaBackend = () => {
    if (!ontologia) return {};
    const datos = {};
    ontologia.ontology.objects.forEach(obj => {
      const filas = [];
      obj.sourceTables.forEach(tname => {
        const t = tablasPerfiladas[tname];
        t.rows.forEach(row => {
          const mapeada = {};
          obj.properties.forEach(p => {
            const [srcTable, srcCol] = p.source.split('.');
            if (srcTable === tname) {
              const idx = t.cols.indexOf(srcCol);
              if (idx >= 0) mapeada[p.name] = row[idx];
            }
          });
          if (Object.keys(mapeada).length) filas.push(mapeada);
        });
      });
      datos[obj.name.toLowerCase()] = filas;
    });
    return datos;
  };

  const preguntar = async (q) => {
    const texto = q || pregunta;
    if (!texto.trim()) return;
    setBusy(true); setRespuesta('Pensando...');
    try {
      const r = await api('chat', { workspace_id: workspaceId, session_id: sessionId, rol: 'dueño', pregunta: texto, datos: datosParaBackend() });
      setRespuesta(r.respuesta);
    } catch (err) {
      setRespuesta(`No se pudo calcular (${err.message}).`);
    }
    setBusy(false);
  };

  const exportar = async () => {
    const hojas = datosParaBackend();
    try {
      const r = await api('exportar', { hojas });
      const link = document.createElement('a');
      link.href = `data:application/octet-stream;base64,${r.archivo_base64}`;
      link.download = r.nombre;
      link.click();
    } catch (err) { alert('No se pudo exportar: ' + err.message); }
  };

  if (!ontologia) return <div className="demo-questions"><p>Armando el modelo de tu negocio...</p></div>;

  const primerObjeto = ontologia.ontology.objects[0];
  const sugeridas = primerObjeto ? [`¿Cuántos ${primerObjeto.name.toLowerCase()} únicos hay?`] : [];

  return (
    <div className="demo-questions">
      <div className="demo-panel-heading">
        <div><h3>Ahora sí. Preguntale a tu negocio.</h3>
          <p>{ontologia.ontology.objects.length} objeto(s) armado(s) — versión {ontologia.version}.</p></div>
        <span className="demo-ready-tag"><Check size={13} /> Modelo listo</span>
      </div>

      {ontologia.warnings?.length > 0 && (
        <p className="ambiguity-warning"><CircleHelp size={15} /> {ontologia.warnings[0]}</p>
      )}

      <div className="question-layout">
        <div className="question-list">
          <span className="question-list-label">¿QUÉ QUERÉS SABER?</span>
          {sugeridas.map(q => (
            <button key={q} onClick={() => preguntar(q)}>{q}<ArrowUpRight size={16} /></button>
          ))}
        </div>
        <div className="answer-area">
          <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
            <Input value={pregunta} onChange={e => setPregunta(e.target.value)} onKeyDown={e => e.key === 'Enter' && preguntar()}
              placeholder="Preguntale lo que quieras..." />
            <Button className="action" onClick={() => preguntar()} disabled={busy}>
              {busy ? <LoaderCircle className="spin" size={16} /> : 'Preguntar'}
            </Button>
          </div>
          {respuesta && <div className="answer-value" style={{ fontSize: 18 }}>{respuesta}</div>}
        </div>
      </div>

      <div className="demo-panel-footer">
        <span><Check size={13} /> Las respuestas se calculan de verdad sobre tus datos.</span>
        <Button variant="outline" onClick={exportar}><FileCheck2 size={16} /> Exportar a Excel</Button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------
// CHAT FLOTANTE
// ---------------------------------------------------------------------
function ChatFlotante({ tablasPerfiladas, resoluciones, visible }) {
  const [open, setOpen] = useState(false);
  const [mensajes, setMensajes] = useState([]);
  const [input, setInput] = useState('');
  const boxRef = useRef(null);

  const enviar = async () => {
    const texto = input.trim();
    if (!texto) return;
    setInput('');
    setMensajes(m => [...m, { from: 'user', texto }]);
    try {
      const r = await api('chat', { workspace_id: workspaceId, session_id: sessionId, rol: 'dueño', pregunta: texto, datos: {} });
      setMensajes(m => [...m, { from: 'bot', texto: r.respuesta }]);
    } catch (err) {
      setMensajes(m => [...m, { from: 'bot', texto: `No pude responder (${err.message}).` }]);
    }
    setTimeout(() => boxRef.current?.scrollTo(0, boxRef.current.scrollHeight), 50);
  };

  if (!visible) return null;
  return (
    <>
      <button className="chat-float-button" onClick={() => setOpen(o => !o)} aria-label={open ? 'Cerrar chat' : 'Abrir chat'}>
        {open ? <X size={22} /> : <MessageCircle size={22} />}
      </button>
      {open && (
        <div className="chat-float-panel">
          <div className="chat-float-header">Preguntale a tu negocio</div>
          <div ref={boxRef} className="chat-float-messages">
            {mensajes.map((m, i) => (
              <div key={i} className={`chat-float-message ${m.from}`}>{m.texto}</div>
            ))}
          </div>
          <div className="chat-float-input-row">
            <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && enviar()}
              placeholder="Escribí tu pregunta..." />
            <button className="chat-float-send" onClick={enviar} aria-label="Enviar">↑</button>
          </div>
        </div>
      )}
    </>
  );
}

// ---------------------------------------------------------------------
// DASHBOARD — arma todo el flujo
// ---------------------------------------------------------------------
export function Dashboard() {
  const [fase, setFase] = useState('onboarding'); // onboarding | conectar | entender | preguntar
  const [tablasPerfiladas, setTablasPerfiladas] = useState({});
  const [resoluciones, setResoluciones] = useState({});

  const reiniciar = () => { setFase('onboarding'); setTablasPerfiladas({}); setResoluciones({}); };

  return (
    <div className="demo-section" style={{ minHeight: '100vh', paddingTop: 60 }}>
      <div className="page-width">
        {fase !== 'onboarding' && (
          <div className="demo-toolbar">
            <div className="demo-tabs">
              {['Conectar', 'Entender', 'Preguntar'].map((label, i) => {
                const claves = ['conectar', 'entender', 'preguntar'];
                return (
                  <button key={label} className={fase === claves[i] ? 'active' : ''} disabled={claves.indexOf(fase) < i}
                    onClick={() => claves.indexOf(fase) >= i && setFase(claves[i])}>
                    <span>{claves.indexOf(fase) > i ? <Check size={12} /> : `0${i + 1}`}</span><strong>{label}</strong>
                  </button>
                );
              })}
            </div>
            <button onClick={reiniciar} className="demo-reset"><RotateCcw size={13} /><span>Reiniciar</span></button>
          </div>
        )}

        <div className="demo-stage">
          <AnimatePresence mode="wait">
            <motion.div key={fase} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }} transition={{ duration: .25 }}>
              {fase === 'onboarding' && <Onboarding onListo={() => setFase('conectar')} />}
              {fase === 'conectar' && <Conectar tablasPerfiladas={tablasPerfiladas} setTablasPerfiladas={setTablasPerfiladas} onNext={() => setFase('entender')} />}
              {fase === 'entender' && <Entender tablasPerfiladas={tablasPerfiladas} resoluciones={resoluciones} setResoluciones={setResoluciones} onNext={() => setFase('preguntar')} />}
              {fase === 'preguntar' && <Preguntar tablasPerfiladas={tablasPerfiladas} resoluciones={resoluciones} />}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
      <ChatFlotante tablasPerfiladas={tablasPerfiladas} resoluciones={resoluciones} visible={fase === 'preguntar'} />
    </div>
  );
}
