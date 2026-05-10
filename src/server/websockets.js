import { nanoid } from 'nanoid';
import { schemioExtension } from '../common/fs/fsUtils';
import path from 'path';

/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
const WebSocket = require('ws');
const fs = require('fs');
const chokidar = require('chokidar');

// 10 minutes for maximum reconnection for the same connectionId
const MAX_STALE_CONNECTIONS_TIMEOUT_SECONDS = 60 * 10;

const HEARTBEAT_INTERVAL_SECONDS = 30;

// tracks users that have open files with the key as a file path and value as array of connection IDs
// of the users that have that file open
const openFiles = new Map();

// map of connection IDs to Connection objects
const connections = new Map();

class Connection {
    /**
     * @param {string} connectionId
     * @param {WebSocket.WebSocket} ws
     * @param {string} watchRoot
     */
    constructor(connectionId, ws, watchRoot) {
        this.connectionId = connectionId;
        this.ws = ws;
        this.watchRoot = watchRoot;
        this.lastUsed = new Date();
        this.openFiles = new Set();
    }

    openFile(relativePath) {
        if (!relativePath || !relativePath.endsWith(schemioExtension)) {
            return;
        }
        // Store relative paths internally
        this.openFiles.add(relativePath);
        if (!openFiles.has(relativePath)) {
            openFiles.set(relativePath, []);
        }
        const fileConnections = openFiles.get(relativePath);
        if (!fileConnections.includes(this.connectionId)) {
            fileConnections.push(this.connectionId);
        }
        // Send current file content to the client using relative path
        try {
            const absolutePath = toAbsolutePath(relativePath, this.watchRoot);
            const content = fs.readFileSync(absolutePath, 'utf8');
            this.ws.send(JSON.stringify({
                type: 'content',
                filePath: relativePath,
                content
            }));
        } catch (err) {
            // File might not exist yet, that's okay
        }
    }

    closeFile(relativePath) {
        if (!relativePath) {
            return;
        }
        this.openFiles.delete(relativePath);
        const fileConnections = openFiles.get(relativePath);
        if (fileConnections) {
            const index = fileConnections.indexOf(this.connectionId);
            if (index > -1) {
                fileConnections.splice(index, 1);
            }
            if (fileConnections.length === 0) {
                openFiles.delete(relativePath);
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

function watchSchemioDocuments(watchRoot, callback) {
    const watcher = chokidar.watch(watchRoot, { ignored: /^\./ });
    watcher.on('change', (absolutePath) => {
        if (absolutePath.endsWith(schemioExtension)) {
            const relativePath = toRelativePath(absolutePath, watchRoot);
            const content = fs.readFileSync(absolutePath, 'utf8');
            callback(relativePath, content);
        }
    });
}

function cleanupConnection(connectionId) {
    const connection = connections.get(connectionId);
    if (connection) {
        // Remove this connection from all open files tracking
        for (const filePath of connection.openFiles) {
            const fileConnections = openFiles.get(filePath);
            if (fileConnections) {
                const index = fileConnections.indexOf(connectionId);
                if (index > -1) {
                    fileConnections.splice(index, 1);
                }
                if (fileConnections.length === 0) {
                    openFiles.delete(filePath);
                }
            }
        }
        connections.delete(connectionId);
    }
}

function broadcastFileUpdate(filePath, content) {
    const fileConnections = openFiles.get(filePath);
    if (fileConnections && fileConnections.length > 0) {
        const message = JSON.stringify({
            type: 'update',
            filePath,
            content
        });
        for (const connectionId of fileConnections) {
            const connection = connections.get(connectionId);
            if (connection && connection.ws.readyState === WebSocket.OPEN) {
                connection.ws.send(message);
            }
        }
    }
}

export function createWebSocketServer(cfg, server) {
    const wss = new WebSocket.Server({ server });

    // Start watching the documents directory for changes
    const watchRoot = cfg.fs?.rootPath || '/opt/schemio/';
    watchSchemioDocuments(watchRoot, broadcastFileUpdate);

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
        const connection = new Connection(connectionId, ws, watchRoot);
        connections.set(connectionId, connection);

        ws.send(JSON.stringify({ type: 'init', connectionId }));

        ws.on('pong', () => {
            connection.pong();
        });

        ws.on('message', (msg) => {
            connection.lastUsed = new Date();
            const data = JSON.parse(msg);
            if (data.type === 'open') {
                connection.openFile(data.filePath);
            } else if (data.type === 'close') {
                connection.closeFile(data.filePath)
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