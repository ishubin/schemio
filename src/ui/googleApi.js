
const GA_CURRENT_USER = 'gaCurrentUser';


export function getGoogleCurrentUserSession() {
    const encodedUser = window.localStorage.getItem(GA_CURRENT_USER);
    if (encodedUser) {
        try {
            return JSON.parse(encodedUser);
        } catch (error) {
        }
    }
    return {
        isSignedIn: false,
        user: null
    };
}

function storeUserSessionInLocalStorage(googleAuth) {
    const isSignedIn = googleAuth.isSignedIn.get();
    let currentUserSession = {
        isSignedIn,
        user: null
    };
    if (isSignedIn) {
        const user = googleAuth.currentUser.get();
        if (user) {
            const profile = user.getBasicProfile();
            currentUserSession = {
                isSignedIn,
                user: {
                    name: profile.getName(),
                    image: profile.getImageUrl()
                }
            };
        }
    }

    window.localStorage.setItem(GA_CURRENT_USER, JSON.stringify(currentUserSession));
}

export function getGoogleAuth() {
    return window.getGoogleAuth().then(googleAuth => {
        storeUserSessionInLocalStorage(googleAuth);
        return googleAuth;
    });
}


export function googleSignOut() {
    return getGoogleAuth().then(googleAuth => {
        return googleAuth.signOut();
    }).then(() => {
        window.localStorage.removeItem(GA_CURRENT_USER);
    });
}



export function googleSignIn() {
    return window.getGoogleAuth().then(googleAuth => {
        return googleAuth.signIn().then(() => {
            storeUserSessionInLocalStorage(googleAuth);
        });
    });
}