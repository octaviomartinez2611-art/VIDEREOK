#!/usr/bin/env python3
"""
Motor de Machine Learning — el "ordenar todo" real, sin depender de un LLM
para cada decisión.
===========================================================================
Claude queda acotado a DOS tareas únicamente:
  1. Onboarding conversacional (entender el negocio, preguntando como un chat).
  2. Nombrar/interpretar columnas cuando arma el esquema (semántica de texto).

Todo lo que "ordena, conecta y encuentra patrones" en los datos lo hacen
algoritmos de ML de verdad, no un LLM:
  - Resolución de identidad → similitud de texto (rapidfuzz), no LLM por fila.
  - Segmentación de clientes → KMeans (scikit-learn).
  - Detección de anomalías → Isolation Forest (scikit-learn).
  - Relaciones entre productos/eventos → reglas de asociación (Apriori, mlxtend).
  - Tendencia / proyección → regresión simple (scikit-learn).

pip install scikit-learn mlxtend rapidfuzz pandas anthropic --break-system-packages
"""

from __future__ import annotations
import json
import re
from dataclasses import dataclass, field

import numpy as np
import pandas as pd
from sklearn.cluster import KMeans
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler
from sklearn.linear_model import LinearRegression
from mlxtend.frequent_patterns import apriori, association_rules
from mlxtend.preprocessing import TransactionEncoder

try:
    from rapidfuzz import fuzz
    def texto_similar(a: str, b: str) -> float:
        return fuzz.token_sort_ratio(a, b) / 100.0
except ImportError:  # fallback sin dependencia extra si rapidfuzz no está instalado
    from difflib import SequenceMatcher
    def texto_similar(a: str, b: str) -> float:
        return SequenceMatcher(None, a.lower(), b.lower()).ratio()


# ===========================================================================
# 1. RESOLUCIÓN DE IDENTIDAD — algoritmo, no LLM por fila
# ===========================================================================
# Umbrales: por encima de ALTA se fusiona solo. Por debajo de BAJA se descarta
# solo. En el medio (la franja realmente ambigua) es la ÚNICA zona donde vale
# la pena gastar una llamada a un LLM — y ahí sí, una sola vez por decisión,
# nunca por fila.
UMBRAL_ALTA = 0.88
UMBRAL_BAJA = 0.55


@dataclass
class DecisionIdentidad:
    score: float
    decision: str  # "fusionar" | "descartar" | "ambiguo"


def resolver_identidad(nombre_a: str, nombre_b: str, email_a: str = "", email_b: str = "") -> DecisionIdentidad:
    """Decide si dos registros son la misma entidad usando solo similitud de texto.
    El email exacto pesa fuerte (señal casi determinante); el nombre desambigua."""
    score_nombre = texto_similar(nombre_a or "", nombre_b or "")
    score_email = 1.0 if email_a and email_a == email_b else 0.0
    # combinación ponderada: el email idéntico ya es fuerte evidencia por sí solo
    score = max(score_email * 0.75 + score_nombre * 0.25, score_nombre)

    if score >= UMBRAL_ALTA:
        return DecisionIdentidad(score, "fusionar")
    if score <= UMBRAL_BAJA:
        return DecisionIdentidad(score, "descartar")
    return DecisionIdentidad(score, "ambiguo")


def resolver_tabla_completa(df_a: pd.DataFrame, df_b: pd.DataFrame,
                             col_nombre_a: str, col_nombre_b: str,
                             col_email_a: str, col_email_b: str) -> pd.DataFrame:
    """Corre la resolución de identidad sobre TODAS las filas, algorítmicamente.
    Solo devuelve como 'ambiguo' la franja donde de verdad conviene preguntar
    (a un humano o, en última instancia, a un LLM) — el resto queda decidido."""
    filas_a = df_a.to_dict("records")
    filas_b = df_b.to_dict("records")
    resultados = []
    for ra in filas_a:
        for rb in filas_b:
            d = resolver_identidad(
                str(ra.get(col_nombre_a, "")), str(rb.get(col_nombre_b, "")),
                str(ra.get(col_email_a, "")), str(rb.get(col_email_b, "")),
            )
            if d.decision != "descartar" or d.score > 0.3:  # descarta el ruido total
                resultados.append({**ra, **{f"b_{k}": v for k, v in rb.items()},
                                    "score": d.score, "decision": d.decision})
    return pd.DataFrame(resultados)


