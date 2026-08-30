/* ==========================================================================
 * Terraform project scaffold generator
 *
 * former2 normally emits every Terraform resource into a single flat file.
 * generateTerraformProject() takes the same tracked_resources list and lays
 * it out as a modules + workspaces repo, the shape many teams adopt:
 *
 *   modules/<group>/
 *     main.tf        - the resources
 *     data.tf        - generic data lookups (commented starter set)
 *     variables.tf   - per-environment knobs, with the discovered value as default
 *     outputs.tf     - attributes referenced by other modules
 *   workspaces/<env>/
 *     provider.tf    - terraform{} + aws provider
 *     backend.tf     - S3 remote-state skeleton (commented)
 *     main.tf        - one root module: instantiates every module and wires
 *                      cross-module references directly
 *   README.md
 *
 * One workspace == one environment == one AWS account. The single root in
 * workspaces/<env>/ calls every module and passes cross-module references as
 * module inputs, so there is no terraform_remote_state plumbing.
 *
 * Resource HCL is rendered with the existing outputMapTf() from mappings.js.
 * A light post-processing pass hoists a curated set of top-level scalar
 * attributes into each module's variables.tf (discovered value as the default;
 * that is the single source of truth) and rewrites cross-module references
 * into module inputs/outputs.
 * ========================================================================== */

var TF_PROJECT_DEFAULT_ENV = 'dev';

// terraformType -> module group. First match wins; specific patterns first.
var TF_PROJECT_GROUPS = [
    [/^aws_(vpc($|_|peering)|subnet|route($|_)|route_table|internet_gateway|egress_only_internet_gateway|nat_gateway|network_acl|network_interface|default_(vpc|subnet|route_table|network_acl)|ec2_transit_gateway|customer_gateway|vpn_|dx_|flow_log|ec2_managed_prefix_list|main_route_table_association)/, 'network'],
    [/^aws_(security_group|default_security_group|network_interface_sg_attachment)/, 'security_groups'],
    [/^aws_(instance|launch_template|launch_configuration|key_pair|placement_group|ebs_|volume_attachment|ami($|_)|spot_|ec2_fleet|autoscaling)/, 'compute'],
    [/^aws_(lb($|_)|alb($|_)|elb($|_))/, 'load_balancers'],
    [/^aws_iam_/, 'iam'],
    [/^aws_(s3_|s3control_)/, 's3'],
    [/^aws_(db_|rds_|neptune_|docdb_)/, 'rds'],
    [/^aws_(lambda_|lambda$)/, 'lambda'],
    [/^aws_(ecs_|ecr_|ecrpublic_|service_discovery_)/, 'ecs'],
    [/^aws_eks_/, 'eks'],
    [/^aws_(cloudfront_|cloudfront$)/, 'cdn'],
    [/^aws_(cloudwatch_|cloudtrail|xray_)/, 'observability'],
    [/^aws_(route53_|route53recoverycontrolconfig_)/, 'dns'],
    [/^aws_(sns_|sns$|sqs_|sqs$)/, 'messaging'],
    [/^aws_(kms_|kms$|secretsmanager_|acm_|acmpca_|wafv2_|waf_|shield_|guardduty_|securityhub_)/, 'security'],
    [/^aws_(dynamodb_|dynamodb$|elasticache_|dax_|memorydb_)/, 'data_stores'],
    [/^aws_(api_gateway|apigatewayv2)/, 'api_gateway'],
    [/^aws_(kinesis_|firehose_|msk_|mq_|glue_)/, 'streaming'],
    [/^aws_(efs_|fsx_|backup_|storagegateway_)/, 'storage'],
    [/^aws_(eventbridge_|cloudwatch_event_|scheduler_|appautoscaling_|dms_)/, 'integration']
];

