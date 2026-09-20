"""
videre_engine.py — el motor entero (Foundry + Ontología + AIP acotado),
como funciones importables desde FastAPI, con MongoDB para lo poco que se
persiste (nunca datos de fila — ver GARANTÍA DE PRIVACIDAD abajo).

Equivalente Palantir → dónde vive acá:
  FOUNDRY (integración)      → profile_table, find_candidate_matches, build_ontology
  MOTOR ML (decide sin LLM)  → resolver_identidad (motor_ml.py), umbral algorítmico
  AIP (acotado a 3 usos)     → onboarding_pregunta, chat_responder
  GOBERNANZA                 → allowed_columns, get_permisos
  APOLLO (despliegue)        → no es código, es infraestructura de hosting — no vive acá

GARANTÍA DE PRIVACIDAD: las colecciones de Mongo que toca este archivo
(`decisiones`, `historial`, `permisos`, `uso`) solo guardan METADATA del
modelo — nombres de columna, tipos, decisiones de fusión como booleano,
contadores de uso — escaladas siempre por `workspace_id`, nunca filas de
datos reales de un cliente. Los datos de fila viven en memoria durante un
pedido HTTP puntual y se devuelven, nunca se guardan.
"""
from __future__ import annotations
import re
import json
from datetime import datetime, timezone
from difflib import SequenceMatcher

try:
    from rapidfuzz import fuzz
    def texto_similar(a: str, b: str) -> float:
        return fuzz.token_sort_ratio(a or "", b or "") / 100.0
except ImportError:
    def texto_similar(a: str, b: str) -> float:
        return SequenceMatcher(None, (a or "").lower(), (b or "").lower()).ratio()

UMBRAL_ALTA = 0.88
UMBRAL_BAJA = 0.55
LIMITE_DIARIO_CHAT = 40
MODEL = "claude-sonnet-4-6"


# ---------------------------------------------------------------------
# 1. PERFILADO (Foundry)
# ---------------------------------------------------------------------
def inferir_tipo(valores: list[str]) -> str:
    vals = [v for v in valores if v not in ("", None)]
    if not vals:
        return "vacío"
    if all(re.match(r"^[^@]+@[^@]+\.[^@]+$", v) for v in vals):
        return "email"
    if all(re.match(r"^\d{4}-\d{2}-\d{2}", v) for v in vals):
        return "fecha"
    if all(re.match(r"^\d{8,13}$", v) for v in vals):
        return "teléfono"
    if all(re.match(r"^-?\d+(\.\d+)?$", v) for v in vals):
        return "número"
    return "texto"


def perfilar_tabla(nombre: str, cols: list[str], rows: list[list[str]]) -> dict:
    perfil_cols = []
    for i, col in enumerate(cols):
        valores = [str(r[i]) if i < len(r) else "" for r in rows]
        distintos = set(valores)
        perfil_cols.append({
            "name": col, "type": inferir_tipo(valores),
            "distinctCount": len(distintos), "total": len(rows),
            "isKeyCandidate": len(distintos) == len(rows) and len(rows) > 0,
        })
    return {"name": nombre, "cols": cols, "rows": rows, "profiled": perfil_cols}


def perfilar_tablas(tablas_crudas: dict) -> dict:
    """tablas_crudas: {nombre: {cols:[...], rows:[[...]]}} → perfilado."""
    return {n: perfilar_tabla(n, t["cols"], t["rows"]) for n, t in tablas_crudas.items()}


# ---------------------------------------------------------------------
# 2. COINCIDENCIAS ENTRE TABLAS
# ---------------------------------------------------------------------
def overlap_ratio(a: list[str], b: list[str]) -> float:
    sa, sb = {v for v in a if v != ""}, {v for v in b if v != ""}
    if not sa or not sb:
        return 0.0
    return len(sa & sb) / min(len(sa), len(sb))


