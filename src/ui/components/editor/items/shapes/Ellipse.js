/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import {createEllipsePath, getStandardRectPins} from './ShapeDefaults'

export default {
    shapeConfig: {
        shapeType: 'standard',

        id: 'ellipse',

        menuItems: [{
            group: 'Basic Shapes',
            name: 'Ellipse',
            iconUrl: '/assets/images/items/ellipse.svg',
        }],

        getPins(item) {
            return getStandardRectPins(item);
        },


        computePath(item) {
            return createEllipsePath(item.area.w, item.area.h);
        }
    }
}