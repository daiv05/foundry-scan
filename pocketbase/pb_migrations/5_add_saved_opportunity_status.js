/// <reference path="../pb_data/types.d.ts" />

// Adds `saved` to the `user_status` select field in `opportunities`.
// Position: between "new" and "evaluating" - means "shortlisted, on hold".

migrate((app) => {
    const opportunities = app.findCollectionByNameOrId("opportunities");

    for (const field of opportunities.fields) {
        if (field.name === "user_status") {
            field.values = ["new", "saved", "evaluating", "discarded", "building", "archived"];
            break;
        }
    }

    app.save(opportunities);
}, (app) => {
    const opportunities = app.findCollectionByNameOrId("opportunities");

    for (const field of opportunities.fields) {
        if (field.name === "user_status") {
            field.values = ["new", "evaluating", "discarded", "building", "archived"];
            break;
        }
    }

    app.save(opportunities);
});
