/// <reference path="../pb_data/types.d.ts" />

// Adds `archived` (bool, default false) to the `scans` collection.
// Archived scans are hidden from the dashboard and the default scan list
// but remain queryable with ?archived=true.

migrate((app) => {
    const scans = app.findCollectionByNameOrId("scans");

    scans.fields.add(new Field({
        name:     "archived",
        type:     "bool",
        required: false,
    }));

    app.save(scans);
}, (app) => {
    const scans = app.findCollectionByNameOrId("scans");
    scans.fields.removeByName("archived");
    app.save(scans);
});
