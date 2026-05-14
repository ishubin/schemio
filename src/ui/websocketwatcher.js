import ReconnectingWebSocket from 'reconnecting-websocket';


class Connection {
    constructor(socket, schemeId) {
        this.socket = socket;
        this.schemeId = schemeId;
        this.connectionId = null;
    }

    init(connectionId) {
        console.log('initialized connection with ID:', connectionId);
        this.connectionId = connectionId;
        this.socket.send(JSON.stringify({
            type: 'openDocument',
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
    };

    socket.onmessage = (event) => {
        const data = JSON.parse(event.data);

        if (data.type === 'init') {
            connection.init(data.connectionId);
        } else if (data.type === 'update') {
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
            socket.send({
                type: 'closeDocument',
                schemeId: schemeId
            });
            setTimeout(() => { socket.close() }, 1000);
        }
    };
}