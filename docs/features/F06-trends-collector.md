# F06 - Trends Collector

## Objective

Collect Google Trends data to validate growth in interest in identified niches.

## Scope

### Sources

1. **Primary:** PyTrends (Python library for Google Trends)
2. **Fallback:** Playwright (direct scraping of trends.google.com)

> **Implementation Change:** The original design used SerpAPI as a fallback. The actual implementation uses Playwright to scrape Google Trends if PyTrends fails. The environment variable `SERPAPI_KEY` does not exist in the project.


### Relevant Environment Variables

```
TRENDS_GEO=US # region for Google Trends
TRENDS_TIMEFRAME=today 3-m # time frame
```

### Fallback Logic

If PyTrends fails (blocking, rate limit, API change), use Playwright to obtain the same data. No user intervention required.

### Output

Trend data by keyword/niche that feeds the trend_growth scoring in the Processor.

### Error Handling

| Scenario | Action |

| -------------------------- | --------------------------------------------- |

| PyTrends fails | Automatic fallback to Playwright |

| Playwright also fails | Ignore trends, mark source as "no data" |

## Storage

Result in `raw_data` with `source = "trends"`.

### Credentials

- PyTrends: No credentials (unofficial API)
- Playwright fallback: No credentials (public scraping)

## Acceptance Criteria

- [x] Query Google Trends via PyTrends
- [x] Automatic fallback to Playwright if PyTrends fails
- [x] Graceful handling if both sources fail
- [x] Saves to `raw_data`
- [x] Runs as an asynchronous task

## Dependencies

- F03 (backend core)
- F02 (collection raw_data)

## Ref SPEC

Section 5.1.3