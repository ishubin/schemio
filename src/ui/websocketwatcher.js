import ReconnectingWebSocket from 'reconnecting-websocket';


function socketOpenDocument(socket, docId) {
    console.log('Opening document', docId);
    socket.send(JSON.stringify({
        type: 'watchDocument',
        schemeId: docId
    }));
}

function socketCloseDocument(socket, docId) {
    console.log('Closing document', docId);
    socket.send(JSON.stringify({
        type: 'closeDocument',
        schemeId: docId
    }));
}

export function createWebsocketDocumentWatcher(opts) {
    const wsUrl = opts.url;
    const updateCallback = opts.onUpdate || (() => {});
    const docIds = new Set();

    const socket = new ReconnectingWebSocket(wsUrl, [], {
        maxReconnectionDelay: 30000,
        minReconnectionDelay: 1000,
        reconnectionDelayGrowFactor: 1.3,
        maxRetries: Infinity,
        debug: false,
    });

    socket.onopen = () => {
        console.log('WebSocket connected');
        docIds.forEach(docId => {
            socketOpenDocument(socket, docId);
        });
    };
    socket.onmessage = (event) => {
        const data = JSON.parse(event.data);

        if (data.type === 'update') {
            updateCallback(data.schemeId, data.content);
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

        close() {
            docIds.forEach(docId => {
                socketCloseDocument(socket, docId);
            });
            docIds.clear();
            socket.close();
        }
    };
}