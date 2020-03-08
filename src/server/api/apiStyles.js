/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

const styleStorage = require('../storage/storageProvider.js').provideStyleStorage();

const _ = require('lodash');

module.exports = {
    addToStylingPalette(req, res) {
        const userLogin = req.session.userLogin;
        if (!userLogin) {
            res.$notAuthorized();
            return;
        }
        
        const name = req.body.name;
        const shape = req.body.shape;
        const shapeProps = req.body.shapeProps;
        if (!shape || !shapeProps) {
            res.$badRequest();
            return;
        }
        styleStorage.addStyle(userLogin, name, shape, shapeProps).then(() => {
            res.json({
                name, shape, shapeProps
            });
        });
    },

    getShapeStylePalette(req, res) {
        const userLogin = req.session.userLogin;
        if (!userLogin) {
            res.$notAuthorized();
            return;
        }
        
        const shape = req.params.shape;

        styleStorage.getShapeStyles(userLogin, shape).then(styles => {
            res.json(_.map(styles, style => {
                return {
                    name: style.name,
                    shapeProps: style.shapeProps
                };
            }));
        });
    }
};