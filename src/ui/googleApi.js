
const CLIENT_ID       = '49605926377-f8pu3773fiu5opmimvnndp29i3vmjpbr';
const API_KEY         = 'AIzaSyDg6DmXsMjAWPRW7HEDD2hEZU9wgcCQYm4';
const DISCOVERY_DOC   = 'https://www.googleapis.com/discovery/v1/apis/drive/v3/rest';
const SCOPES          = 'https://www.googleapis.com/auth/drive.file';

let tokenClient = null;


const gapiInitCallbacks = [];
const signinCallbacks = [];

function invokeAllCallbacks(callbacks, ...args) {
    const _callbacks = [...callbacks];
    callbacks.length = 0;
    _callbacks.forEach(callback => {
        try {
            callback(...args);
        } catch(err) { }
    });
}

export function whenGAPILoaded() {
    if (gapi.client && tokenClient) {
        return Promise.resolve();
    }
    else {
        return new Promise(resolve => {
            gapiInitCallbacks.push(() => {
                resolve();
            })
        });
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

export function googleSignIn() {
    return whenGAPILoaded().then(() => {
        return new Promise(resolve => {
            signinCallbacks.push(() => {
                resolve();
            });
            if (gapi.client.getToken() === null) {
                tokenClient.requestAccessToken({
                    prompt: 'consent'
                });
            } else {
                tokenClient.requestAccessToken({
                    prompt: ''
                });
            }
        });
    });
}

function googleTokenCallback(resp) {
    invokeAllCallbacks(signinCallbacks, resp);
}

export function initGoogleAPI() {
    tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: CLIENT_ID,
        scope: SCOPES,
        prompt: '',
        callback: googleTokenCallback,
    });

    gapi.load('client', () => {
        console.log('GAPI Client is loaded');
        gapi.client.init({
            apiKey: API_KEY,
            discoveryDocs: [ DISCOVERY_DOC ],
        });

        invokeAllCallbacks(gapiInitCallbacks);
    });
}