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
 * Post-processing passes then:
 *   - tfProjectResolveValues(): rewrite literal strings that match another
 *     scanned resource's computed attribute (an ALB DNS name, a VPC id, an
 *     ARN, ...) into ${<type>.<lid>.<attr>} interpolations, and swap the
 *     resource's own region / account id inside ARNs and endpoints for
 *     data.aws_region / data.aws_caller_identity lookups;
 *   - tfProjectHoistScalars(): hoist a curated set of top-level scalar
 *     attributes into each module's variables.tf (discovered value as the
 *     default; that is the single source of truth);
 *   - tfProjectRewriteRefs(): turn any of the above that crosses a module
 *     boundary into a module input wired from the source module's output.
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

// terraformType -> { <AWS field / dotted path suffix>: <terraform computed attr> }.
// Only fields listed here are indexed for value-based back-references, so a
// literal that happens to match some unrelated resource's data is never
// rewritten. Extend as coverage grows.
var TF_COMPUTED_ATTRS = {
    aws_vpc:                     { VpcId: 'id', Arn: 'arn' },
    aws_subnet:                  { SubnetId: 'id', Arn: 'arn' },
    aws_security_group:          { GroupId: 'id', Arn: 'arn' },
    aws_instance:                { InstanceId: 'id', Arn: 'arn' },
    aws_lb:                      { DNSName: 'dns_name', LoadBalancerArn: 'arn', CanonicalHostedZoneId: 'zone_id' },
    aws_elb:                     { DNSName: 'dns_name' },
    aws_lb_target_group:         { TargetGroupArn: 'arn' },
    aws_db_instance:             { 'Endpoint.Address': 'address', DbiResourceId: 'resource_id', DBInstanceArn: 'arn' },
    aws_rds_cluster:             { Endpoint: 'endpoint', ReaderEndpoint: 'reader_endpoint', DbClusterResourceId: 'cluster_resource_id', DBClusterArn: 'arn' },
    aws_cloudfront_distribution: { DomainName: 'domain_name', Id: 'id', ARN: 'arn' },
    aws_sns_topic:               { TopicArn: 'arn' },
    aws_sqs_queue:               { QueueUrl: 'url', QueueArn: 'arn' },
    aws_kms_key:                 { KeyId: 'key_id', Arn: 'arn' },
    aws_iam_role:                { Arn: 'arn' },
    aws_iam_user:                { Arn: 'arn' },
    aws_iam_policy:              { Arn: 'arn' },
    aws_iam_instance_profile:    { Arn: 'arn' },
    aws_ecs_cluster:             { ClusterArn: 'arn' },
    aws_ecr_repository:          { RepositoryUri: 'repository_url', RepositoryArn: 'arn' },
    aws_lambda_function:         { FunctionArn: 'arn' },
    aws_dynamodb_table:          { TableArn: 'arn', LatestStreamArn: 'stream_arn' },
    aws_efs_file_system:         { FileSystemId: 'id', Arn: 'arn' },
    aws_api_gateway_rest_api:    { Id: 'id' },
    aws_kinesis_stream:          { StreamARN: 'arn' },
    aws_acm_certificate:         { CertificateArn: 'arn' },
    aws_route53_zone:            { Id: 'zone_id' },
    aws_cloudwatch_log_group:    { Arn: 'arn' },
    aws_secretsmanager_secret:   { ARN: 'arn' }
};

// A literal must look like an opaque identifier / endpoint / ARN before it is
// eligible for back-reference rewriting - names, CIDRs, regions on their own
// and other guessable strings are deliberately excluded.
var TF_VALUE_INTERESTING_RE = /^(arn:aws|https:\/\/)|^[a-z][a-z0-9-]*-[0-9a-f]{8,17}$|^Z[A-Z0-9]{6,}$|^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$|\.amazonaws\.com(:|$|\/)|\.elb\.|\.rds\.|\.cache\.|\.es\.amazonaws/;

