/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

const SCHEME_SETTINGS = 'scheme-settings';
const DEFAULT_SCHEME_SETTINGS = {schemes: {}};
class SettingsStorage {
    constructor() {
        this.storage = window.localStorage;
    }

    saveSchemeSettings(schemeId, settings) {
        var storedItem = this.fetchLocalStorageItem(SCHEME_SETTINGS, DEFAULT_SCHEME_SETTINGS);
        if (!storedItem.schemes.hasOwnProperty(schemeId)) {
            storedItem.schemes[schemeId] = settings;
        } else {
            // copying fields in order to override existings other fields
            _.forEach(settings, (value, field) => {
                storedItem.schemes[schemeId][field] = value;
            });
        }
        storedItem.schemes[schemeId].modifiedDate = new Date().getTime();

        //TODO implement cleanup of scheme settings in local storage

        this.storage.setItem(SCHEME_SETTINGS, JSON.stringify(storedItem));
    }

    getSchemeSettings(schemeId) {
        var storedItem = this.fetchLocalStorageItem(SCHEME_SETTINGS, DEFAULT_SCHEME_SETTINGS);
        if (storedItem.schemes.hasOwnProperty(schemeId)) {
            return storedItem.schemes[schemeId];
        }
        return null;
    }

    fetchLocalStorageItem(name, defaultValue) {
        var encodedJson = this.storage.getItem(name);
        var storedItem = null;
        if (encodedJson) {
            storedItem = JSON.parse(encodedJson);
        } else {
            storedItem = defaultValue;
        }

        return storedItem;
    }
}

export default new SettingsStorage();
