// videre/index.ts — motor del producto VIDERE como Supabase Edge Function.
// Equivalente TypeScript de backend/videre_engine.py + videre_routes.py,
// corriendo acá porque Supabase no ejecuta Python. Misma garantía de
// privacidad: solo se persiste metadata (decisiones booleanas, versiones,
// permisos, contadores de uso) en las tablas videre_*, nunca filas reales.

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import * as XLSX from "npm:xlsx@0.18.5";

const UMBRAL_ALTA = 0.88;
const UMBRAL_BAJA = 0.55;
const LIMITE_DIARIO_CHAT = 40;
// Vía OpenRouter — gratis. OpenRouter saca modelos :free sin aviso, así
// que probamos esta lista en orden y usamos el primero que responda.
// Si videre_secrets.OPENROUTER_MODEL tiene un valor, se usa ESE fijo
// en vez de la lista (para forzar un modelo puntual sin redeploy).
const MODELOS_GRATIS_FALLBACK = [
  "google/gemini-2.0-flash-exp:free",
  "meta-llama/llama-3.3-70b-instruct:free",
  "meta-llama/llama-3.1-8b-instruct:free",
  "qwen/qwen-2.5-72b-instruct:free",
  "mistralai/mistral-7b-instruct:free",
];

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

const secretsCache: Record<string, string> = {};
async function getSecret(key: string, envFallback?: string): Promise<string> {
  if (secretsCache[key]) return secretsCache[key];
  const { data } = await supabase.from("videre_secrets").select("value").eq("key", key).maybeSingle();
  const value = data?.value ?? (envFallback ? Deno.env.get(envFallback) : null) ?? "";
  secretsCache[key] = value;
  return value;
}

async function llamarModelo(model: string, apiKey: string, messages: { role: string; content: string }[], maxTokens: number) {
  const resp = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      "HTTP-Referer": "https://elaborate-fenglisu-608659.netlify.app",
      "X-Title": "VIDERE",
    },
    body: JSON.stringify({ model, messages, max_tokens: maxTokens }),
  });
  if (!resp.ok) throw new Error(`OpenRouter ${resp.status}: ${await resp.text()}`);
  const data = await resp.json();
  return data.choices?.[0]?.message?.content ?? "";
}

// Llama a OpenRouter (API compatible con OpenAI chat completions). Si hay
// un modelo fijo en videre_secrets.OPENROUTER_MODEL, se usa ese solo; si
// no, prueba la lista de gratis en orden hasta que uno responda.
async function callLLM(messages: { role: string; content: string }[], maxTokens = 300): Promise<string> {
  const apiKey = await getSecret("OPENROUTER_API_KEY");
  const fijo = await getSecret("OPENROUTER_MODEL");
  const candidatos = fijo ? [fijo] : MODELOS_GRATIS_FALLBACK;

  let ultimoError: Error | null = null;
  for (const model of candidatos) {
    try {
      return await llamarModelo(model, apiKey, messages, maxTokens);
    } catch (e) {
      ultimoError = e as Error;
      if (!/404|unavailable/i.test(ultimoError.message)) throw ultimoError;
    }
  }
  throw ultimoError ?? new Error("Ningún modelo gratis disponible.");
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}
function errorResponse(status: number, detail: string) {
  return jsonResponse({ detail }, status);
}

// ---------------------------------------------------------------------
// 1. PERFILADO
// ---------------------------------------------------------------------
type ColProfile = { name: string; type: string; distinctCount: number; total: number; isKeyCandidate: boolean };
type Tabla = { name: string; cols: string[]; rows: unknown[][]; profiled: ColProfile[] };

function inferirTipo(valores: string[]): string {
  const vals = valores.filter((v) => v !== "" && v !== null && v !== undefined);
  if (vals.length === 0) return "vacío";
  if (vals.every((v) => /^[^@]+@[^@]+\.[^@]+$/.test(v))) return "email";
  if (vals.every((v) => /^\d{4}-\d{2}-\d{2}/.test(v))) return "fecha";
  if (vals.every((v) => /^\d{8,13}$/.test(v))) return "teléfono";
  if (vals.every((v) => /^-?\d+(\.\d+)?$/.test(v))) return "número";
  return "texto";
}