// Top-level scalar attributes worth exposing as per-environment variables.
var TF_PROJECT_HOIST_ATTRS = {
    // strings
    'name': 'string', 'name_prefix': 'string', 'bucket': 'string',
    'identifier': 'string', 'identifier_prefix': 'string',
    'cluster_identifier': 'string', 'db_name': 'string', 'database_name': 'string',
    'function_name': 'string', 'repository_name': 'string', 'domain_name': 'string',
    'engine': 'string', 'engine_version': 'string', 'instance_class': 'string',
    'node_type': 'string', 'instance_type': 'string', 'username': 'string',
    // numbers
    'allocated_storage': 'number', 'max_allocated_storage': 'number',
    'desired_count': 'number', 'min_size': 'number', 'max_size': 'number',
    'desired_capacity': 'number', 'min_capacity': 'number', 'max_capacity': 'number',
    'cpu': 'number', 'memory': 'number', 'port': 'number',
    'backup_retention_period': 'number'
};

var TF_REF_RE = /\$\{(aws_[a-z0-9_]+)\.([A-Za-z0-9_-]+)\.([a-z0-9_]+)\}/g;

function tfProjectGroupFor(terraformType, service) {
    for (var i = 0; i < TF_PROJECT_GROUPS.length; i++) {
        if (TF_PROJECT_GROUPS[i][0].test(terraformType)) {
            return TF_PROJECT_GROUPS[i][1];
        }
    }
    return (service || 'main').toString().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '') || 'main';
}

function tfProjectSanitize(name) {
    var n = (name || '').toString().replace(/[^A-Za-z0-9_]/g, '_');
    if (!/^[A-Za-z_]/.test(n)) {
        n = '_' + n;
    }
    return n;
}

function generateTerraformProject(tracked_resources, options) {
    tracked_resources = tracked_resources || [];
    options = options || {};
    var env = tfProjectSanitize(options.environment || TF_PROJECT_DEFAULT_ENV);

    var tfResources = tracked_resources.filter(function (r) { return r && r.terraformType; });

    var regions = {};
    for (var i = 0; i < tfResources.length; i++) {
        if (tfResources[i].region) { regions[tfResources[i].region] = 1; }
    }
    var regionList = Object.keys(regions);
    var region = regionList[0] || 'us-east-1';
    var multiRegion = regionList.length > 1;

    // logicalId -> group, so cross-module references can be detected.
    var groupOf = {};
    for (var g = 0; g < tracked_resources.length; g++) {
        if (tracked_resources[g].terraformType) {
            groupOf[tracked_resources[g].logicalId] = tfProjectGroupFor(tracked_resources[g].terraformType, tracked_resources[g].service);
        }
    }

    // Per-group accumulators.
    var groups = {}; // group -> { blocks:[], vars:{name->{type,default}}, outputs:{name->expr}, imports:{srcGroup->1} }
    function groupState(name) {
        if (!groups[name]) {
            groups[name] = { blocks: [], vars: {}, outputs: {}, imports: {} };
        }
        return groups[name];
    }

    var crossRefs = []; // for MANUAL-WIRING.md

    for (var j = 0; j < tracked_resources.length; j++) {
        var r = tracked_resources[j];
        if (!r.terraformType) { continue; }

        var group = groupOf[r.logicalId];
        var gs = groupState(group);

        var block = outputMapTf(j, r.service, r.terraformType, r.options.tf, r.region, r.was_blocked, r.logicalId, tracked_resources);
        block = block.replace(/^\n+/, '').replace(/\s+$/, '') + '\n';

        block = tfProjectHoistScalars(block, r, gs);
        block = tfProjectRewriteRefs(block, r, group, groupOf, groups, crossRefs);

        gs.blocks.push(block);
    }

    var files = {};
    var groupNames = Object.keys(groups).sort();

    groupNames.forEach(function (name) {
        var gs = groups[name];

        files['modules/' + name + '/main.tf'] = gs.blocks.join('\n');

        files['modules/' + name + '/data.tf'] =
            '# Common lookups. Uncomment the ones you use.\n' +
            '#\n' +
            '# data "aws_caller_identity" "current" {}\n' +
            '# data "aws_region" "current" {}\n' +
            '# data "aws_partition" "current" {}\n';

        files['modules/' + name + '/variables.tf'] = tfProjectRenderVariables(gs.vars);

        var outNames = Object.keys(gs.outputs).sort();
        if (outNames.length) {
            files['modules/' + name + '/outputs.tf'] = outNames.map(function (o) {
                return 'output "' + o + '" {\n  value = ' + gs.outputs[o] + '\n}\n';
            }).join('\n');
        }
    });

    // Single workspace: one root module for this environment / AWS account.
    var wsDir = 'workspaces/' + env + '/';
    files[wsDir + 'provider.tf'] = tfProjectProviderFile(region, env, multiRegion, regionList);
    files[wsDir + 'backend.tf'] = tfProjectBackendFile(region, env);
    files[wsDir + 'main.tf'] = tfProjectWorkspaceMain(groupNames, groups, env);

    files['README.md'] = tfProjectReadme(env, region, regionList, groupNames, tfResources.length, crossRefs.length, multiRegion);

    files['.gitignore'] =
        '**/.terraform/*\n*.tfstate\n*.tfstate.*\ncrash.log\ncrash.*.log\n' +
        '*.tfvars\n*.tfvars.json\n!*.tfvars.example\noverride.tf\noverride.tf.json\n' +
        '*_override.tf\n*_override.tf.json\n.terraformrc\nterraform.rc\n';

    return files;
}

