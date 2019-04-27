/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */



class SchemeStorage {

    getScheme(schemeId) {
        return Promise.resolve(null);
    }

    createScheme(scheme) {
        return Promise.resolve(null);
    }

    saveScheme(schemeId, scheme) {
        return  Promise.resolve(null);
    }

    deleteScheme(schemeId) {
        return Promise.resolve(null);
    }

    findSchemes(searchQuery) {
        return Promise.resolve(null);
    }

    getTags() {
        return Promise.resolve(null);
    }
}

module.exports = SchemeStorage;