function perfilarTabla(nombre: string, cols: string[], rows: unknown[][]): Tabla {
  const profiled: ColProfile[] = cols.map((col, i) => {
    const valores = rows.map((r) => (r[i] !== undefined && r[i] !== null ? String(r[i]) : ""));
    const distintos = new Set(valores);
    return {
      name: col, type: inferirTipo(valores),
      distinctCount: distintos.size, total: rows.length,
      isKeyCandidate: distintos.size === rows.length && rows.length > 0,
    };
  });
  return { name: nombre, cols, rows, profiled };
}

function perfilarTablas(tablasCrudas: Record<string, { cols: string[]; rows: unknown[][] }>): Record<string, Tabla> {
  const out: Record<string, Tabla> = {};
  for (const [n, t] of Object.entries(tablasCrudas)) out[n] = perfilarTabla(n, t.cols, t.rows);
  return out;
}

// ---------------------------------------------------------------------
// 2. COINCIDENCIAS ENTRE TABLAS
// ---------------------------------------------------------------------
type Candidato = {
  tableA: string; colA: string; tableB: string; colB: string;
  type: string; ratio: number; sampleA: string[]; sampleB: string[];
};

function overlapRatio(a: string[], b: string[]): number {
  const sa = new Set(a.filter((v) => v !== ""));
  const sb = new Set(b.filter((v) => v !== ""));
  if (sa.size === 0 || sb.size === 0) return 0;
  let inter = 0;
  for (const v of sa) if (sb.has(v)) inter++;
  return inter / Math.min(sa.size, sb.size);
}

function encontrarCoincidencias(tablas: Record<string, Tabla>): Candidato[] {
  const nombres = Object.keys(tablas);
  const candidatos: Candidato[] = [];
  for (let i = 0; i < nombres.length; i++) {
    for (let j = i + 1; j < nombres.length; j++) {
      const A = tablas[nombres[i]], B = tablas[nombres[j]];
      for (const colA of A.profiled) {
        const ia = A.cols.indexOf(colA.name);
        for (const colB of B.profiled) {
          const ib = B.cols.indexOf(colB.name);
          if (colA.type !== colB.type || colA.type === "número" || colA.type === "vacío") continue;
          const va = A.rows.map((r) => (r[ia] !== undefined ? String(r[ia]) : ""));
          const vb = B.rows.map((r) => (r[ib] !== undefined ? String(r[ib]) : ""));
          const ratio = overlapRatio(va, vb);
          if (ratio >= 0.25) {
            candidatos.push({
              tableA: nombres[i], colA: colA.name, tableB: nombres[j], colB: colB.name,
              type: colA.type, ratio,
              sampleA: [...new Set(va)].slice(0, 5),
              sampleB: [...new Set(vb)].slice(0, 5),
            });
          }
        }
      }
    }
  }
  return candidatos.sort((a, b) => b.ratio - a.ratio);
}

function matchKey(m: Candidato): string {
  return [`${m.tableA}.${m.colA}`, `${m.tableB}.${m.colB}`].sort().join("::");
}

function textoSimilar(a: string, b: string): number {
  const norm = (s: string) => (s || "").toLowerCase();
  const bigramas = (s: string) => {
    const out = new Set<string>();
    for (let i = 0; i < s.length - 1; i++) out.add(s.slice(i, i + 2));
    return out;
  };
  const A = bigramas(norm(a)), B = bigramas(norm(b));
  if (A.size === 0 || B.size === 0) return norm(a) === norm(b) ? 1 : 0;
  let inter = 0;
  for (const g of A) if (B.has(g)) inter++;
  return (2 * inter) / (A.size + B.size);
}

// ---------------------------------------------------------------------
// 3. RESOLUCIÓN — algoritmo primero, LLM solo si es ambiguo
// ---------------------------------------------------------------------
async function preguntarLlmSiMismaEntidad(match: Candidato): Promise<{ merge: boolean; confianza: string }> {
  try {
    const prompt = `Dos columnas de tablas distintas de un mismo negocio comparten
${Math.round(match.ratio * 100)}% de valores. Tipo: ${match.type}.
¿Probablemente representan la misma entidad del mundo real (ej. la misma persona
en dos sistemas) o son cosas distintas que casualmente comparten datos?
Respondé SOLO JSON: {"misma_entidad": true|false, "confianza": "alta"|"media"|"baja"}`;
    const raw = await callLLM([{ role: "user", content: prompt }], 150);
    const text = raw.replace(/```json|```/g, "").trim();
    const r = JSON.parse(text);
    return { merge: !!r.misma_entidad, confianza: r.confianza };
  } catch {
    return { merge: true, confianza: "baja" };
  }
}

