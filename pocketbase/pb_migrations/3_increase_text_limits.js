/// <reference path="../pb_data/types.d.ts" />

// Increase max size for long-text fields in `scans`:
//   prompt_text      - LLM prompts can reach 100K+ chars
//   llm_response_raw - raw LLM JSON response
// PocketBase text fields default to 5 000 chars; we raise them to 2 000 000.

migrate((app) => {
    const scans = app.findCollectionByNameOrId("scans");

    for (const field of scans.fields) {
        if (field.name === "prompt_text" || field.name === "llm_response_raw") {
            field.max = 2_000_000;
        }
    }

    app.save(scans);
}, (app) => {
    const scans = app.findCollectionByNameOrId("scans");

    for (const field of scans.fields) {
        if (field.name === "prompt_text" || field.name === "llm_response_raw") {
            field.max = 5000;
        }
    }

    app.save(scans);
});
