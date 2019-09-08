/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import _ from 'lodash';

const SCHEME_SETTINGS = 'scheme-settings';
const DEFAULT_SCHEME_SETTINGS = {schemes: {}};
class SettingsStorage {
    constructor() {
        this.storage = window.localStorage;
    }

    saveItem(itemName, obj) {
        this.storage.setItem(itemName, JSON.stringify(obj));
    }

    getItem(name, defaultValue) {
        const encodedJson = this.storage.getItem(name);
        if (encodedJson) {
            return JSON.parse(encodedJson);
        } else {
            return defaultValue;
        }
    }

    /**
     * Return a value from local storage for a given name, only if it matches one of allowedValues
     * In case it doesn't match - it returns a value at a defaultIndex position in allowedValues array
     * @param {string} name 
     * @param {Array} allowedValues 
     * @param {number} defaultIndex 
     */
    getItemFromAllowedValues(name, allowedValues, defaultIndex) {
        const value = this.getItem(name);
        if (_.includes(allowedValues, value)) {
            return value;
        } else {
            return allowedValues[defaultIndex];
        }
    }

    saveSchemeSettings(schemeId, settings) {
        const storedItem = this.getItem(SCHEME_SETTINGS, DEFAULT_SCHEME_SETTINGS);
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
        const storedItem = this.getItem(SCHEME_SETTINGS, DEFAULT_SCHEME_SETTINGS);
        if (storedItem.schemes.hasOwnProperty(schemeId)) {
            return storedItem.schemes[schemeId];
        }
        return null;
    }
}

export default new SettingsStorage();