function tfProjectReEsc(s) {
    return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Depth-first walk of an object, invoking cb(dottedPath, leafKey, value) for
// every string/number leaf.
function tfProjectWalkLeaves(obj, cb, path) {
    path = path || '';
    if (obj === null || obj === undefined) { return; }
    if (Array.isArray(obj)) {
        for (var i = 0; i < obj.length; i++) {
            tfProjectWalkLeaves(obj[i], cb, path);
        }
        return;
    }
    if (typeof obj === 'object') {
        for (var k in obj) {
            if (!Object.prototype.hasOwnProperty.call(obj, k)) { continue; }
            var v = obj[k];
            var childPath = path ? path + '.' + k : k;
            if (v !== null && typeof v === 'object') {
                tfProjectWalkLeaves(v, cb, childPath);
            } else if (typeof v === 'string' || typeof v === 'number') {
                cb(childPath, k, v);
            }
        }
    }
}

function tfProjectBuildValueIndex(tracked_resources) {
    var index = {};      // value -> {tfType, lid, attr} | null (null == ambiguous, skip)
    var accounts = {};    // accountId -> count

    for (var i = 0; i < tracked_resources.length; i++) {
        var r = tracked_resources[i];
        if (!r || !r.terraformType || !r.obj || !r.obj.data) { continue; }
        var table = TF_COMPUTED_ATTRS[r.terraformType] || {};
        var lid = r.logicalId;
        var tfType = r.terraformType;

        tfProjectWalkLeaves(r.obj.data, function (dottedPath, leafKey, value) {
            if (typeof value === 'string') {
                var acct = value.match(/^arn:aws[a-z-]*:[^:]*:[^:]*:(\d{12}):/);
                if (acct) { accounts[acct[1]] = (accounts[acct[1]] || 0) + 1; }
            }

            var attr = table[leafKey];
            if (!attr) {
                // allow dotted-path suffix match (e.g. "Endpoint.Address")
                for (var key in table) {
                    if (key.indexOf('.') !== -1 && dottedPath.slice(-key.length) === key) {
                        attr = table[key];
                        break;
                    }
                }
            }
            if (!attr) { return; }

            var val = ('' + value).trim();
            if (val.length < 8 || !TF_VALUE_INTERESTING_RE.test(val)) { return; }

            if (!(val in index)) {
                index[val] = { tfType: tfType, lid: lid, attr: attr };
            } else if (index[val] && (index[val].lid !== lid || index[val].attr !== attr)) {
                index[val] = null; // same literal, two meanings - ambiguous
            }
        });
    }

    var account = null, best = 0;
    for (var a in accounts) {
        if (accounts[a] > best) { best = accounts[a]; account = a; }
    }

    // Longest values first so a short id nested inside a longer literal does not
    // shadow the longer match.
    var order = Object.keys(index).filter(function (v) { return index[v]; })
        .sort(function (x, y) { return y.length - x.length; });

    return { map: index, order: order, account: account };
}

// Rewrite literal substrings in an emitted resource block:
//   - another scanned resource's computed value  -> ${<type>.<lid>.<attr>}
//   - the resource's region inside an ARN/endpoint -> ${data.aws_region.current.id}
//   - the account id inside an ARN                 -> ${data.aws_caller_identity.current.account_id}
// Records which data sources the module ends up needing in gs.data.
function tfProjectResolveValues(block, r, valueIndex, gs) {
    var selfLid = r.logicalId;
    var region = r.region;
    var account = valueIndex.account;

    return block.replace(/"((?:[^"\\\n]|\\.)*)"/g, function (whole, inner) {
        var text = inner;

        // 1. computed-attribute back-references
        for (var i = 0; i < valueIndex.order.length; i++) {
            var val = valueIndex.order[i];
            var ent = valueIndex.map[val];
            if (!ent || ent.lid === selfLid) { continue; }
            if (text.indexOf(val) === -1) { continue; }
            var re = new RegExp('(^|[^A-Za-z0-9_-])' + tfProjectReEsc(val) + '(?![A-Za-z0-9-])', 'g');
            text = text.replace(re, function (m, pre) {
                return pre + '${' + ent.tfType + '.' + ent.lid + '.' + ent.attr + '}';
            });
        }

        var looksAws = /^arn:aws|amazonaws\.com|\.elb\.|\.rds\.|\.cache\./.test(text);

        // 2. region token inside an ARN / endpoint
        if (looksAws && region) {
            var rre = new RegExp('(^|[.:\\-])' + tfProjectReEsc(region) + '(?=[.:\\-]|$)', 'g');
            if (rre.test(text)) {
                text = text.replace(new RegExp('(^|[.:\\-])' + tfProjectReEsc(region) + '(?=[.:\\-]|$)', 'g'),
                    function (m, pre) { return pre + '${data.aws_region.current.id}'; });
                gs.data.region = 1;
            }
        }

        // 3. account id inside an ARN
        if (account && /^arn:aws/.test(text) && text.indexOf(':' + account + ':') !== -1) {
            text = text.split(':' + account + ':').join(':${data.aws_caller_identity.current.account_id}:');
            gs.data.caller_identity = 1;
        }

        return text === inner ? whole : '"' + text + '"';
    });
}