/* --- post-processing helpers ------------------------------------------------ */

// Replace `    <attr> = <literal>` on a top-level line with `var.<lid>_<attr>`,
// and record the variable (with the discovered value as its default).
function tfProjectHoistScalars(block, r, gs) {
    var lid = tfProjectSanitize(r.logicalId);
    var lines = block.split('\n');
    for (var i = 0; i < lines.length; i++) {
        var m = lines[i].match(/^ {4}([a-z_]+) = ("(?:[^"\\]|\\.)*"|-?\d+(?:\.\d+)?)$/);
        if (!m) { continue; }
        var attr = m[1];
        var kind = TF_PROJECT_HOIST_ATTRS[attr];
        if (!kind) { continue; }
        var raw = m[2];
        if (raw.indexOf('${') !== -1 || raw.indexOf('REPLACEME') !== -1) { continue; }
        var varName = lid + '_' + attr;
        gs.vars[varName] = { type: kind, default: raw };
        lines[i] = '    ' + attr + ' = var.' + varName;
    }
    return lines.join('\n');
}

// Rewrite `${type.otherLid.attr}` when otherLid lives in a different module.
function tfProjectRewriteRefs(block, r, group, groupOf, groups, crossRefs) {
    return block.replace(TF_REF_RE, function (whole, type, lid, attr) {
        var srcGroup = groupOf[lid];
        if (!srcGroup || srcGroup === group) {
            return whole; // intra-module reference: leave untouched
        }
        var outName = tfProjectSanitize(lid) + '_' + attr;
        var varName = srcGroup + '_' + outName;
        groups[group].vars[varName] = { type: 'string', default: null, src: srcGroup, output: outName };
        groups[group].imports[srcGroup] = 1;
        groups[srcGroup] = groups[srcGroup] || { blocks: [], vars: {}, outputs: {}, imports: {} };
        groups[srcGroup].outputs[outName] = type + '.' + lid + '.' + attr;
        crossRefs.push({ from: group, to: srcGroup, variable: varName, output: outName, expr: type + '.' + lid + '.' + attr });
        return '${var.' + varName + '}';
    });
}

function tfProjectRenderVariables(vars) {
    var names = Object.keys(vars).sort();
    if (!names.length) {
        return '# No per-environment variables were hoisted for this module.\n' +
               '# Add variable blocks here and reference them from main.tf.\n';
    }
    return names.map(function (n) {
        var v = vars[n];
        var s = 'variable "' + n + '" {\n  type = ' + v.type + '\n';
        if (v.default !== null && v.default !== undefined) {
            s += '  default = ' + v.default + '\n';
        }
        s += '}\n';
        return s;
    }).join('\n');
}

function tfProjectProviderFile(region, env, multiRegion, regionList) {
    var s =
        'terraform {\n' +
        '  required_version = ">= 1.3"\n\n' +
        '  required_providers {\n' +
        '    aws = {\n' +
        '      source  = "hashicorp/aws"\n' +
        '      version = "~> 5.0"\n' +
        '    }\n' +
        '  }\n' +
        '}\n\n' +
        'provider "aws" {\n' +
        '  region = "' + region + '"\n\n' +
        '  default_tags {\n' +
        '    tags = {\n' +
        '      Environment = "' + env + '"\n' +
        '      ManagedBy   = "terraform"\n' +
        '      Source      = "former2"\n' +
        '    }\n' +
        '  }\n' +
        '}\n';
    if (multiRegion) {
        s += '\n# Discovered resources span multiple regions: ' + regionList.join(', ') + '\n' +
             '# Add aliased providers and set `provider = aws.<alias>` on the out-of-region resources.\n';
    }
    return s;
}

