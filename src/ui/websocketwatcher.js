import ReconnectingWebSocket from 'reconnecting-websocket';


function socketOpenDocument(socket, docId) {
    socket.send(JSON.stringify({
        type: 'watchDocument',
        schemeId: docId
    }));
}

function socketCloseDocument(socket, docId) {
    socket.send(JSON.stringify({
        type: 'closeDocument',
        schemeId: docId
    }));
}

export function createWebsocketDocumentWatcher(opts) {
    const wsUrl = opts.url;
    const docIds = new Set();

    const autoWatch = opts.hasOwnProperty('autoWatch') ? opts.autoWatch : true;

    const socket = new ReconnectingWebSocket(wsUrl, [], {
        maxReconnectionDelay: 30000,
        minReconnectionDelay: 1000,
        reconnectionDelayGrowFactor: 1.3,
        maxRetries: Infinity,
        debug: false,
    });

    if (autoWatch) {
        socket.onopen = () => {
            docIds.forEach(docId => {
                socketOpenDocument(socket, docId);
            });
        };
    }

    socket.onmessage = (event) => {
        let data = null;
        try {
            data = JSON.parse(event.data);
        } catch (err) {
            console.error('Failed to parse websocket message', err);
            return;
        }

        if (typeof data !== 'object' || typeof data.type !== 'string') {
            console.error('Invalid websocket message: ', msg);
            return;
        }

        if (opts.onMessage) {
            opts.onMessage(data);
        } else if (opts.onUpdate && data.type === 'update') {
            opts.onUpdate(data.schemeId, data.content);
        }
    };

    return {
        watchDocument(docId) {
            docIds.add(docId);
            socketOpenDocument(socket, docId);
        },

        closeDocument(docId) {
            docIds.delete(docId);
            socketCloseDocument(socket, docId);
        },

        send(msg) {
            socket.send(JSON.stringify(msg));
        },

        close() {
            docIds.forEach(docId => {
                socketCloseDocument(socket, docId);
            });
            docIds.clear();
            socket.close();
        }
    };
}