async function resolverCoincidencia(workspaceId: string, match: Candidato) {
  const key = matchKey(match);
  const { data: guardado } = await supabase.from("videre_decisiones").select("*").eq("workspace_id", workspaceId).eq("key", key).maybeSingle();
  if (guardado) return { fromMemory: true, merge: guardado.merge, confianza: guardado.confianza };

  const scores = match.sampleA.map((a, i) => textoSimilar(a, match.sampleB[i] ?? ""));
  const promedio = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;

  let merge: boolean, confianza: string;
  if (match.ratio >= UMBRAL_ALTA || promedio >= UMBRAL_ALTA) {
    merge = true; confianza = "alta";
  } else if (match.ratio <= UMBRAL_BAJA && promedio <= UMBRAL_BAJA) {
    merge = false; confianza = "alta";
  } else {
    const r = await preguntarLlmSiMismaEntidad(match);
    merge = r.merge; confianza = r.confianza;
  }

  await supabase.from("videre_decisiones").upsert({ workspace_id: workspaceId, key, merge, confianza, decidido: new Date().toISOString() });
  return { fromMemory: false, merge, confianza };
}

async function confirmarCoincidencia(workspaceId: string, match: Candidato, merge: boolean) {
  await supabase.from("videre_decisiones").upsert({
    workspace_id: workspaceId, key: matchKey(match), merge, confianza: "alta", manual: true, decidido: new Date().toISOString(),
  });
}

// ---------------------------------------------------------------------
// 4. CONSTRUCCIÓN DE LA ONTOLOGÍA
// ---------------------------------------------------------------------
function propCanonica(col: string, tipo: string): string {
  const c = col.toLowerCase();
  if (tipo === "email") return "email";
  if (c.includes("nombre")) return "nombre";
  if (tipo === "teléfono") return "teléfono";
  if (["fecha", "alta", "registro"].some((k) => c.includes(k))) return "fecha_alta";
  if (["monto", "importe"].some((k) => c.includes(k))) return "monto";
  if (c.includes("estado")) return "estado";
  if (c.includes("id")) return "id";
  return col;
}

function nombreObjeto(tablas: string[]): string {
  const j = tablas.join(" ").toLowerCase();
  if (j.includes("cliente") || j.includes("usuario")) return "Cliente";
  if (j.includes("pedido")) return "Pedido";
  return tablas[0][0].toUpperCase() + tablas[0].slice(1);
}

type Ontologia = { objects: { name: string; sourceTables: string[]; properties: { name: string; source: string; type: string }[] }[]; links: { from: string; to: string; via: string }[] };

function construirOntologia(tablas: Record<string, Tabla>, resueltas: { match: Candidato; merge: boolean }[]): Ontologia {
  const nombres = Object.keys(tablas);
  const parent: Record<string, string> = {};
  for (const n of nombres) parent[n] = n;
  const find = (x: string): string => (parent[x] === x ? x : (parent[x] = find(parent[x])));
  const union = (a: string, b: string) => { parent[find(a)] = find(b); };

  const links: Ontologia["links"] = [];
  for (const r of resueltas) {
    if (r.merge) union(r.match.tableA, r.match.tableB);
    else links.push({ from: r.match.tableA, to: r.match.tableB, via: r.match.colA });
  }

  const grupos: Record<string, string[]> = {};
  for (const n of nombres) (grupos[find(n)] ??= []).push(n);

  const objects = Object.values(grupos).map((miembros) => {
    const vistos = new Set<string>();
    const props: Ontologia["objects"][0]["properties"] = [];
    for (const tname of miembros) {
      for (const c of tablas[tname].profiled) {
        const p = propCanonica(c.name, c.type);
        if (!vistos.has(p)) { vistos.add(p); props.push({ name: p, source: `${tname}.${c.name}`, type: c.type }); }
      }
    }
    return { name: nombreObjeto(miembros), sourceTables: miembros, properties: props };
  });
  return { objects, links };
}

