/// <reference path="../pb_data/types.d.ts" />

// Add created/updated autodate fields to collections that were missing them
migrate((app) => {
    const targets = ["opportunities", "raw_data", "scan_configs"];

    for (const name of targets) {
        const collection = app.findCollectionByNameOrId(name);

        collection.fields.add(new Field({
            name: "created",
            type: "autodate",
            onCreate: true,
            onUpdate: false,
        }));

        collection.fields.add(new Field({
            name: "updated",
            type: "autodate",
            onCreate: true,
            onUpdate: true,
        }));

        app.save(collection);
    }

    // Index created on opportunities (from spec)
    app.db().newQuery(
        "CREATE INDEX IF NOT EXISTS `idx_opp_created` ON `opportunities` (`created`)"
    ).execute();

}, (app) => {
    const targets = ["opportunities", "raw_data", "scan_configs"];
    for (const name of targets) {
        try {
            const collection = app.findCollectionByNameOrId(name);
            collection.fields.removeByName("created");
            collection.fields.removeByName("updated");
            app.save(collection);
        } catch (_) {}
    }
});
