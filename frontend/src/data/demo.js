export const crm = [
  { id: 'C01', nombre: 'Ana García', email: 'ana@ejemplo.com' },
  { id: 'C02', nombre: 'Lucas Pérez', email: 'lucas@ejemplo.com' },
  { id: 'C03', nombre: 'María López', email: 'maria@ejemplo.com' },
  { id: 'C04', nombre: 'Pedro Ruiz', email: 'pedro@ejemplo.com' },
  { id: 'C05', nombre: 'Lucía Torres', email: 'lucia@ejemplo.com' },
];
export const web = [
  { usuario: 'ana.g', correo: 'ana@ejemplo.com', nombre: 'Ana García' },
  { usuario: 'lucasp', correo: 'lucas@ejemplo.com', nombre: 'Lucas Pérez' },
  { usuario: 'mlopez', correo: 'maria@ejemplo.com', nombre: 'María López' },
  { usuario: 'pedro.r', correo: 'pedro@ejemplo.com', nombre: 'Pedro Rodríguez' },
  { usuario: 'sofia.m', correo: 'sofia@ejemplo.com', nombre: 'Sofía Martínez' },
];
export const orders = [
  { pedido: '#1001', cliente_email: 'ana@ejemplo.com', importe: 45000, fecha: '2026-05-20' },
  { pedido: '#1002', cliente_email: 'lucas@ejemplo.com', importe: 32000, fecha: '2026-02-10' },
  { pedido: '#1003', cliente_email: 'maria@ejemplo.com', importe: 67000, fecha: '2026-05-15' },
  { pedido: '#1004', cliente_email: 'ana@ejemplo.com', importe: 28000, fecha: '2026-05-28' },
  { pedido: '#1005', cliente_email: 'pedro@ejemplo.com', importe: 18000, fecha: '2026-01-20' },
  { pedido: '#1006', cliente_email: 'sofia@ejemplo.com', importe: 51000, fecha: '2026-05-25' },
];
export const questions = [
  '¿Cuántos clientes tengo realmente?',
  '¿Quiénes no compraron en 60 días?',
  '¿Cuánto vendí este mes?',
  '¿Quién es mi mejor cliente?',
];
export const tables = [
  { id: 'crm', name: 'Clientes del CRM', file: 'clientes_crm.csv', columns: ['nombre', 'email'], rows: crm },
  { id: 'web', name: 'Usuarios de la web', file: 'usuarios_web.csv', columns: ['usuario', 'correo'], rows: web },
  { id: 'orders', name: 'Pedidos', file: 'pedidos.csv', columns: ['pedido', 'cliente_email', 'importe'], rows: orders },
];

export function overlaps() {
  const emails = new Set(crm.map(c => c.email.toLowerCase()));
  return web.filter(user => emails.has(user.correo.toLowerCase()));
}

export function buildModel(merge) {
  const model = crm.map(c => ({ ...c, sources: ['CRM'] }));
  web.forEach(w => {
    const match = model.find(c => c.email === w.correo);
    if (match && (match.nombre === w.nombre || merge)) match.sources.push('Web');
    else {
      if (match) match.ambiguous = true;
      model.push({ id: `W-${w.usuario}`, nombre: w.nombre, email: w.correo, sources: ['Web'], ambiguous: Boolean(match) });
    }
  });
  return model;
}

export function answerQuestion(index, model) {
  const money = n => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n);
  if (index === 0) return { value: model.length, unit: 'clientes únicos', text: 'De 10 registros entre tu CRM y tu web, identificamos las personas que representan. Sin contar dos veces a la misma.', source: 'Clientes del CRM + Usuarios de la web', detail: model.map(c => c.nombre).join(' · '), method: 'Contar los registros del modelo después de aplicar tu decisión de unión.' };
  if (index === 1) {
    const cutoff = new Date('2026-06-01T00:00:00Z').getTime() - 60 * 86400000;
    const inactive = model.filter(c => !c.ambiguous && !orders.some(o => o.cliente_email === c.email && new Date(o.fecha).getTime() >= cutoff));
    return { value: inactive.length, unit: 'clientes para volver a conectar', text: 'No registran compras en los últimos 60 días, incluyendo quienes nunca compraron.', source: 'Modelo de clientes + Pedidos · Al 1 jun. 2026', detail: inactive.map(c => c.nombre).join(' · '), method: 'Buscar clientes sin pedidos desde el 2 de abril de 2026. Los pedidos se relacionan por email.' };
  }
  if (index === 2) {
    const monthOrders = orders.filter(o => o.fecha.startsWith('2026-05'));
    return { value: money(monthOrders.reduce((sum, o) => sum + o.importe, 0)), unit: 'vendidos en mayo', text: `El total de tus ${monthOrders.length} pedidos de mayo de 2026. Cada importe se cuenta una sola vez.`, source: 'Pedidos · Moneda de ejemplo: ARS', detail: monthOrders.map(o => `${o.pedido}: ${money(o.importe)}`).join(' · '), method: 'Filtrar pedidos con fecha en mayo de 2026 y sumar la columna importe.' };
  }
  const totals = orders.reduce((acc, o) => ({ ...acc, [o.cliente_email]: (acc[o.cliente_email] || 0) + o.importe }), {});
  const [email, total] = Object.entries(totals).sort((a, b) => b[1] - a[1])[0];
  return { value: model.find(c => c.email === email)?.nombre, unit: `${money(total)} en compras`, text: 'Es la persona con el mayor importe acumulado en los pedidos de ejemplo.', source: 'Modelo de clientes + Pedidos · Histórico de ejemplo', detail: orders.filter(o => o.cliente_email === email).map(o => `${o.pedido}: ${money(o.importe)}`).join(' · '), method: 'Agrupar pedidos por email, sumar importes y elegir el total más alto.' };
}