# F08 — Processor Module

## Objetivo

Transformar datos crudos de los collectors en input limpio y estructurado para el prompt del LLM.

## Alcance

### Pipeline de procesamiento

4 etapas secuenciales sobre los datos en `raw_data` del scan actual:

### 1. Limpieza

- Posts con menos de 10 palabras: descartar
- Spam (links excesivos, auto-promocion): descartar
- Normalizacion de texto (encoding, whitespace, etc.)
- Deduplicacion de posts similares

### 2. Clustering

- Algoritmo: TF-IDF + KMeans (scikit-learn)
- Numero de clusters: automatico via silhouette score
- Rango: entre **3-15 clusters** (K_MIN=3, K_MAX=15)
- Deduplicacion previa via similitud coseno ≥ 0.85

### 3. Deteccion de senales

Pesos para scoring:

| Tipo            | Peso |
| --------------- | ---- |
| Pain signal     | 1x   |
| Demand signal   | 3x   |
| High engagement | 1.5x |
| Ask HN post     | 2x   |

### 4. Resumenes por cluster

1-2 parrafos por cluster conteniendo:
- Tema principal
- Conteos (posts, senales)
- Senales detectadas
- Frases representativas (sin copiar posts enteros)

### Almacenamiento

Los clusters procesados quedan en memoria para pasarlos al PromptBuilder. Al finalizar, `scan.status` pasa a `processing` → `awaiting_llm_input`.

`scan.processed_at` se actualiza al completar.

## Criterios de aceptacion

- [x] Filtra posts cortos (<10 palabras) y spam
- [x] Deduplica posts similares (cosine similarity ≥ 0.85)
- [x] Genera clusters con TF-IDF + KMeans
- [x] Calcula silhouette score para determinar numero de clusters
- [x] Aplica pesos de senales correctamente
- [x] Genera resumenes concisos por cluster
- [x] Actualiza scan status a `awaiting_llm_input` al terminar

## Dependencias

- F04, F05, F06, F07 (datos crudos de collectors)
- F02 (collection raw_data para leer, scans para actualizar status)

## Ref SPEC

Seccion 5.2
