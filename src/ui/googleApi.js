
const CLIENT_ID       = '49605926377-mcb27jl2eakpbb9sqdh8pduq0l266vq3.apps.googleusercontent.com';
const DISCOVERY_DOC   = 'https://www.googleapis.com/discovery/v1/apis/drive/v3/rest';
const SCOPES          = 'https://www.googleapis.com/auth/drive.file';

let _tokenClient = null;
let _isInitialized = false;


class Notifier {
    constructor() {
        this.callbacks = [];
    }

    /**
     * @param {Function} callback
     * @param {Number} ttl - timeout in milliseconds within which this callback is valid
     */
    subscribe(callback, ttl) {
        this.callbacks.push({ callback, ttl, registeredAt: Date.now() });
    }

    notifyAll(...args) {
        const _callbacks = [...this.callbacks];
        this.callbacks.length = 0;
        const now = Date.now();
        _callbacks.forEach(item => {
            try {
                // Change > to <= so it fires BEFORE the TTL expires
                if (!item.ttl || (now - item.registeredAt <= item.ttl)) {
                    item.callback(...args); // Correctly call the function inside the object
                }
            } catch(err) {
                console.error("Error in Notifier callback:", err);
            }
        });
    }

    createSubscriberPromise(ttl) {
        return new Promise(resolve => {
            // Use the subscribe method directly to ensure the object shape matches
            // We pass the args to resolve so the caller gets the tokenResponse
            this.subscribe((...args) => {
                resolve(...args);
            }, ttl);
        });
    }
}


const gapiInitNotifier = new Notifier();
const signInNotifier = new Notifier();


export function whenGAPILoaded() {
    if (_isInitialized) {
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
        document.cookie = 'googleAccessToken=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;';
    });
}

export function googleRefreshToken() {
    return whenGAPILoaded().then(() => {
        const promise = signInNotifier.createSubscriberPromise();
        _tokenClient.requestAccessToken({
            prompt: ''
        });
        return promise;
    });
}


export function googleSignIn() {
    if (!_tokenClient) {
        console.error("Google API not initialized");
        return Promise.reject("Google API not initialized");
    }
    return new Promise((resolve) => {
        signInNotifier.subscribe(resolve);
        _tokenClient.requestAccessToken({ prompt: 'consent' });
    });
}

export function initGoogleAPI() {
    _tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: CLIENT_ID,
        scope: SCOPES,
        prompt: '',
        callback: (tokenResponse) => {
            // Store token, notify subscribers, etc.
            // console.log('Token received:', tokenResponse);
            gapi.client.setToken(tokenResponse);
            _isInitialized = true;
            const encodedToken = window.btoa(JSON.stringify(tokenResponse));
            document.cookie = `googleAccessToken=${encodedToken}; max-age=3580; path=/;`;
            signInNotifier.notifyAll(tokenResponse);
        },
    });

    gapi.load('client', () => {
        gapi.client.init({
            discoveryDocs: [ DISCOVERY_DOC ],
        }).then(() => {
            const cookies = getCookies();
            if (cookies.googleAccessToken) {
                try {
                    const token = JSON.parse(window.atob(cookies.googleAccessToken))
                    gapi.auth.setToken(token);
                } catch(err) {
                    console.error(err);
                }
            }
            _isInitialized = true;
            gapiInitNotifier.notifyAll();
        });
    });
}

function getCookies() {
    const cookies = {};
    document.cookie.split(';').forEach(x => {
        const parts = x.trim().split('=');
        cookies[parts[0]] = parts[1];
    });
    return cookies;
}
