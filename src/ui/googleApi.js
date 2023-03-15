
const CLIENT_ID       = '49605926377-mcb27jl2eakpbb9sqdh8pduq0l266vq3';
const DISCOVERY_DOC   = 'https://www.googleapis.com/discovery/v1/apis/drive/v3/rest';
const SCOPES          = 'https://www.googleapis.com/auth/drive.file';

let tokenClient = null;
let _signedIn = false


class Notifier {
    constructor() {
        this.callbacks = [];
    }

    /**
     *
     * @param {Function} callback
     * @param {Number} ttl - timeout in milliseconds within which this callback is valid
     */
    subscribe(callback, ttl) {
        this.callbacks.push({callback, ttl, registeredAt: Date.now() });
    }

    notifyAll(...args) {
        const _callbacks = [...this.callbacks];
        this.callbacks.length = 0;
        const now = Date.now();
        _callbacks.forEach(callback => {
            try {
                if (!callback.ttl || now - callback.registeredAt > callback.ttl) {
                    callback(...args);
                }
            } catch(err) { }
        });
    }

    createSubscriberPromise(ttl) {
        return new Promise(resolve => {
            this.callbacks.push(() => {
                resolve();
            }, ttl);
        });
    }
}


const gapiInitNotifier = new Notifier();
const signInNotifier = new Notifier();


export function whenGAPILoaded() {
    if (gapi.client && tokenClient) {
        return Promise.resolve();
    }
    else {
        return gapiInitNotifier.createSubscriberPromise();
    }
}


export function googleIsSignedIn() {
    return whenGAPILoaded().then(() => {
        return gapi.client.getToken() !== null;
    });
}

export function googleSignOut() {
    return whenGAPILoaded().then(() => {
        const token = gapi.client.getToken();
        if (token !== null) {
            google.accounts.oauth2.revoke(token.access_token);
            gapi.client.setToken('');
        }
    });
}

export function googleEnsureSignedIn() {
    return whenGAPILoaded().then(() => {
        if (_signedIn) {
            return;
        }

        const promise = signInNotifier.createSubscriberPromise();

        tokenClient.requestAccessToken({
            prompt: ''
        });
        return promise;
    });
}

export function googleSignIn() {
    return whenGAPILoaded().then(() => {
        tokenClient.requestAccessToken({
            prompt: 'consent'
        });
    });
}

function googleTokenCallback(resp) {
    _signedIn = true;
    signInNotifier.notifyAll(resp);
}

export function initGoogleAPI() {
    tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: CLIENT_ID,
        scope: SCOPES,
        prompt: '',
        callback: googleTokenCallback,
    });

    gapi.load('client', () => {
        gapi.client.init({
            discoveryDocs: [ DISCOVERY_DOC ],
        });
        gapiInitNotifier.notifyAll();
    });
}