function tfProjectBackendFile(region, env) {
    return '# Create the bucket + lock table, then uncomment and run:\n' +
           '#   terraform init -migrate-state\n' +
           '#\n' +
           '# terraform {\n' +
           '#   backend "s3" {\n' +
           '#     bucket         = "my-terraform-state"\n' +
           '#     key            = "' + env + '/terraform.tfstate"\n' +
           '#     region         = "' + region + '"\n' +
           '#     dynamodb_table = "my-terraform-locks"\n' +
           '#     encrypt        = true\n' +
           '#   }\n' +
           '# }\n';
}

function tfProjectWorkspaceMain(groupNames, groups, env) {
    var out = [
        '# Root module for the ' + env + ' environment (one AWS account).',
        '# Every discovered module is instantiated here and cross-module',
        '# references are wired directly. Per-environment values live in each',
        "# module's variables.tf as defaults - edit them there, not here.",
        ''
    ];

    groupNames.forEach(function (name) {
        var gs = groups[name];
        // Only cross-module inputs are passed here; hoisted scalars use their
        // variables.tf defaults.
        var external = Object.keys(gs.vars).filter(function (n) { return gs.vars[n].default === null; }).sort();

        var s = 'module "' + name + '" {\n  source = "../../modules/' + name + '"\n';
        if (external.length) {
            s += '\n';
            var w = Math.max.apply(null, external.map(function (n) { return n.length; }));
            external.forEach(function (n) {
                var v = gs.vars[n];
                s += '  ' + n + Array(w - n.length + 1).join(' ') + ' = module.' + v.src + '.' + v.output + '\n';
            });
        }
        s += '}\n';
        out.push(s);
    });

    return out.join('\n');
}

function tfProjectReadme(env, region, regionList, groupNames, count, crossRefCount, multiRegion) {
    return '# Terraform project\n\n' +
        'Generated by [former2](https://github.com/iann0036/former2) from ' + count +
        ' existing AWS resource' + (count === 1 ? '' : 's') + ' in `' + regionList.join('`, `') + '`.\n\n' +
        '## Layout\n\n' +
        '```\n' +
        'modules/<group>/     reusable module: main.tf, data.tf, variables.tf, outputs.tf\n' +
        'workspaces/' + env + '/     root module for this environment: provider.tf, backend.tf, main.tf\n' +
        '```\n\n' +
        'Modules discovered: ' + groupNames.join(', ') + '\n\n' +
        'One workspace maps to one environment / AWS account. `workspaces/' + env + '/main.tf`\n' +
        'instantiates every module and wires cross-module references directly.\n\n' +
        '## Usage\n\n' +
        '```sh\n' +
        'cd workspaces/' + env + '\n' +
        'terraform init\n' +
        'terraform plan\n' +
        '```\n\n' +
        '## Before you apply\n\n' +
        '- Review every resource. Values that must be unique and `REPLACEME`\n' +
        '  placeholders need attention.\n' +
        '- Per-environment knobs (names, sizes, counts) were hoisted into each\n' +
        '  module\'s `variables.tf` with the discovered value as the default.\n' +
        '  That is the single source of truth - edit them there.\n' +
        '- Import existing resources into state rather than recreating them.\n' +
        '- former2 cannot emit repeated nested blocks (some security group\n' +
        '  rules, WAF statements, S3 lifecycle transitions); those render as\n' +
        '  list literals and need a manual pass.\n' +
        (crossRefCount ? '- ' + crossRefCount + ' cross-module reference(s) were wired automatically in\n' +
        '  `workspaces/' + env + '/main.tf`; confirm each points at the right module output.\n' : '') +
        (multiRegion ? '- Resources span multiple regions; see the note in `provider.tf`.\n' : '');
}
