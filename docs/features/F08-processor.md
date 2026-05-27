# F08 - Processor Module

## Objective

Transform raw data from the collectors into clean, structured input for the LLM prompt.

## Scope

### Processing Pipeline

4 sequential stages on the `raw_data` of the current scan:

### 1. Cleaning

- Posts with fewer than 10 words: discard
- Spam (excessive links, self-promotion): discard
- Text normalization (encoding, whitespace, etc.)
- Deduplication of similar posts

### 2. Clustering

- Algorithm: TF-IDF + KMeans (scikit-learn)
- Number of clusters: automatic via silhouette score
- Range: between **3-15 clusters** (K_MIN=3, K_MAX=15)
- Previous deduplication via cosine similarity ≥ 0.85

### 3. Signal Detection

Scoring weights:

| Type | Weight |
| --------------- | ---- |
| Pain signal | 1x |
| Demand signal | 3x |
| High engagement | 1.5x |
| Ask HN post | 2x |

### 4. Cluster Summaries

1-2 paragraphs per cluster containing:
- Main topic
- Counts (posts, signals)
- Signals detected
- Representative phrases (without copying entire posts)

### Storage

Processed clusters are stored in memory to be passed to the PromptBuilder. Upon completion, `scan.status` changes to `processing` --> `awaiting_llm_input`.

`scan.processed_at` is updated upon completion.

## Acceptance Criteria

- [x] Filters short posts (<10 words) and spam
- [x] Deduplicates similar posts (cosine similarity ≥ 0.85)
- [x] Generates clusters with TF-IDF + KMeans
- [x] Calculates silhouette score to determine the number of clusters
- [x] Applies signal weights correctly
- [x] Generates concise summaries per cluster
- [x] Updates scan status to `awaiting_llm_input` upon completion

## Dependencies

- F04, F05, F06, F07 (raw data from collectors)
- F02 (collection raw_data to read, scans to update status)

## Ref SPEC

Section 5.2