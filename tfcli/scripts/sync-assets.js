#!/usr/bin/env node
/*
 * Copies the former2 JavaScript mapping corpus and the subset of aws-sdk-js
 * API models the CLI needs into tfcli/assets/ so they can be go:embed-ed.
 *
 * Re-run this whenever js/services/*.js, js/mappings.js or js/tfproject.js
 * change upstream. The copied files are committed (they are build inputs, not
 * source of truth).
 */
const fs = require('fs');
const path = require('path');

const repo = path.resolve(__dirname, '../..');
const jsSrc = path.join(repo, 'js');
const apiSrc = path.join(repo, 'node_modules', 'aws-sdk', 'apis');
const jsOut = path.resolve(__dirname, '../internal/jsrt/js');
const svcOut = path.join(jsOut, 'services');
const apiOut = path.resolve(__dirname, '../internal/awsmodel/apis');

for (const d of [jsOut, apiOut]) {
    fs.rmSync(d, { recursive: true, force: true });
}
for (const d of [jsOut, svcOut, apiOut]) {
    fs.mkdirSync(d, { recursive: true });
}

// --- 1. copy the JS corpus -------------------------------------------------
const topJs = ['deepmerge.js', 'mappings.js', 'datatables.js', 'tfproject.js', 'tfimports.js'];
for (const f of topJs) {
    fs.copyFileSync(path.join(jsSrc, f), path.join(jsOut, f));
}
// datatables.js keeps ALL the pagination / backoff / error-classification
// logic in sdkcall(); we only swap the one place it constructs an aws-sdk-js
// client and invokes the method for a call into the Go host (__rawSdkCall).
{
	const p = path.join(jsOut, 'datatables.js');
	let t = fs.readFileSync(p, 'utf8');
	const before = t;
	t = t.replace(
		/var service = new AWS\[svc\]\(serviceoptions\);\s*\n\s*\n\s*service\[method\]\.call\(service, params, async function \(err, data\) \{/,
		'__rawSdkCall(svc, method, params, serviceoptions, async function (err, data) {'
	);
	t = t.replace(
		/var service = new _AWS\[svc\]\(serviceoptions\);\s*\n\s*\n\s*service\[method\]\.call\(service, params1, params2, async function \(err, data\) \{\s*\n\s*resolve\(\);\s*\n\s*\}\);/,
		'resolve();'
	);
	if (t === before || /new AWS\[svc\]|new _AWS\[svc\]/.test(t)) {
		console.error('FATAL: datatables.js sdkcall patch did not apply cleanly - upstream shape changed.');
		process.exit(1);
	}
	fs.writeFileSync(p, t);
	console.log('datatables.js: sdkcall patched to call __rawSdkCall');
}

let svcCount = 0;
for (const f of fs.readdirSync(path.join(jsSrc, 'services'))) {
    if (!f.endsWith('.js')) continue;
    fs.copyFileSync(path.join(jsSrc, 'services', f), path.join(svcOut, f));
    svcCount++;
}
console.log(`js: ${topJs.length} top-level + ${svcCount} service files`);

// --- 2. work out which API models are referenced --------------------------
const usedNames = new Set();
const re = /sdkcall\("([A-Za-z0-9_]+)"/g;
function scan(file) {
    const txt = fs.readFileSync(file, 'utf8');
    let m;
    while ((m = re.exec(txt)) !== null) usedNames.add(m[1]);
}
scan(path.join(jsSrc, 'mappings.js'));
for (const f of fs.readdirSync(path.join(jsSrc, 'services'))) {
    if (f.endsWith('.js')) scan(path.join(jsSrc, 'services', f));
}

// --- 3. resolve class name -> api file via metadata.json ------------------
const metadata = JSON.parse(fs.readFileSync(path.join(apiSrc, 'metadata.json'), 'utf8'));
const byName = {};       // lower(name) -> {key, prefix}
for (const key of Object.keys(metadata)) {
    const e = metadata[key];
    byName[(e.name || key).toLowerCase()] = { key, prefix: e.prefix || key };
}
const allApis = fs.readdirSync(apiSrc).filter(f => f.endsWith('.min.json'));
function latestModel(prefix) {
    const cands = allApis
        .filter(f => f.startsWith(prefix + '-') && /^\d{4}-\d{2}-\d{2}\.min\.json$/.test(f.slice(prefix.length + 1)))
        .sort();
    return cands.length ? cands[cands.length - 1] : null;
}

fs.copyFileSync(path.join(apiSrc, 'metadata.json'), path.join(apiOut, 'metadata.json'));

const manifest = {};     // class name -> model filename (in apis/)
const missing = [];
let bytes = 0;
for (const name of [...usedNames].sort()) {
    const hit = byName[name.toLowerCase()];
    if (!hit) { missing.push(name); continue; }
    const model = latestModel(hit.prefix);
    if (!model) { missing.push(name + ' (no model for prefix ' + hit.prefix + ')'); continue; }
    const dst = path.join(apiOut, model);
    if (!fs.existsSync(dst)) {
        fs.copyFileSync(path.join(apiSrc, model), dst);
        bytes += fs.statSync(dst).size;
    }
    manifest[name] = model;
    // paginators are handy for a couple of odd cases; copy if present
    const pag = model.replace('.min.json', '.paginators.json');
    if (fs.existsSync(path.join(apiSrc, pag)) && !fs.existsSync(path.join(apiOut, pag))) {
        fs.copyFileSync(path.join(apiSrc, pag), path.join(apiOut, pag));
    }
}
fs.writeFileSync(path.join(apiOut, 'manifest.json'), JSON.stringify(manifest, null, 2));

console.log(`apis: ${Object.keys(manifest).length} models (${(bytes / 1e6).toFixed(1)} MB)`);
if (missing.length) {
    console.log('UNRESOLVED (' + missing.length + '): ' + missing.join(', '));
}
