# F07 - Product Hunt Collector

## Objective

Collect Product Hunt data to evaluate competition and niche saturation.

## Scope

### API

GraphQL with OAuth. Token in environment variable `PRODUCTHUNT_TOKEN`.

### Role

**Exclusively** competition and saturation filter. Not used to discover opportunities, but to validate whether a niche is already saturated with existing products.

### Output

Data on existing products by category/niche that feeds the `low_competition` scoring in the Processor.

### Error Handling

| Scenario | Action |
--------------------- | ------------------------------------------------ |
Product Hunt API down | Ignore competition, mark as "no data" |

## Storage

Result in `raw_data` with `source = "producthunt"`.

## Acceptance Criteria

- [x] Connects to the Product Hunt GraphQL API
- [x] Searches for existing products by niche/category
- [x] Generates competition/saturation data
- [x] Saves to `raw_data`
- [x] Handles gracefully if the API fails (omits source if `PRODUCTHUNT_TOKEN` is missing or the API fails)
- [x] Works as an asynchronous task

## Dependencies

- F03 (backend core)
- F02 (collection raw_data)

## Ref SPEC

Section 5.1.4