def encontrar_coincidencias(tablas: dict) -> list[dict]:
    nombres = list(tablas.keys())
    candidatos = []
    for i in range(len(nombres)):
        for j in range(i + 1, len(nombres)):
            A, B = tablas[nombres[i]], tablas[nombres[j]]
            for ia, colA in enumerate(A["profiled"]):
                for ib, colB in enumerate(B["profiled"]):
                    if colA["type"] != colB["type"] or colA["type"] in ("número", "vacío"):
                        continue
                    va = [str(r[ia]) if ia < len(r) else "" for r in A["rows"]]
                    vb = [str(r[ib]) if ib < len(r) else "" for r in B["rows"]]
                    ratio = overlap_ratio(va, vb)
                    if ratio >= 0.25:
                        candidatos.append({
                            "tableA": nombres[i], "colA": colA["name"],
                            "tableB": nombres[j], "colB": colB["name"],
                            "type": colA["type"], "ratio": ratio,
                            "sampleA": list(dict.fromkeys(va))[:5],
                            "sampleB": list(dict.fromkeys(vb))[:5],
                        })
    return sorted(candidatos, key=lambda c: -c["ratio"])


def match_key(m: dict) -> str:
    return "::".join(sorted([f"{m['tableA']}.{m['colA']}", f"{m['tableB']}.{m['colB']}"]))


# ---------------------------------------------------------------------
# 3. RESOLUCIÓN — algoritmo primero, LLM solo si es ambiguo. Se guarda
#    (Mongo) SOLO la decisión booleana + confianza, nunca texto libre
#    que pueda citar datos reales.
# ---------------------------------------------------------------------
async def resolver_coincidencia(db, workspace_id: str, match: dict, anthropic_client) -> dict:
    key = match_key(match)
    guardado = await db.decisiones.find_one({"workspace_id": workspace_id, "key": key})
    if guardado:
        return {"fromMemory": True, "merge": guardado["merge"], "confianza": guardado["confianza"]}

    scores = [texto_similar(a, b) for a, b in zip(match["sampleA"], match["sampleB"])]
    promedio = sum(scores) / len(scores) if scores else 0.0

    if match["ratio"] >= UMBRAL_ALTA or promedio >= UMBRAL_ALTA:
        merge, confianza = True, "alta"
    elif match["ratio"] <= UMBRAL_BAJA and promedio <= UMBRAL_BAJA:
        merge, confianza = False, "alta"
    else:
        merge, confianza = await preguntar_llm_si_misma_entidad(match, anthropic_client)

    await db.decisiones.update_one(
        {"workspace_id": workspace_id, "key": key},
        {"$set": {"merge": merge, "confianza": confianza, "decidido": datetime.now(timezone.utc).isoformat()}},
        upsert=True,
    )
    return {"fromMemory": False, "merge": merge, "confianza": confianza}


async def preguntar_llm_si_misma_entidad(match: dict, anthropic_client) -> tuple[bool, str]:
    prompt = f"""Dos columnas de tablas distintas de un mismo negocio comparten
{round(match['ratio']*100)}% de valores. Tipo: {match['type']}.
¿Probablemente representan la misma entidad del mundo real (ej. la misma persona
en dos sistemas) o son cosas distintas que casualmente comparten datos?
Respondé SOLO JSON: {{"misma_entidad": true|false, "confianza": "alta"|"media"|"baja"}}"""
    resp = anthropic_client.messages.create(model=MODEL, max_tokens=150, messages=[{"role": "user", "content": prompt}])
    try:
        r = json.loads(re.sub(r"```json|```", "", resp.content[0].text.strip()))
        return r["misma_entidad"], r["confianza"]
    except Exception:
        return True, "baja"


async def confirmar_coincidencia(db, workspace_id: str, match: dict, merge: bool):
    await db.decisiones.update_one(
        {"workspace_id": workspace_id, "key": match_key(match)},
        {"$set": {"merge": merge, "confianza": "alta", "manual": True, "decidido": datetime.now(timezone.utc).isoformat()}},
        upsert=True,
    )


# ---------------------------------------------------------------------
# 4. CONSTRUCCIÓN DE LA ONTOLOGÍA
# ---------------------------------------------------------------------
def _prop_canonica(col: str, tipo: str) -> str:
    c = col.lower()
    if tipo == "email":
        return "email"
    if "nombre" in c:
        return "nombre"
    if tipo == "teléfono":
        return "teléfono"
    if any(k in c for k in ("fecha", "alta", "registro")):
        return "fecha_alta"
    if any(k in c for k in ("monto", "importe")):
        return "monto"
    if "estado" in c:
        return "estado"
    if "id" in c:
        return "id"
    return col


