import forEach from 'lodash/forEach';
import config from './config';

const CONSENT_COOKIE = 'SchemioConsent';

export const CONSENT = {
    UI_SETTINGS: 1,
    ANALYTICS: 2,
    MARKETING: 3,
};

export const privacyConsent = {
    necessary: {
        name: 'Necessary cookies',
        description: `Some cookies are required to provide core functionality. The website won't function properly without these cookies and they are enabled by default and cannot be disabled.`,
        allowed: true,
        mandatory: true,
        id: 0,
    },
    uiSettings: {
        name: 'Preferences & UI Settings',
        description: `Uses <a href="https://en.wikipedia.org/wiki/Web_storage">localStorage</a> in your browser to save 
UI settings like popup positions, document zoom & screen offset, default item properties etc.`,
        allowed: false,
        mandatory: false,
        id: CONSENT.UI_SETTINGS,
    },
    analytics: {
        name: 'Analytical cookies',
        description: `Analytical cookies help us improve our website by collecting and reporting information on its usage. We use Google Analytics.
If you want to know more about analytics date you can read <a href="https://support.google.com/analytics/answer/6004245?hl=en">Google Analytics Privacy Policy</a>.`,
        allowed: false,
        mandatory: false,
        id: CONSENT.ANALYTICS
    },
    marketing: {
        name: 'Marketing cookies',
        description: 'Marketing cookies are used to track visitors across websites to allow publishers to display relevant and engaging advertisements',
        allowed: false,
        mandatory: false,
        id: CONSENT.MARKETING
    },
};


export function saveConsent(consent) {
    let consentMask = 1;

    forEach(consent, (consentPart, consentId) => {
        if (privacyConsent[consentId] && !privacyConsent[consentId].mandatory && consentPart.allowed) {
            privacyConsent[consentId].allowed = true;

            consentMask = consentMask | (1 << privacyConsent[consentId].id)
        }
    });
    
    const period = 1000 * 60 * 60 * 24 * 90; // 90 days
    const date = new Date();
    const expiryTime = parseInt(date.getTime()) + period;
    date.setTime(expiryTime);
    const utcTime = date.toUTCString();
    document.cookie = `${CONSENT_COOKIE}=${consentMask}; expires=${utcTime};`;
}


function findCookie(cookieName) {
    const cookies = document.cookie.split(';');
    for (let i = 0; i < cookies.length; i++) {
        const parts = cookies[i].split('=');
        const name = parts[0].trim();
        if (name === cookieName) {
            return parts[1].trim();
        }
    }
    return null;
}


function hasConsent(consentId) {
    if (!config.consent.enabled) {
        return true;
    }

    const consentMaskText = findCookie(CONSENT_COOKIE);
    if (consentMaskText) {
        const consentMask = parseInt(consentMaskText);
        const result = consentMask & (1 << consentId);
        return result > 0;
    }
    return false;
}


export function hasGivenConsent() {
    const consentMask = findCookie(CONSENT_COOKIE);
    if (consentMask) {
        return true;
    }
    return null;
}


export function hasUISettingsConsent() {
    return hasConsent(CONSENT.UI_SETTINGS);
}