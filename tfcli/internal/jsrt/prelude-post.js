/* ------------------------------------------------------------------------
 * former2 tfcli - post-load prelude
 *
 * Runs AFTER js/mappings.js, js/datatables.js, js/services/*.js and
 * js/tfproject.js. Provides the entry points the Go host calls for each of
 * the three steps (scan / generate / project).
 * ---------------------------------------------------------------------- */

function __lookupFn(name) {
    try { return eval(name); } catch (e) { return null; }
}

/* --- step 1: scan ---------------------------------------------------- */
async function __runScan(optsJSON) {
    var opts = JSON.parse(optsJSON || "{}");

    var includeExclude = opts.excludeServices || opts.services;
    if (includeExclude && includeExclude.length) {
        var wanted = includeExclude.map(function (x) { return x.toLowerCase(); });
        for (var i in sections) {
            var isListed = wanted.indexOf(nav(sections[i].service).toLowerCase()) !== -1;
            if ((opts.services && !isListed) || (opts.excludeServices && isListed)) {
                delete sections[i];
            }
        }
        sections = sections.filter(function (v) { return v; });
    }
    if (opts.includeDefaultResources) { include_default_resources = true; }

    var total = sections.length;
    var done = 0;
    __hostProgress(done, total);

    await Promise.all(sections.map(function (section) {
        var dtname = 'updateDatatable' + nav(section.category) + nav(section.service);
        var fn = __lookupFn(dtname);
        return Promise.resolve()
            .then(function () { return fn ? fn() : null; })
            .catch(function (err) {
                __hostLog("warn", dtname + ": " + (err && err.message ? err.message : err));
            })
            .then(function () { done++; __hostProgress(done, total); });
    }));

    return cli_resources.length;
}

/* --- raw data passthrough ------------------------------------------- */
function __loadRawResources(json) {
    cli_resources = JSON.parse(json);
    return cli_resources.length;
}
function __getRawResources() {
    return JSON.stringify(cli_resources);
}

/* --- steps 2+3: map + generate ------------------------------------- */
// Mirrors saveOutput() in cli/main.js: build output_objects from the scanned
// rows (optionally filtered), then performF2Mappings into the global
// tracked_resources that both the flat output and the project build consume.
function __prepareResources(optsJSON) {
    var opts = JSON.parse(optsJSON || "{}");

    if (opts.sortOutput) {
        cli_resources.sort(function (a, b) { return (a.f2id > b.f2id) ? 1 : -1; });
    }

    var searchFilter = opts.searchFilter || null;
    var regexFilter = opts.regexFilter ? new RegExp(opts.regexFilter) : null;

    var output_objects = [];
    for (var i = 0; i < cli_resources.length; i++) {
        var row = cli_resources[i];
        var jsonres = null;
        if (searchFilter) {
            jsonres = JSON.stringify(row);
            if (searchFilter.indexOf(",") !== -1) {
                if (!searchFilter.split(",").some(function (el) { return jsonres.indexOf(el) !== -1; })) continue;
            } else if (searchFilter.indexOf("&") !== -1) {
                if (!searchFilter.split("&").every(function (el) { return jsonres.indexOf(el) !== -1; })) continue;
            } else {
                if (jsonres.indexOf(searchFilter) === -1) continue;
            }
        }
        if (regexFilter) {
            if (!jsonres) jsonres = JSON.stringify(row);
            if (!regexFilter.test(jsonres)) continue;
        }
        output_objects.push({
            id: row.f2id,
            type: row.f2type,
            data: row.f2data,
            region: row.f2region
        });
    }

    tracked_resources = performF2Mappings(output_objects);
    return tracked_resources.length;
}

function __generateTf() {
    var out = compileOutputs(tracked_resources, null);
    return out.tf;
}

function __generateProject(env, withImports, withImportScript) {
    // former2's UI always runs Generate (compileOutputs) before the project
    // build; that also initialises tracked_relationships / global_used_refs,
    // which tfproject.js's outputMapTf path relies on.
    compileOutputs(tracked_resources, null);
    var files = generateTerraformProject(tracked_resources, {
        environment: env || "dev",
        imports: !!withImports,
        importScript: !!withImportScript
    });
    return JSON.stringify(files);
}

// Flat import blocks (addresses are <type>.<lid>, no modules).
function __generateImports() {
    var imp = generateTerraformImports(tracked_resources, {});
    return JSON.stringify({ content: imp.content, count: imp.count, todo: imp.todo });
}

// Flat `tofu import` script.
function __generateImportScript() {
    var s = generateTerraformImportScript(tracked_resources, {});
    return JSON.stringify({ content: s.content, count: s.count, todo: s.todo });
}

function __logicalIdMap() {
    return JSON.stringify(getLogicalToPhysicalIdMap());
}
