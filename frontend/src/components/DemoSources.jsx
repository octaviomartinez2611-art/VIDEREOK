import { useState } from 'react';
import { Table2, Check, ArrowRight, LoaderCircle } from 'lucide-react';
import { tables } from '../data/demo';
import { Button } from './ui/button';

export const DemoSources = ({ onConnect, busy }) => {
  const [expanded, setExpanded] = useState({});
  return <div className="demo-sources" data-testid="demo-sources-panel"><div className="demo-panel-heading"><div><h3 data-testid="demo-sources-title">Un negocio. Tres lugares distintos.</h3><p data-testid="demo-sources-description">Estos datos de ejemplo ya están listos. Mirá cómo se conectan.</p></div><span className="demo-local-tag"><span className="status-dot" /> Todo sucede en tu navegador</span></div>
    <div className="demo-tables">{tables.map(table => <div className="demo-table-card" key={table.id} data-testid={`demo-table-${table.id}`}><div className="table-card-heading"><span className="table-icon"><Table2 size={17} strokeWidth={1.4} /></span><div><strong>{table.name}</strong><span>{table.file}</span></div><Check size={14} /></div><div className="table-scroll" tabIndex="0" role="region" aria-label={table.name} data-testid={`table-scroll-${table.id}`}><table><thead><tr>{table.columns.map(col => <th key={col}>{col}</th>)}</tr></thead><tbody>{table.rows.slice(0, expanded[table.id] ? undefined : 3).map((row, i) => <tr key={i}>{table.columns.map(col => <td key={col} className={col.includes('mail') || col === 'correo' ? 'email-cell' : ''}>{row[col]}</td>)}</tr>)}</tbody></table></div><button className="table-footer" data-testid={`table-expand-${table.id}`} onClick={() => setExpanded({ ...expanded, [table.id]: !expanded[table.id] })}>{expanded[table.id] ? 'Mostrar menos' : `Ver los ${table.rows.length} registros`}<span>{expanded[table.id] ? '−' : '+'}</span></button></div>)}</div>
    <div className="demo-panel-footer"><span data-testid="demo-source-count">3 archivos · 16 registros · Un negocio por descubrir</span><Button className="action" onClick={onConnect} disabled={busy} data-testid="demo-connect-button">{busy ? <><LoaderCircle className="spin" size={16} /> Buscando conexiones…</> : <>Conectar estos datos <ArrowRight size={16} /></>}</Button></div>
  </div>;
};