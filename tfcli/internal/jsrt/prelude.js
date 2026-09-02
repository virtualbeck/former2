/* ------------------------------------------------------------------------
 * former2 tfcli - JavaScript prelude
 *
 * Recreates the minimal browser / former2 environment the mapping corpus
 * expects, then wires sdkcall() into the Go host. Loaded BEFORE the vendored
 * js/ files. A second prelude (prelude-post.js) runs after them.
 * ---------------------------------------------------------------------- */

var CLI = true;
var window = undefined;
var self = undefined;
var navigator = undefined;
var document = undefined;

// module-system stubs so the deepmerge UMD wrapper falls through to
// `global.deepmerge = factory()`
var module = undefined;
var exports = undefined;
var define = undefined;

var region = "us-east-1";           // overwritten by the host before a scan
var _AWS = {};
var AWS = { config: { update: function () {}, region: undefined } };

var iaclangselect = "typescript";
var stack_parameters = [];
var check_objects = [];
var cli_resources = [];
var resource_tag_cache = {};

// --- logging -------------------------------------------------------------
function f2log(msg) { __hostLog("debug", "" + msg); }
function f2trace(err) { __hostLog("trace", "" + (err && err.stack ? err.stack : err)); }
function f2debug(msg) { __hostLog("debug", "" + msg); }

var console = {
    log: function () { __hostLog("log", Array.prototype.join.call(arguments, " ")); },
    info: function () { __hostLog("log", Array.prototype.join.call(arguments, " ")); },
    warn: function () { __hostLog("warn", Array.prototype.join.call(arguments, " ")); },
    error: function () { __hostLog("error", Array.prototype.join.call(arguments, " ")); },
    trace: function () { __hostLog("trace", Array.prototype.join.call(arguments, " ")); },
    debug: function () { __hostLog("debug", Array.prototype.join.call(arguments, " ")); }
};

// --- DOM / UI no-ops ----------------------------------------------------
function blockUI() {}
function unblockUI() {}

function nav(str) {
    return str.replace(/\s/g, "").replace(/\,/g, "").replace(/\-/g, "").replace(/\&amp\;/g, "And");
}

// jQuery-ish shim. Only the bits former2's scan/mapping paths touch:
//   $('#sel').deferredBootstrapTable('append'|'removeAll', rows)
//   $.notify(...)
function $obj() {}
$obj.prototype.deferredBootstrapTable = function (action, data) {
    if (action === "append" && data && data.length) {
        for (var i = 0; i < data.length; i++) { cli_resources.push(data[i]); }
    }
};
$obj.prototype.bootstrapTable = $obj.prototype.deferredBootstrapTable;
$obj.prototype.DataTable = function () { return this; };
$obj.prototype.on = function () { return this; };
$obj.prototype.click = function () { return this; };
$obj.prototype.val = function () { return undefined; };
$obj.prototype.text = function () { return this; };
$obj.prototype.html = function () { return this; };
$obj.prototype.find = function () { return this; };
$obj.prototype.each = function () { return this; };
$obj.prototype.append = function () { return this; };
$obj.prototype.remove = function () { return this; };
$obj.prototype.addClass = function () { return this; };
$obj.prototype.removeClass = function () { return this; };
$obj.prototype.attr = function () { return undefined; };
$obj.prototype.prop = function () { return undefined; };
$obj.prototype.modal = function () { return this; };

var _theOnly$ = new $obj();
function $(sel) { return _theOnly$; }
$.notify = function (opts) {
    var title = (opts && opts.title ? ("" + opts.title).replace(/<[^>]*>/g, "") : "");
    var message = (opts && opts.message ? ("" + opts.message).replace(/<[^>]*>/g, "") : "");
    __hostNotify(title, message);
};
$.notifyDefaults = function () {};
$.each = function (coll, cb) {
    if (!coll) return;
    if (Array.isArray(coll)) { for (var i = 0; i < coll.length; i++) cb(i, coll[i]); }
    else { for (var k in coll) if (Object.prototype.hasOwnProperty.call(coll, k)) cb(k, coll[k]); }
};
$.ajax = function () { throw new Error("$.ajax is not available in the CLI"); };

// --- AWS tag helpers (ported verbatim from js/app.js) ------------------
function stripAWSTags(tags) {
    if (tags) {
        if (Array.isArray(tags)) {
            tags = tags.filter(function (value) { return (!value['Key'].startsWith("aws:")); });
        } else {
            var i = Object.keys(tags).length;
            while (i--) {
                var k = Object.keys(tags)[i];
                if (k.startsWith("aws:")) { delete tags[k]; }
            }
        }
    }
    return tags;
}

async function getResourceTags(arn) {
    if (!arn) { return null; }
    if (arn.split(":").length < 7 && !arn.split(":")[5].includes("/")) { return null; }

    var service = arn.split(":")[2];

    if (!resource_tag_cache[service]) {
        resource_tag_cache[service] = "PENDING";
        await sdkcall("ResourceGroupsTaggingAPI", "getResources", {
            ResourceTypeFilters: [service]
        }, false).then((data) => {
            resource_tag_cache[service] = data.ResourceTagMappingList;
        }).catch(() => { resource_tag_cache[service] = []; });
    }

    while (resource_tag_cache[service] === "PENDING") {
        await new Promise(r => setTimeout(r, 200));
    }

    var cached = resource_tag_cache[service] || [];
    for (var idx = 0; idx < cached.length; idx++) {
        var res = cached[idx];
        var resarnparts = res['ResourceARN'].split(":");
        resarnparts[3] = ""; resarnparts[4] = "";
        var arnparts = arn.split(":");
        arnparts[3] = ""; arnparts[4] = "";
        if (resarnparts.join(":") === arnparts.join(":")) {
            return res['Tags'].filter(tag => !tag['Key'].startsWith("aws:"));
        }
    }
    return null;
}

// --- the SDK bridge ---------------------------------------------------
// datatables.js keeps the full sdkcall() (pagination, backoff, error
// classification); its single client call was rewritten by sync-assets.js
// to invoke __rawSdkCall, which we implement here on top of the Go host.
function __rawSdkCall(svc, method, params, serviceoptions, cb) {
    __hostSdkCall(svc, method, JSON.stringify(params || {}), JSON.stringify(serviceoptions || {}), function (errJSON, dataJSON) {
        if (errJSON) {
            var e;
            try { e = JSON.parse(errJSON); } catch (x) { e = { code: "UnknownError", message: errJSON }; }
            var err = new Error(e.message || e.code || "AWS error");
            err.code = e.code;
            err.message = e.message || e.code || "";
            err.statusCode = e.statusCode;
            cb(err, null);
        } else {
            var data;
            try { data = JSON.parse(dataJSON); } catch (x) { data = {}; }
            cb(null, data);
        }
    });
}