function checkConsistency(tablas: Record<string, Tabla>, ontologia: Ontologia): string[] {
  const warnings: string[] = [];
  for (const obj of ontologia.objects) {
    if (obj.sourceTables.length < 2) continue;
    const emailCol: Record<string, number> = {};
    for (const t of obj.sourceTables) {
      for (const c of tablas[t].profiled) {
        if (c.type === "email") { emailCol[t] = tablas[t].cols.indexOf(c.name); break; }
      }
    }
    if (Object.keys(emailCol).length < 2) continue;
    const nameCols: Record<string, number[]> = {};
    for (const t of obj.sourceTables) {
      nameCols[t] = tablas[t].profiled.filter((c) => c.name.toLowerCase().includes("nombre")).map((c) => tablas[t].cols.indexOf(c.name));
    }
    const keys = new Set<string>();
    for (const [t, idx] of Object.entries(emailCol)) for (const r of tablas[t].rows) keys.add(String(r[idx]));
    for (const kv of keys) {
      const vistos = new Set<string>();
      for (const [t, idx] of Object.entries(emailCol)) {
        for (const r of tablas[t].rows) {
          if (String(r[idx]) === kv) {
            for (const ni of nameCols[t] ?? []) {
              const v = String(r[ni] ?? "").trim().toLowerCase();
              if (v) vistos.add(v);
            }
          }
        }
      }
      if (vistos.size > 1) warnings.push(`'${obj.name}': la clave '${kv}' aparece con nombres distintos (${[...vistos].sort().join(", ")}).`);
    }
  }
  return warnings;
}

async function guardarVersion(workspaceId: string, ontologia: Ontologia, warnings: string[]): Promise<number> {
  const { data: ultima } = await supabase.from("videre_historial").select("version").eq("workspace_id", workspaceId).order("version", { ascending: false }).limit(1).maybeSingle();
  const version = (ultima?.version ?? 0) + 1;
  await supabase.from("videre_historial").insert({
    workspace_id: workspaceId, version, fecha: new Date().toISOString(),
    object_names: ontologia.objects.map((o) => o.name), warnings,
  });
  return version;
}

// ---------------------------------------------------------------------
// 5. GOBERNANZA
// ---------------------------------------------------------------------
const PERMISOS_DEFAULT = { dueño: { "*": "*" }, vendedor: { "*": ["nombre", "email", "estado", "monto"] } };

async function getPermisos(workspaceId: string) {
  const { data } = await supabase.from("videre_permisos").select("roles").eq("workspace_id", workspaceId).maybeSingle();
  if (data) return data.roles;
  await supabase.from("videre_permisos").insert({ workspace_id: workspaceId, roles: PERMISOS_DEFAULT });
  return PERMISOS_DEFAULT;
}

function allowedColumns(rol: string, objName: string, allCols: string[], permisos: Record<string, unknown>): string[] {
  const rp = permisos[rol] as Record<string, unknown> | undefined;
  if (!rp) return [];
  const op = rp[objName] ?? rp["*"];
  if (op === "*") return allCols;
  if (!op) return [];
  return allCols.filter((c) => (op as string[]).includes(c));
}

// ---------------------------------------------------------------------
// 6. AIP ACOTADO — onboarding + chat
// ---------------------------------------------------------------------
async function onboardingPregunta(historial: { role: string; content: string }[]) {
  const system = `Sos el asistente de onboarding de VIDERE, para dueños de pymes
que están por conectar los datos de su negocio. Entendé, con preguntas
conversacionales (no un formulario), qué tipo de negocio es, qué datos
suele tener, y qué problema quiere resolver. Repreguntá las veces que
haga falta. Cuando ya tengas contexto suficiente, decilo y pedile que
suba sus datos. Respondé SOLO JSON:
{"mensaje": "tu próxima pregunta o cierre", "listo_para_datos": true|false}`;
  try {
    const raw = await callLLM([{ role: "system", content: system }, ...historial], 300);
    const text = raw.replace(/```json|```/g, "").trim();
    return JSON.parse(text);
  } catch (e) {
    return { mensaje: `[DEBUG] ${(e as Error).message}`, listo_para_datos: false };
  }
}

