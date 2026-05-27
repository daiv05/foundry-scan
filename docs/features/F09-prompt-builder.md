# F09 - Prompt Builder

## Objective

Build a complete, self-contained prompt ready to be pasted into any external LLM.

## Scope

### Input

Processed clusters from the Processor (F08) + validation data (trends, competition).

### Structure of the Generated Prompt

```
=== CONTEXT ===
Micro-SaaS market analyst role.

=== DATA ===
Clusters with summary, post-count, demand signals, pain signals, trend data, competition.

=== INSTRUCTIONS ===
For each opportunity:
- Name, problem, numerical evidence
- Scoring 1-10 on 4 criteria (pain 30%, trend 20%, competition 25%, MVP 25%)
- Total weighted score
- Target user, MVP features, monetization, build time
- Reasoning

Filter: Discard generic AI chatbots, AI wrappers, AI note apps, AI coding assistants, and "Uber for X" ideas without evidence.

=== RESPONSE FORMAT ===
Strict JSON with defined schema.

```

### Token Estimation

| Prompt Size | Recommended Model |
| ----------------- | ------------------------------------- |
| < 8K tokens | Any modern LLM |
| 8K - 32K | Claude Sonnet/Opus, GPT-4, Gemini Pro |
| 32K - 100K | Claude (any), Gemini 1.5+ |

> 100K | Warn and offer compressed mode |

### Compression (post-MVP)

If the prompt is very large (>100K tokens), offer to compress summaries. Excluded from the MVP, but the builder must warn.

### Storage

- `scan.prompt_text` = generated prompt
- `scan.prompt_tokens_est` = token estimate

## Acceptance Criteria

- [x] Generates a self-contained prompt with context, data, instructions, and formatting
- [x] Estimates tokens and saves them in the scan
- [x] Saves the complete prompt in `scan.prompt_text`
- [x] Warns if the prompt exceeds 100K tokens
- [x] Includes strict JSON formatting instructions in the prompt
- [x] The expected response JSON includes: rank, score, name, problem, evidence, scoring (4 criteria), target_user, mvp_features, monetization, build_time, and reasoning

## Dependencies

- F08 (clusters processed)
- F02 (collection scans to save the prompt)

## Ref SPEC

Section 5.3