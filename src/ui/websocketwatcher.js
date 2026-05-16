import ReconnectingWebSocket from 'reconnecting-websocket';


class Connection {
    constructor(socket, schemeId) {
        this.socket = socket;
        this.schemeId = schemeId;
    }

    openDocument() {
        console.log('ws: opening document', this.schemeId);
        this.socket.send(JSON.stringify({
            type: 'openDocument',
            schemeId: this.schemeId
        }));
    }

    closeDocument() {
        console.log('ws: closing document', this.schemeId);
        this.socket.send(JSON.stringify({
            type: 'closeDocument',
            schemeId: this.schemeId
        }));
    }
}


export function initWebSocketDocumentWatcher(schemeId, updateCallback) {
    const wsUrl = document.location.protocol + '//' + document.location.host;
    const socket = new ReconnectingWebSocket(wsUrl, [], {
        maxReconnectionDelay: 30000,
        minReconnectionDelay: 1000,
        reconnectionDelayGrowFactor: 2,
        maxRetries: 10,
        debug: false,
    });

    const connection = new Connection(socket, schemeId);

    socket.onopen = () => {
        console.log('WebSocket connected');
        connection.openDocument();
    };

    socket.onmessage = (event) => {
        const data = JSON.parse(event.data);

        if (data.type === 'update') {
            updateCallback(data.schemeId, data.content);
        }
    };

    socket.onclose = () => {
        console.log('websocket closed');
    };

    socket.onerror = (error) => {
        console.error('WebSocket error:', error);
    };

    return {
        close() {
            connection.closeDocument();
            socket.close();
        }
    };
}