function tfProjectDataFile(used) {
    used = used || {};
    function line(on, body) { return (on ? '' : '# ') + body + '\n'; }
    return '# Common lookups. Entries used by this module are enabled; uncomment others as needed.\n' +
        '#\n' +
        line(used.caller_identity, 'data "aws_caller_identity" "current" {}') +
        line(used.region, 'data "aws_region" "current" {}') +
        line(used.partition, 'data "aws_partition" "current" {}');
}

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
        var g = groups[name] || (groups[name] = {});
        if (!g.blocks) { g.blocks = []; }
        if (!g.vars) { g.vars = {}; }
        if (!g.outputs) { g.outputs = {}; }
        if (!g.imports) { g.imports = {}; }
        if (!g.data) { g.data = {}; }
        return g;
    }

    var crossRefs = []; // for MANUAL-WIRING.md

    // value -> {tfType, lid, attr} index for computed-attribute back-references,
    // plus the discovered AWS account id.
    var valueIndex = tfProjectBuildValueIndex(tracked_resources);

    for (var j = 0; j < tracked_resources.length; j++) {
        var r = tracked_resources[j];
        if (!r.terraformType) { continue; }

        var group = groupOf[r.logicalId];
        var gs = groupState(group);

        var block = outputMapTf(j, r.service, r.terraformType, r.options.tf, r.region, r.was_blocked, r.logicalId, tracked_resources);
        block = block.replace(/^\n+/, '').replace(/\s+$/, '') + '\n';

        block = tfProjectRenameAttrs(block, r);
        block = tfProjectResolveValues(block, r, valueIndex, gs);
        block = tfProjectHoistScalars(block, r, gs);
        block = tfProjectRewriteRefs(block, r, group, groupOf, groups, crossRefs);
        block = tfProjectUnwrapInterps(block);

        gs.blocks.push(block);
    }

    var files = {};
    var groupNames = Object.keys(groups).sort();

    groupNames.forEach(function (name) {
        var gs = groups[name];

        files['modules/' + name + '/main.tf'] = gs.blocks.join('\n');

        files['modules/' + name + '/data.tf'] = tfProjectDataFile(gs.data);

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

    // Optional: Terraform import blocks (adopt an existing account into state).
    if (options.imports && typeof generateTerraformImports === 'function') {
        var imp = generateTerraformImports(tracked_resources, { groupOf: groupOf });
        files[wsDir + 'imports.tf'] = imp.content;
    }

    files['.gitignore'] =
        '**/.terraform/*\n*.tfstate\n*.tfstate.*\ncrash.log\ncrash.*.log\n' +
        '*.tfvars\n*.tfvars.json\n!*.tfvars.example\noverride.tf\noverride.tf.json\n' +
        '*_override.tf\n*_override.tf.json\n.terraformrc\nterraform.rc\n';

    return files;
}

/* --- post-processing helpers ------------------------------------------------ */

// former2's per-service mappers still emit a few attribute names from the AWS
// provider 3.x era; the project scaffold targets `~> 5.0`. Rename the known
// top-level offenders so the HCL at least parses. Extend as needed.
var TF_PROJECT_ATTR_RENAMES = {
    aws_db_instance:        { 'name': 'db_name' },
    aws_elasticache_cluster: { 'availability_zones': 'preferred_availability_zones' }
};

function tfProjectRenameAttrs(block, r) {
    var table = TF_PROJECT_ATTR_RENAMES[r.terraformType];
    if (!table) { return block; }
    return block.split('\n').map(function (line) {
        var m = line.match(/^(\s+)([a-z0-9_]+)(\s*=.*)$/);
        if (m && table[m[2]]) { return m[1] + table[m[2]] + m[3]; }
        return line;
    }).join('\n');
}

// Turn `attr = "${expr}"` (a value that is a single, whole interpolation) into
// `attr = expr`. Leaves interpolations embedded in larger strings alone.
function tfProjectUnwrapInterps(block) {
    return block.replace(/"\$\{([^"{}]+)\}"/g, function (whole, expr) {
        return (expr.indexOf('${') === -1) ? expr : whole;
    });
}

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
        groups[srcGroup] = groups[srcGroup] || { blocks: [], vars: {}, outputs: {}, imports: {}, data: {} };
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
        '- Literals matching another resource\'s computed attribute (DNS names,\n' +
        '  ARNs, VPC/subnet/SG ids) were rewritten to references; region and\n' +
        '  account id inside ARNs became `data` lookups. Spot-check them.\n' +
        '- former2 cannot emit repeated nested blocks (some security group\n' +
        '  rules, WAF statements, S3 lifecycle transitions); those render as\n' +
        '  list literals and need a manual pass.\n' +
        (crossRefCount ? '- ' + crossRefCount + ' cross-module reference(s) were wired automatically in\n' +
        '  `workspaces/' + env + '/main.tf`; confirm each points at the right module output.\n' : '') +
        (multiRegion ? '- Resources span multiple regions; see the note in `provider.tf`.\n' : '');
}
