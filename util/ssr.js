/**
 * Former2 server-side helper.
 *
 * Implements the same request protocol as the Former2 Helper browser extension
 * (ping / configUpdate / serviceAction), but runs the AWS SDK server-side. This
 * lets the web app talk to AWS APIs that do not send CORS headers (S3, IAM, ...)
 * without any browser extension.
 *
 * The web app posts to this endpoint when the "Server-side Helper" setting (or
 * the SSR_ENDPOINT constant in js/app.js) is set. Credentials are supplied by
 * the browser on every serviceAction call and are only kept in memory for the
 * duration of that call.
 *
 * Usage:
 *   npm install express aws-sdk
 *   node util/ssr.js            # listens on :3001 (override with PORT)
 *
 * Then set the app's "Helper endpoint" setting to this server's URL, e.g.
 * "http://localhost:3001/" or "/ssr" when reverse-proxied on the same origin.
 */

const express = require('express');
const AWS = require('aws-sdk');

const PORT = process.env.PORT || 3001;

const app = express();
app.use(express.json({ limit: '75mb' }));

// Permissive CORS - this server only ever relays the caller's own credentials
// to AWS and returns the response; it holds no state worth protecting.
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
    res.header('Access-Control-Allow-Headers', 'Content-Type');
    res.header('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.header('Vary', 'Origin');
    if (req.method === 'OPTIONS') {
        return res.sendStatus(204);
    }
    next();
});

function credentialsFrom(config) {
    if (!config) {
        return null;
    }
    // The browser sends AWS.Credentials(...) which, under the extension proxy,
    // serializes to a positional array [accessKeyId, secretAccessKey, sessionToken].
    if (Array.isArray(config.credentials) && config.credentials[0]) {
        return new AWS.Credentials(
            config.credentials[0],
            config.credentials[1],
            config.credentials[2] || null
        );
    }
    if (config.credentials && config.credentials.accessKeyId) {
        return new AWS.Credentials(
            config.credentials.accessKeyId,
            config.credentials.secretAccessKey,
            config.credentials.sessionToken || null
        );
    }
    return null;
}

app.post('/', (req, res) => {
    const body = req.body || {};

    if (body.action === 'ping') {
        return res.json({ success: true, data: {} });
    }

    if (body.action === 'configUpdate') {
        // Non-authoritative: real credentials arrive with each serviceAction.
        return res.json({ success: true, data: {} });
    }

    if (body.action === 'serviceAction') {
        try {
            const serviceName = body.service && body.service.name;
            const serviceAction = body.service_action;

            // Per-service options from the app (region overrides, user agent, ...)
            // win over the generic config; credentials come from the generic config.
            const serviceOptions = Object.assign({}, body.service && body.service.properties);
            const creds = credentialsFrom(body.config);
            if (creds) {
                serviceOptions.credentials = creds;
            }
            if (!serviceOptions.region && body.config && body.config.region) {
                serviceOptions.region = body.config.region;
            }

            if (!AWS[serviceName]) {
                return res.json({
                    success: false,
                    error: `Unknown AWS service "${serviceName}".`,
                    data: null
                });
            }

            const svc = new AWS[serviceName](serviceOptions);
            svc[serviceAction](body.params || {}, (err, data) => {
                if (err) {
                    return res.json({
                        success: false,
                        error: { code: err.code, message: err.message, name: err.name },
                        data: data || null
                    });
                }
                res.json({ success: true, data: data });
            });
        } catch (err) {
            res.json({
                success: false,
                error: `The call to the SDK failed (${(body.service || {}).name}.${body.service_action}): ${err.message}`,
                data: null
            });
        }
        return;
    }

    res.status(400).json({ success: false, error: 'Unknown request action.', data: null });
});

app.get('/', (req, res) => {
    res.type('text/plain').send('Former2 server-side helper is running. POST helper requests here.');
});

app.listen(PORT, () => {
    console.log(`Former2 server-side helper listening on :${PORT}`);
});
