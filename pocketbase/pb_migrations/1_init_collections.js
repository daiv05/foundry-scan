/// <reference path="../pb_data/types.d.ts" />

migrate((app) => {

    // ── 1. scans ────────────────────────────────────────────────────────────
    const scans = new Collection({
        name: "scans",
        type: "base",
        fields: [
            {
                name: "status",
                type: "select",
                required: false,
                maxSelect: 1,
                values: [
                    "pending",
                    "collecting",
                    "processing",
                    "awaiting_llm_input",
                    "parsing",
                    "completed",
                    "failed"
                ]
            },
            { name: "config",            type: "json" },
            { name: "prompt_text",       type: "text" },
            { name: "prompt_tokens_est", type: "number" },
            { name: "llm_response_raw",  type: "text" },
            { name: "llm_used",          type: "text" },
            { name: "started_at",        type: "date" },
            { name: "processed_at",      type: "date" },
            { name: "submitted_at",      type: "date" },
            { name: "completed_at",      type: "date" },
            { name: "error_message",     type: "text" },
            // Explicit autodate so the column exists before indexes are applied
            { name: "created", type: "autodate", onCreate: true,  onUpdate: false },
            { name: "updated", type: "autodate", onCreate: true,  onUpdate: true  }
        ],
        indexes: [
            "CREATE INDEX `idx_scans_status`  ON `scans` (`status`)",
            "CREATE INDEX `idx_scans_created` ON `scans` (`created`)"
        ]
    });
    app.save(scans);

    // ── 2. opportunities ────────────────────────────────────────────────────
    const opportunities = new Collection({
        name: "opportunities",
        type: "base",
        fields: [
            {
                name: "scan",
                type: "relation",
                required: true,
                collectionId: scans.id,
                cascadeDelete: true,
                maxSelect: 1
            },
            { name: "rank",         type: "number" },
            { name: "score",        type: "number" },
            { name: "name",         type: "text"   },
            { name: "problem",      type: "text"   },
            { name: "evidence",     type: "json"   },
            { name: "scoring",      type: "json"   },
            { name: "target_user",  type: "text"   },
            { name: "mvp_features", type: "json"   },
            { name: "monetization", type: "text"   },
            { name: "build_time",   type: "text"   },
            { name: "reasoning",    type: "text"   },
            {
                name: "user_status",
                type: "select",
                maxSelect: 1,
                values: ["new", "evaluating", "discarded", "building", "archived"]
            },
            { name: "notes", type: "text" }
        ],
        indexes: [
            "CREATE INDEX `idx_opp_scan`        ON `opportunities` (`scan`)",
            "CREATE INDEX `idx_opp_user_status` ON `opportunities` (`user_status`)",
            "CREATE INDEX `idx_opp_score`       ON `opportunities` (`score` DESC)"
        ]
    });
    app.save(opportunities);

    // ── 3. raw_data ─────────────────────────────────────────────────────────
    const rawData = new Collection({
        name: "raw_data",
        type: "base",
        fields: [
            {
                name: "scan",
                type: "relation",
                required: true,
                collectionId: scans.id,
                cascadeDelete: true,
                maxSelect: 1
            },
            {
                name: "source",
                type: "select",
                maxSelect: 1,
                values: ["reddit", "hackernews", "trends", "producthunt"]
            },
            { name: "data", type: "json" }
        ],
        indexes: [
            "CREATE INDEX `idx_rawdata_scan_source` ON `raw_data` (`scan`, `source`)"
        ]
    });
    app.save(rawData);

    // ── 4. scan_configs ─────────────────────────────────────────────────────
    const scanConfigs = new Collection({
        name: "scan_configs",
        type: "base",
        fields: [
            { name: "name",       type: "text",   required: true },
            { name: "config",     type: "json"   },
            { name: "is_default", type: "bool"   }
        ]
    });
    app.save(scanConfigs);

}, (app) => {
    // down — delete in reverse dependency order
    for (const name of ["scan_configs", "raw_data", "opportunities", "scans"]) {
        try {
            const c = app.findCollectionByNameOrId(name);
            app.delete(c);
        } catch (_) {}
    }
});