async function chatResponder(workspaceId: string, sessionId: string, rol: string, pregunta: string, datos: Record<string, Record<string, unknown>[]>) {
  const hoy = new Date().toISOString().slice(0, 10);
  const { data: usoDoc } = await supabase.from("videre_uso").select("count").eq("workspace_id", workspaceId).eq("session_id", sessionId).eq("fecha", hoy).maybeSingle();
  const usados = usoDoc?.count ?? 0;
  if (usados >= LIMITE_DIARIO_CHAT) return "Llegaste al límite de preguntas de hoy. Probá de nuevo mañana.";

  const permisos = await getPermisos(workspaceId);
  const filtrado: Record<string, Record<string, unknown>[]> = {};
  for (const [objName, rows] of Object.entries(datos || {})) {
    const cols = rows.length ? Object.keys(rows[0]) : [];
    const visibles = allowedColumns(rol, objName, cols, permisos);
    filtrado[objName] = rows.map((r) => Object.fromEntries(visibles.map((c) => [c, r[c]])));
  }

  const schema = Object.entries(filtrado).map(([n, r]) => `- ${n}: ${r.length} filas, columnas: ${r.length ? Object.keys(r[0]).join(", ") : "(ninguna)"}`).join("\n");
  const prompt = `Sos el asistente de datos de un negocio chico. SOLO podés
responder preguntas sobre estos datos:
${schema}

Si la pregunta NO es sobre estos datos, respondé "en_alcance": false.
Si SÍ es sobre estos datos, escribí código JavaScript que calcule la
respuesta usando \`datos\` (objeto con un array de filas por cada tabla
de arriba, mismo nombre en minúsculas), y termine con \`return resultado;\`.
Sin console.log, sin imports.

Pregunta: "${pregunta}"

Respondé SOLO JSON: {"en_alcance": true|false, "motivo_si_no": "...", "code": "..."}`;

  await supabase.from("videre_uso").upsert({ workspace_id: workspaceId, session_id: sessionId, fecha: hoy, count: usados + 1 });

  let r: { en_alcance: boolean; motivo_si_no?: string; code?: string };
  try {
    const raw = await callLLM([{ role: "user", content: prompt }], 300);
    const text = raw.replace(/```json|```/g, "").trim();
    r = JSON.parse(text);
  } catch {
    return "No pude interpretar eso, ¿podés reformular?";
  }

  if (!r.en_alcance) return `No puedo ayudarte con eso — solo respondo sobre los datos de tu negocio. (${r.motivo_si_no ?? ""})`;

  try {
    // deno-lint-ignore no-explicit-any
    const fn = new Function("datos", r.code ?? "return 'No pude calcular un resultado para eso.';");
    const resultado = fn(filtrado);
    return String(resultado);
  } catch (e) {
    return `No pude calcularlo automáticamente (${(e as Error).message}).`;
  }
}

// ---------------------------------------------------------------------
// IMPORTAR / EXPORTAR (SheetJS)
// ---------------------------------------------------------------------
function leerArchivo(nombre: string, contenidoB64: string): Record<string, { cols: string[]; rows: unknown[][] }> {
  const bytes = Uint8Array.from(atob(contenidoB64), (c) => c.charCodeAt(0));
  const wb = XLSX.read(bytes, { type: "array", raw: false });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const matrix = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "", raw: false }) as unknown[][];
  const cols = (matrix[0] ?? []).map((c) => String(c));
  const rows = matrix.slice(1);
  const tablaNombre = nombre.includes(".") ? nombre.slice(0, nombre.lastIndexOf(".")) : nombre;
  return { [tablaNombre]: { cols, rows } };
}

function parseCsvText(text: string): { cols: string[]; rows: unknown[][] } {
  const wb = XLSX.read(text, { type: "string", raw: false });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const matrix = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "", raw: false }) as unknown[][];
  return { cols: (matrix[0] ?? []).map((c) => String(c)), rows: matrix.slice(1) };
}