def _nombre_objeto(tablas: list[str]) -> str:
    j = " ".join(tablas).lower()
    if "cliente" in j or "usuario" in j:
        return "Cliente"
    if "pedido" in j:
        return "Pedido"
    return tablas[0][0].upper() + tablas[0][1:]


def construir_ontologia(tablas: dict, resueltas: list[dict]) -> dict:
    nombres = list(tablas.keys())
    parent = {n: n for n in nombres}

    def find(x):
        while parent[x] != x:
            x = parent[x]
        return x

    def union(a, b):
        parent[find(a)] = find(b)

    links = []
    for r in resueltas:
        if r["merge"]:
            union(r["match"]["tableA"], r["match"]["tableB"])
        else:
            links.append({"from": r["match"]["tableA"], "to": r["match"]["tableB"], "via": r["match"]["colA"]})

    grupos: dict[str, list[str]] = {}
    for n in nombres:
        grupos.setdefault(find(n), []).append(n)

    objetos = []
    for miembros in grupos.values():
        vistos, props = set(), []
        for tname in miembros:
            for c in tablas[tname]["profiled"]:
                p = _prop_canonica(c["name"], c["type"])
                if p not in vistos:
                    vistos.add(p)
                    props.append({"name": p, "source": f"{tname}.{c['name']}", "type": c["type"]})
        objetos.append({"name": _nombre_objeto(miembros), "sourceTables": miembros, "properties": props})

    return {"objects": objetos, "links": links}


def check_consistency(tablas: dict, ontologia: dict) -> list[str]:
    warnings = []
    for obj in ontologia["objects"]:
        if len(obj["sourceTables"]) < 2:
            continue
        email_col = {}
        for t in obj["sourceTables"]:
            for c in tablas[t]["profiled"]:
                if c["type"] == "email":
                    email_col[t] = tablas[t]["cols"].index(c["name"])
                    break
        if len(email_col) < 2:
            continue
        name_cols = {t: [tablas[t]["cols"].index(c["name"]) for c in tablas[t]["profiled"] if "nombre" in c["name"].lower()]
                     for t in obj["sourceTables"]}
        keys = set()
        for t, idx in email_col.items():
            keys |= {r[idx] for r in tablas[t]["rows"]}
        for kv in keys:
            vistos = set()
            for t, idx in email_col.items():
                for r in tablas[t]["rows"]:
                    if r[idx] == kv:
                        for ni in name_cols.get(t, []):
                            v = (r[ni] or "").strip().lower()
                            if v:
                                vistos.add(v)
            if len(vistos) > 1:
                warnings.append(f"'{obj['name']}': la clave '{kv}' aparece con nombres distintos ({', '.join(sorted(vistos))}).")
    return warnings


async def guardar_version(db, workspace_id: str, ontologia: dict, warnings: list[str]) -> int:
    ultima = await db.historial.find_one({"workspace_id": workspace_id}, sort=[("version", -1)])
    version = (ultima["version"] if ultima else 0) + 1
    await db.historial.insert_one({
        "workspace_id": workspace_id, "version": version,
        "fecha": datetime.now(timezone.utc).isoformat(),
        "objectNames": [o["name"] for o in ontologia["objects"]],
        "warnings": warnings,
    })
    return version


# ---------------------------------------------------------------------
# 5. GOBERNANZA
# ---------------------------------------------------------------------
PERMISOS_DEFAULT = {"dueño": {"*": "*"}, "vendedor": {"*": ["nombre", "email", "estado", "monto"]}}


async def get_permisos(db, workspace_id: str) -> dict:
    doc = await db.permisos.find_one({"workspace_id": workspace_id})
    if doc:
        return doc["roles"]
    await db.permisos.insert_one({"workspace_id": workspace_id, "roles": PERMISOS_DEFAULT})
    return PERMISOS_DEFAULT


