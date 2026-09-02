/* ==========================================================================
 * Terraform import block generator
 *
 * former2 already knows, for every resource it maps, the logical id it will
 * write and the physical id it discovered it by (obj.id). generateTerraform
 * Imports() turns those into Terraform `import {}` blocks so an adopted repo
 * can be `tofu apply`-ed once to populate state, after which `tofu plan`
 * should report no changes (modulo attribute drift, which is a separate,
 * iterative fixup).
 *
 *   import {
 *     to = <address>
 *     id = "<terraform import id>"
 *   }
 *
 * For most resource types the Terraform import id is exactly the physical id
 * former2 keyed the resource on. The exceptions - composite ids like
 * "<role>/<policy_arn>" - are computed from options.tf / obj.data in
 * TF_IMPORT_ID below. Types with no usable import id emit a commented block
 * with a REPLACE_ME so nothing is silently dropped.
 * ========================================================================== */

// terraformType -> (r) => import id string, or null (not importable / unknown).
// r is a tracked_resources entry: { obj:{id,data,region,type}, logicalId,
// terraformType, options:{tf}, returnValues }.
var TF_IMPORT_ID = {
    aws_iam_role_policy_attachment:  function (r) { return joinIf(r.options.tf.role,  r.options.tf.policy_arn, "/"); },
    aws_iam_user_policy_attachment:  function (r) { return joinIf(r.options.tf.user,  r.options.tf.policy_arn, "/"); },
    aws_iam_group_policy_attachment: function (r) { return joinIf(r.options.tf.group, r.options.tf.policy_arn, "/"); },
    aws_iam_user_group_membership:   function (r) {
        var g = r.options.tf.groups;
        if (!r.options.tf.user || !g || !g.length) { return null; }
        return r.options.tf.user + "/" + (Array.isArray(g) ? g.join("/") : g);
    },
    aws_iam_access_key: function () { return null; }, // secret is unrecoverable

    aws_route: function (r) {
        var t = r.options.tf;
        var dest = t.destination_cidr_block || t.destination_ipv6_cidr_block || t.destination_prefix_list_id;
        return joinIf(t.route_table_id, dest, "_");
    },
    aws_route_table_association: function (r) {
        var t = r.options.tf;
        return joinIf(t.subnet_id || t.gateway_id, t.route_table_id, "/");
    },
    aws_network_acl_rule: function (r) {
        var t = r.options.tf;
        if (!t.network_acl_id || t.rule_number === undefined) { return null; }
        return [t.network_acl_id, t.rule_number, t.protocol, t.egress ? "true" : "false"].join(":");
    },
    aws_main_route_table_association: function () { return null; },

    aws_route53_record: function (r) {
        var d = r.obj.data;
        if (!d.HostedZoneId || !d.Name || !d.Type) { return null; }
        var name = ("" + d.Name).replace(/\.$/, "");
        var parts = [d.HostedZoneId, name, d.Type];
        if (d.SetIdentifier) { parts.push(d.SetIdentifier); }
        return parts.join("_");
    },

    aws_lambda_permission:    function (r) { return joinIf(r.options.tf.function_name, r.options.tf.statement_id, "/"); },
    aws_lambda_alias:         function (r) { return joinIf(r.options.tf.function_name, r.options.tf.name, "/"); },
    aws_sqs_queue_policy:     function (r) { return r.options.tf.queue_url || null; },
    aws_s3_bucket_policy:     function (r) { return r.options.tf.bucket || null; },
    aws_ecr_repository_policy: function (r) { return r.options.tf.repository || null; },
    aws_ecs_service:          function (r) { return joinIf(r.options.tf.cluster, r.options.tf.name, "/"); },
    aws_volume_attachment:    function (r) {
        var t = r.options.tf;
        if (!t.device_name || !t.volume_id || !t.instance_id) { return null; }
        return [t.device_name, t.volume_id, t.instance_id].join(":");
    },
    aws_lb_listener_certificate: function (r) { return joinIf(r.options.tf.listener_arn, r.options.tf.certificate_arn, "_"); },
    aws_lb_target_group_attachment: function () { return null; }, // no import

    aws_cloudwatch_event_target: function (r) {
        var t = r.options.tf;
        if (!t.rule || !t.target_id) { return null; }
        return (t.event_bus_name ? t.event_bus_name + "/" : "") + t.rule + "/" + t.target_id;
    },
    aws_cloudwatch_event_rule: function (r) {
        var t = r.options.tf;
        if (!t.name) { return null; }
        return (t.event_bus_name ? t.event_bus_name + "/" : "") + t.name;
    },

    aws_api_gateway_resource: function (r) { return joinIf(r.options.tf.rest_api_id, r.obj.data && r.obj.data.id, "/"); },
    aws_api_gateway_method:   function (r) {
        var t = r.options.tf;
        return (t.rest_api_id && t.resource_id && t.http_method) ? [t.rest_api_id, t.resource_id, t.http_method].join("/") : null;
    },
    aws_api_gateway_stage: function (r) { return joinIf(r.options.tf.rest_api_id, r.options.tf.stage_name, "/"); },
    aws_api_gateway_base_path_mapping: function (r) { return joinIf(r.options.tf.domain_name, r.options.tf.base_path || "(none)", "/"); },
    aws_api_gateway_deployment: function () { return null; }, // recreated, not imported

    aws_config_configuration_recorder: function (r) { return r.options.tf.name || null; },
    aws_config_delivery_channel:       function (r) { return r.options.tf.name || null; },
};

