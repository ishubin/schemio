/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

const shortid           = require('shortid');
const _                 = require('lodash');
const config            = require('../../config.js');
const mongo             = require('./Mongo.js');

const STYLES_VERSION    = 1;


class MongoStyleStorage {
    _styles() {
        return mongo.db().collection('styles');
    }

    addStyle(userLogin, name, shape, shapeProps) {
        const style = {
            id: shortid.generate(), version: STYLES_VERSION, userLogin, name, shape, shapeProps
        };
        return this._styles().insertOne(style).then(result => {
            return style;
        });
    }

    getShapeStyles(userLogin, shape) {
        return this._styles().find({
            userLogin   : mongo.sanitizeString(userLogin),
            shape       : mongo.sanitizeString(shape)
        }).toArray();
    }

    deleteStyle(userLogin, shape, styleId) {
        return this._styles().deleteOne({
            userLogin   : mongo.sanitizeString(userLogin),
            shape       : mongo.sanitizeString(shape),
            id          : mongo.sanitizeString(styleId)
        });
    }
}


module.exports = MongoStyleStorage;