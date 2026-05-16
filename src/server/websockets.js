import { nanoid } from 'nanoid';
import { schemioExtension } from '../common/fs/fsUtils';
import path from 'path';
import { FileIndex } from '../common/fs/fileIndex';

/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
const WebSocket = require('ws');
const fs = require('fs');
const chokidar = require('chokidar');

// 10 minutes for maximum reconnection for the same connectionId
const MAX_STALE_CONNECTIONS_TIMEOUT_SECONDS = 60 * 10;

const HEARTBEAT_INTERVAL_SECONDS = 30;

// tracks users that have open files with the key as a schemeId and value as array of connection IDs
// of the users that have that file open
const allOpenDocs = new Map();

// map of connection IDs to Connection objects
const connections = new Map();

class Connection {
    /**
     * @param {string} connectionId
     * @param {WebSocket.WebSocket} ws
     * @param {string} watchRoot
     * @param {FileIndex} fileIndex
     */
    constructor(connectionId, ws, watchRoot, fileIndex) {
        this.connectionId = connectionId;
        this.ws = ws;
        this.watchRoot = watchRoot;
        this.fileIndex = fileIndex;
        this.lastUsed = new Date();
        this.docIds = new Set();
    }

    openFile(schemeId) {
        console.log('got open msg', schemeId);
        if (!schemeId) {
            return;
        }
        // Store schemeId internally
        this.docIds.add(schemeId);
        if (!allOpenDocs.has(schemeId)) {
            allOpenDocs.set(schemeId, []);
        }
        const docConnections = allOpenDocs.get(schemeId);
        if (!docConnections.includes(this.connectionId)) {
            docConnections.push(this.connectionId);
        }
        // Send current file content to the client using schemeId
        try {
            const doc = this.fileIndex.getDocumentFromIndex(schemeId);
            if (doc && doc.fsPath) {
                const absolutePath = toAbsolutePath(doc.fsPath, this.watchRoot);
                const content = fs.readFileSync(absolutePath, 'utf8');
                this.ws.send(JSON.stringify({
                    type: 'content',
                    schemeId,
                    content
                }));
            }
        } catch (err) {
            // File might not exist yet, that's okay
        }
    }

    closeFile(schemeId) {
        if (!schemeId) {
            return;
        }
        this.docIds.delete(schemeId);
        const docConnections = allOpenDocs.get(schemeId);
        if (docConnections) {
            const index = docConnections.indexOf(this.connectionId);
            if (index > -1) {
                docConnections.splice(index, 1);
            }
            if (docConnections.length === 0) {
                allOpenDocs.delete(schemeId);
            }
        }
    }

    pong() {
        this.lastUsed = new Date();
    }
}

/**
 * Convert absolute path to relative path based on watch root
 * @param {string} absolutePath
 * @param {string} watchRoot
 * @returns {string}
 */
function toRelativePath(absolutePath, watchRoot) {
    let relative = path.relative(watchRoot, absolutePath);
    // Normalize path separators
    return relative.replace(/\\/g, '/');
}

/**
 * Convert relative path to absolute path based on watch root
 * @param {string} relativePath
 * @param {string} watchRoot
 * @returns {string}
 */
function toAbsolutePath(relativePath, watchRoot) {
    return path.resolve(watchRoot, relativePath);
}

function watchSchemioDocuments(watchRoot, fileIndex, callback) {
    const watcher = chokidar.watch(watchRoot, { ignored: /^\./ });
    watcher.on('change', (absolutePath) => {
        console.log('file changed absolute path:', absolutePath);
        if (absolutePath.endsWith(schemioExtension)) {
            const relativePath = toRelativePath(absolutePath, watchRoot);
            console.log('file changed relative path:', relativePath);
            const schemeId = fileIndex.getDocumentIdByPath(relativePath);
            if (schemeId) {
                const content = fs.readFileSync(absolutePath, 'utf8');
                console.log('document changed:', schemeId);
                callback(schemeId, content);
            }
        }
    });
}

function cleanupConnection(connectionId) {
    const connection = connections.get(connectionId);
    if (connection) {
        // Remove this connection from all open files tracking
        for (const schemeId of connection.openDocs) {
            const docConnections = allOpenDocs.get(schemeId);
            if (docConnections) {
                const index = docConnections.indexOf(connectionId);
                if (index > -1) {
                    docConnections.splice(index, 1);
                }
                if (docConnections.length === 0) {
                    allOpenDocs.delete(schemeId);
                }
            }
        }
        connections.delete(connectionId);
    }
}

function broadcastFileUpdate(schemeId, content) {
    const docConnections = allOpenDocs.get(schemeId);
    if (docConnections && docConnections.length > 0) {
        console.log('Found', docConnections.length, 'connections to docuemnt', schemeId);
        const message = JSON.stringify({
            type: 'update',
            schemeId,
            content
        });
        for (const connectionId of docConnections) {
            console.log('con', connectionId);
            const connection = connections.get(connectionId);
            if (connection && connection.ws.readyState === WebSocket.OPEN) {
                console.log('Sending update of', schemeId, ' to connection', connectionId);
                connection.ws.send(message);
            }
        }
    }
}

/**
 *
 * @param {*} cfg
 * @param {*} server
 * @param {FileIndex} fileIndex
 */
export function createWebSocketServer(cfg, server, fileIndex) {
    const wss = new WebSocket.Server({ server });

    // Start watching the documents directory for changes
    const watchRoot = cfg.fs?.rootPath || '/opt/schemio/';
    watchSchemioDocuments(watchRoot, fileIndex, broadcastFileUpdate);

    // Heartbeat interval: send ping to all connections
    const heartbeatInterval = setInterval(() => {
        for (const [connectionId, connection] of connections) {
            if (connection.ws.readyState === WebSocket.OPEN) {
                connection.ws.ping();
            }
        }
    }, HEARTBEAT_INTERVAL_SECONDS * 1000);

    wss.on('connection', (ws) => {
        const connectionId = nanoid(1024);
        const connection = new Connection(connectionId, ws, watchRoot, fileIndex);
        connections.set(connectionId, connection);

        ws.on('pong', () => {
            connection.pong();
        });

        ws.on('message', (msg) => {
            connection.lastUsed = new Date();
            const data = JSON.parse(msg);
            if (data.type === 'openDocument') {
                connection.openFile(data.schemeId);
            } else if (data.type === 'closeDocument') {
                connection.closeFile(data.schemeId)
            }
        });

        ws.on('close', () => {
            // Clean up connection and all associated open files
            cleanupConnection(connectionId);
        });
    });

    // Clean up stale connections periodically
    setInterval(() => {
        const now = new Date();
        const staleThreshold = now - MAX_STALE_CONNECTIONS_TIMEOUT_SECONDS * 1000;
        for (const [connectionId, connection] of connections) {
            if (connection.lastUsed < staleThreshold) {
                cleanupConnection(connectionId);
            }
        }
    }, MAX_STALE_CONNECTIONS_TIMEOUT_SECONDS * 1000);

    console.log('Created WebSocket server');
}