// ---------------------------------------------------------------------
// ROUTER
// ---------------------------------------------------------------------
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS" } });
  }
  const cors = { "Access-Control-Allow-Origin": "*" };
  try {
    const url = new URL(req.url);
    const parts = url.pathname.split("/").filter(Boolean);
    const action = parts[parts.length - 1];
    const payload = req.method === "POST" ? await req.json() : {};

    let result: unknown;
    switch (action) {
      case "onboarding":
        result = await onboardingPregunta(payload.historial ?? []);
        break;

      case "importar": {
        const tablasCrudas: Record<string, { cols: string[]; rows: unknown[][] }> = {};
        for (const a of payload.archivos ?? []) Object.assign(tablasCrudas, leerArchivo(a.nombre, a.base64));
        result = { tablas: perfilarTablas(tablasCrudas) };
        break;
      }

      case "importar_google_sheet": {
        const m = /\/d\/([a-zA-Z0-9-_]+)/.exec(payload.url ?? "");
        if (!m) return errorResponse(400, "No parece un link válido de Google Sheets.");
        const gidMatch = /gid=([0-9]+)/.exec(payload.url ?? "");
        const gid = gidMatch ? gidMatch[1] : "0";
        const csvUrl = `https://docs.google.com/spreadsheets/d/${m[1]}/export?format=csv&gid=${gid}`;
        const resp = await fetch(csvUrl);
        if (!resp.ok) return errorResponse(400, "No se pudo leer la hoja — ¿está compartida como 'cualquiera con el link'?");
        const text = await resp.text();
        const parsed = parseCsvText(text);
        result = { tablas: perfilarTablas({ google_sheet: parsed }) };
        break;
      }

      case "importar_supabase": {
        const endpoint = `${(payload.url ?? "").replace(/\/$/, "")}/rest/v1/${payload.tabla}?select=*`;
        const resp = await fetch(endpoint, { headers: { apikey: payload.api_key, Authorization: `Bearer ${payload.api_key}` } });
        if (!resp.ok) return errorResponse(400, `Supabase respondió ${resp.status}: ${await resp.text()}`);
        const filas: Record<string, unknown>[] = await resp.json();
        if (!filas.length) return errorResponse(400, "La tabla existe pero no tiene filas, o el nombre está mal escrito.");
        const cols = Object.keys(filas[0]);
        result = { tablas: perfilarTablas({ [payload.tabla]: { cols, rows: filas.map((f) => cols.map((c) => f[c])) } }) };
        break;
      }

      case "perfilar":
        result = { tablas: perfilarTablas(payload.tablas ?? {}) };
        break;

      case "encontrar_coincidencias":
        result = { candidatos: encontrarCoincidencias(payload.tablas ?? {}) };
        break;

      case "resolver_coincidencia":
        result = await resolverCoincidencia(payload.workspace_id, payload.match);
        break;

      case "confirmar_coincidencia":
        await confirmarCoincidencia(payload.workspace_id, payload.match, payload.merge);
        result = { ok: true };
        break;

      case "construir_ontologia": {
        const ontologia = construirOntologia(payload.tablas ?? {}, payload.resueltas ?? []);
        const warnings = checkConsistency(payload.tablas ?? {}, ontologia);
        const version = await guardarVersion(payload.workspace_id, ontologia, warnings);
        result = { ontology: ontologia, warnings, version };
        break;
      }

      case "exportar": {
        const wb = XLSX.utils.book_new();
        for (const [nombre, filas] of Object.entries(payload.hojas ?? {}) as [string, Record<string, unknown>[]][]) {
          const ws = XLSX.utils.json_to_sheet(filas);
          XLSX.utils.book_append_sheet(wb, ws, nombre.slice(0, 31));
        }
        const archivo_base64 = XLSX.write(wb, { type: "base64", bookType: "xlsx" });
        result = { archivo_base64, nombre: "videre_export.xlsx" };
        break;
      }

      case "permisos":
        if (payload.set) {
          await supabase.from("videre_permisos").upsert({ workspace_id: payload.workspace_id, roles: payload.set });
          result = { ok: true };
        } else {
          result = { permisos: await getPermisos(payload.workspace_id) };
        }
        break;

      case "chat":
        result = { respuesta: await chatResponder(payload.workspace_id, payload.session_id, payload.rol, payload.pregunta, payload.datos ?? {}) };
        break;

      default:
        return errorResponse(404, `Acción desconocida: ${action}`);
    }
    return new Response(JSON.stringify(result), { headers: { "Content-Type": "application/json", ...cors } });
  } catch (e) {
    return new Response(JSON.stringify({ detail: (e as Error).message }), { status: 500, headers: { "Content-Type": "application/json", ...cors } });
  }
});