# ===========================================================================
# 2. SEGMENTACIÓN — KMeans, no "le pregunto a Claude en qué segmento cae"
# ===========================================================================
def segmentar_clientes(df: pd.DataFrame, columnas_numericas: list[str], n_segmentos: int = 4) -> pd.DataFrame:
    """Agrupa clientes por comportamiento real (gasto, frecuencia, recencia, etc.)
    usando KMeans. Devuelve el DataFrame con una columna 'segmento' agregada."""
    X = df[columnas_numericas].fillna(0)
    X_norm = StandardScaler().fit_transform(X)
    n_segmentos = min(n_segmentos, max(1, len(df) // 2)) or 1
    km = KMeans(n_clusters=n_segmentos, n_init=10, random_state=42)
    df = df.copy()
    df["segmento"] = km.fit_predict(X_norm)

    # etiqueta legible por segmento, basada en el centro real del cluster
    centros = pd.DataFrame(
        StandardScaler().fit(X).inverse_transform(km.cluster_centers_), columns=columnas_numericas
    )
    orden = centros[columnas_numericas[0]].rank(ascending=False).astype(int)
    etiquetas = {i: f"segmento_{int(o)}" for i, o in zip(centros.index, orden)}
    df["segmento_nombre"] = df["segmento"].map(etiquetas)
    return df


# ===========================================================================
# 3. ANOMALÍAS — Isolation Forest, no "¿esto te parece raro, Claude?"
# ===========================================================================
def detectar_anomalias(df: pd.DataFrame, columnas_numericas: list[str], contaminacion: float = 0.05) -> pd.DataFrame:
    """Marca registros estadísticamente atípicos (montos, frecuencias fuera de lo normal)
    con un modelo real de detección de anomalías, no heurísticas de umbral fijo."""
    X = df[columnas_numericas].fillna(0)
    modelo = IsolationForest(contamination=contaminacion, random_state=42)
    df = df.copy()
    df["es_anomalia"] = modelo.fit_predict(X) == -1
    df["score_anomalia"] = -modelo.score_samples(X)  # más alto = más raro
    return df


# ===========================================================================
# 4. RELACIONES ENTRE PRODUCTOS/EVENTOS — reglas de asociación (Apriori)
# ===========================================================================
def reglas_de_asociacion(transacciones: list[list[str]], soporte_min: float = 0.05) -> pd.DataFrame:
    """Encuentra qué productos/eventos tienden a aparecer juntos — el
    equivalente de 'los clientes que compraron X también compraron Y',
    calculado con Apriori real, no inferido por un LLM leyendo filas."""
    te = TransactionEncoder()
    arr = te.fit(transacciones).transform(transacciones)
    df_bin = pd.DataFrame(arr, columns=te.columns_)
    frecuentes = apriori(df_bin, min_support=soporte_min, use_colnames=True)
    if frecuentes.empty:
        return pd.DataFrame()
    reglas = association_rules(frecuentes, metric="lift", min_threshold=1.0)
    return reglas.sort_values("lift", ascending=False)


# ===========================================================================
# 5. TENDENCIA / PROYECCIÓN — regresión simple, no "Claude, ¿cómo va a seguir esto?"
# ===========================================================================
def proyectar_tendencia(serie_temporal: pd.Series, periodos_futuros: int = 3) -> dict:
    """Ajusta una regresión sobre la serie histórica y proyecta los próximos
    períodos. Simple a propósito — para volumen de datos de una pyme, un
    modelo pesado tipo Prophet es sobre-ingeniería; esto alcanza y es
    auditable a simple vista."""
    y = serie_temporal.values.astype(float)
    X = np.arange(len(y)).reshape(-1, 1)
    modelo = LinearRegression().fit(X, y)
    X_futuro = np.arange(len(y), len(y) + periodos_futuros).reshape(-1, 1)
    proyeccion = modelo.predict(X_futuro)
    return {
        "pendiente_por_periodo": float(modelo.coef_[0]),
        "proyeccion": proyeccion.tolist(),
        "tendencia": "creciente" if modelo.coef_[0] > 0 else "decreciente" if modelo.coef_[0] < 0 else "estable",
    }


# ===========================================================================
# 6. Lo ÚNICO que sigue usando Claude: onboarding conversacional + naming
# ===========================================================================
def onboarding_siguiente_pregunta(client, historial_conversacion: list[dict]) -> dict:
    """Chat de onboarding real: Claude pregunta sobre el negocio, y puede
    hacer tantas preguntas de seguimiento como necesite antes de pedir los
    datos — esto SÍ es lenguaje natural genuino, por eso usa el LLM."""
    system = """Sos un asistente de onboarding para dueños de pymes que están por
conectar los datos de su negocio a un sistema de análisis. Tu trabajo es
entender, con preguntas conversacionales (no un formulario), de qué tipo de
negocio se trata, qué datos suele tener, y qué problemas quiere resolver.
Podés hacer tantas preguntas de seguimiento como necesites si la respuesta
del usuario no es clara. Cuando ya tengas suficiente contexto (rubro,
principales fuentes de datos, el problema que quiere resolver), decilo
explícitamente y pedile que suba o pegue los datos.

Respondé SOLO JSON: {"pregunta": "...", "listo_para_datos": true|false,
"resumen_negocio": "si listo_para_datos es true, un resumen breve; si no, string vacío"}"""

    resp = client.messages.create(
        model="claude-sonnet-4-6", max_tokens=400, system=system,
        messages=historial_conversacion,
    )
    text = re.sub(r"^```json|```$", "", resp.content[0].text.strip(), flags=re.MULTILINE)
    return json.loads(text)


def nombrar_columnas(client, muestras_por_columna: dict[str, list]) -> dict[str, str]:
    """La única parte de armar el esquema que sí necesita lenguaje: decidir
    qué representa cada columna en criollo (esto no es un patrón estadístico,
    es comprensión semántica de texto — ahí el LLM rinde, no un algoritmo)."""
    prompt = f"""Para cada columna de una tabla de negocio, con una muestra de
valores reales, decime en una palabra o dos qué representa (en español,
sin jerga técnica). Columnas: {json.dumps(muestras_por_columna, ensure_ascii=False)}

Respondé SOLO JSON: {{"columna1": "qué es", "columna2": "qué es", ...}}"""
    resp = client.messages.create(model="claude-sonnet-4-6", max_tokens=400,
                                   messages=[{"role": "user", "content": prompt}])
    text = re.sub(r"^```json|```$", "", resp.content[0].text.strip(), flags=re.MULTILINE)
    return json.loads(text)


if __name__ == "__main__":
    # demo rápida con datos de juguete, sin necesidad de API key
    clientes = pd.DataFrame({
        "cliente": ["A", "B", "C", "D", "E", "F"],
        "gasto_total": [1200, 300, 15000, 800, 400, 20000],
        "frecuencia_compra": [5, 1, 40, 3, 2, 50],
    })
    seg = segmentar_clientes(clientes, ["gasto_total", "frecuencia_compra"], n_segmentos=3)
    print("Segmentación:\n", seg[["cliente", "segmento_nombre"]])

    anom = detectar_anomalias(clientes, ["gasto_total", "frecuencia_compra"])
    print("\nAnomalías:\n", anom[["cliente", "es_anomalia", "score_anomalia"]])

    print("\nResolución de identidad ejemplo:",
          resolver_identidad("Pedro Ruiz", "Pedro Rodriguez", "pedro@ej.com", "pedro@ej.com"))

    ventas = pd.Series([100, 120, 115, 140, 160, 155, 180])
    print("\nProyección de tendencia:", proyectar_tendencia(ventas, periodos_futuros=3))