function joinIf(a, b, sep) {
    if (a === undefined || a === null || a === "" || b === undefined || b === null || b === "") { return null; }
    return "" + a + sep + b;
}

function tfImportIdFor(r) {
    var fn = TF_IMPORT_ID[r.terraformType];
    if (fn) {
        try { return fn(r); } catch (e) { return null; }
    }
    // default: the physical id former2 discovered the resource by
    var id = r.obj && r.obj.id;
    if (id === undefined || id === null || id === "") { return null; }
    return "" + id;
}

/**
 * @param tracked_resources  the list from performF2Mappings()
 * @param options.groupOf    optional { logicalId -> moduleGroup }; when given,
 *                           addresses are module-qualified (project layout)
 * @param options.addressPrefix  optional literal prefix for every address
 * @returns { content, count, todo }  todo = addresses needing a manual id
 */
function generateTerraformImports(tracked_resources, options) {
    options = options || {};
    var groupOf = options.groupOf || null;
    var prefix = options.addressPrefix || "";

    var blocks = [];
    var todo = [];
    var count = 0;

    (tracked_resources || []).forEach(function (r) {
        if (!r || !r.terraformType || !r.logicalId) { return; }

        var addr = prefix + r.terraformType + "." + r.logicalId;
        if (groupOf && groupOf[r.logicalId]) {
            addr = prefix + "module." + groupOf[r.logicalId] + "." + r.terraformType + "." + r.logicalId;
        }

        var id = tfImportIdFor(r);
        if (!id) {
            todo.push(addr + "  # " + r.terraformType);
            blocks.push(
                "# import {\n" +
                "#   to = " + addr + "\n" +
                "#   id = \"REPLACE_ME\"  # " + r.terraformType + ": no automatic import id\n" +
                "# }"
            );
            return;
        }
        count++;
        blocks.push("import {\n  to = " + addr + "\n  id = " + JSON.stringify(id) + "\n}");
    });

    var header =
        "# Terraform import blocks generated by former2.\n" +
        "#\n" +
        "# Run `tofu plan` to preview, then `tofu apply` once to populate state.\n" +
        "# After a successful apply these blocks are inert and should be deleted.\n" +
        "# " + count + " resource(s) below" +
        (todo.length ? ", " + todo.length + " need a manual id (commented, marked REPLACE_ME)" : "") +
        ".\n\n";

    return { content: header + blocks.join("\n\n") + "\n", count: count, todo: todo };
}
