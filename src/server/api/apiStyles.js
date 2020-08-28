/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

const styleStorage = require('../storage/storageProvider.js').provideStyleStorage();

const _ = require('lodash');

module.exports = {
    addToStylingPalette(req, res) {
        const userLogin   = req.session.userLogin;
        const fill        = req.body.fill;
        const strokeColor = req.body.strokeColor;

        styleStorage.addStyle(userLogin, fill, strokeColor).then(style => {
            res.json({
                id: style.id, fill, strokeColor
            });
        }).catch(res.$apiError);
    },

    getStylePalette(req, res) {
        const userLogin   = req.session.userLogin;

        styleStorage.getStyles(userLogin).then(styles => {
            res.json(_.map(styles, style => {
                return {
                    id         : style.id,
                    fill       : style.fill,
                    strokeColor: style.strokeColor
                };
            }));
        }).catch(res.$apiError);
    },

    deleteStyle(req, res) {
        const userLogin   = req.session.userLogin;
        const styleId     = req.params.styleId;

        styleStorage.deleteStyle(userLogin, styleId).then(() => {
            res.json({status: 'ok'});
        }).catch(res.$apiError);
    }
};