def allowed_columns(rol: str, obj_name: str, all_cols: list[str], permisos: dict) -> list[str]:
    rp = permisos.get(rol)
    if rp is None:
        return []
    op = rp.get(obj_name, rp.get("*"))
    if op == "*":
        return all_cols
    if not op:
        return []
    return [c for c in all_cols if c in op]


# ---------------------------------------------------------------------
# 6. AIP ACOTADO — onboarding + chat (las únicas dos cosas de lenguaje
#    natural real en todo el motor).
# ---------------------------------------------------------------------
def onboarding_pregunta(anthropic_client, historial: list[dict]) -> dict:
    system = """Sos el asistente de onboarding de VIDERE, para dueños de pymes
que están por conectar los datos de su negocio. Entendé, con preguntas
conversacionales (no un formulario), qué tipo de negocio es, qué datos
suele tener, y qué problema quiere resolver. Repreguntá las veces que
haga falta. Cuando ya tengas contexto suficiente, decilo y pedile que
suba sus datos. Respondé SOLO JSON:
{"mensaje": "tu próxima pregunta o cierre", "listo_para_datos": true|false}"""
    resp = anthropic_client.messages.create(model=MODEL, max_tokens=300, system=system, messages=historial)
    try:
        return json.loads(re.sub(r"```json|```", "", resp.content[0].text.strip()))
    except Exception:
        return {"mensaje": resp.content[0].text.strip(), "listo_para_datos": False}


async def chat_responder(db, workspace_id: str, session_id: str, rol: str, pregunta: str,
                          datos: dict, anthropic_client) -> str:
    hoy = datetime.now(timezone.utc).date().isoformat()
    uso_doc = await db.uso.find_one({"workspace_id": workspace_id, "session_id": session_id, "fecha": hoy})
    usados = uso_doc["count"] if uso_doc else 0
    if usados >= LIMITE_DIARIO_CHAT:
        return "Llegaste al límite de preguntas de hoy. Probá de nuevo mañana."

    permisos = await get_permisos(db, workspace_id)
    filtrado = {}
    for obj_name, rows in (datos or {}).items():
        cols = list(rows[0].keys()) if rows else []
        visibles = allowed_columns(rol, obj_name, cols, permisos)
        filtrado[obj_name] = [{c: r.get(c) for c in visibles} for r in rows]

    schema = "\n".join(f"- {n}: {len(r)} filas, columnas: {', '.join(r[0].keys()) if r else '(ninguna)'}"
                       for n, r in filtrado.items())
    prompt = f"""Sos el asistente de datos de un negocio chico. SOLO podés
responder preguntas sobre estos datos:
{schema}

Si la pregunta NO es sobre estos datos, respondé "en_alcance": false.
Si SÍ es sobre estos datos, escribí código Python (pandas ya importado
como pd) que calcule la respuesta usando las variables ya cargadas (una
por cada tabla de arriba, con ese mismo nombre en minúsculas), dejando
el resultado en `resultado`. Sin print, sin imports, sin input().

Pregunta: "{pregunta}"

Respondé SOLO JSON: {{"en_alcance": true|false, "motivo_si_no": "...", "code": "..."}}"""

    await db.uso.update_one(
        {"workspace_id": workspace_id, "session_id": session_id, "fecha": hoy},
        {"$inc": {"count": 1}}, upsert=True,
    )

    resp = anthropic_client.messages.create(model=MODEL, max_tokens=300, messages=[{"role": "user", "content": prompt}])
    try:
        r = json.loads(re.sub(r"```json|```", "", resp.content[0].text.strip()))
    except Exception:
        return "No pude interpretar eso, ¿podés reformular?"

    if not r.get("en_alcance"):
        return f"No puedo ayudarte con eso — solo respondo sobre los datos de tu negocio. ({r.get('motivo_si_no','')})"

    import pandas as pd
    local_vars = {n: pd.DataFrame(rows) for n, rows in filtrado.items()}
    try:
        exec(r["code"], {"pd": pd}, local_vars)
        resultado = local_vars.get("resultado", "No pude calcular un resultado para eso.")
    except Exception as e:
        resultado = f"No pude calcularlo automáticamente ({e})."
    return str(resultado)
