/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

const shortid           = require('shortid');
const mongo             = require('./Mongo.js');

const STYLES_VERSION    = 1;


class MongoStyleStorage {
    _styles() {
        return mongo.db().collection('styles');
    }

    addStyle(userLogin, fill, strokeColor, textColor) {
        const style = {
            id: shortid.generate(), version: STYLES_VERSION, userLogin, fill, strokeColor, textColor
        };
        return this._styles().insertOne(style).then(result => {
            return style;
        });
    }

    getStyles(userLogin) {
        return this._styles().find({
            userLogin   : mongo.sanitizeString(userLogin),
        }).toArray();
    }

    deleteStyle(userLogin, styleId) {
        return this._styles().deleteOne({
            userLogin   : mongo.sanitizeString(userLogin),
            id          : mongo.sanitizeString(styleId)
        });
    }
}


module.exports = MongoStyleStorage;