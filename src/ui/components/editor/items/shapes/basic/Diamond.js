/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import {getStandardRectPins} from '../ShapeDefaults'

function computePath(item) {
    const w = item.area.w;
    const h = item.area.h;
    return `M ${w/2} 0  L ${w} ${h/2}  L ${w/2} ${h}  L 0 ${h/2} Z`;
}

export default {
    shapeConfig: {
        shapeType: 'standard',

        id: 'basic_diamond',

        menuItems: [{
            group: 'Basic Shapes',
            name: 'Diamond',
            iconUrl: '/assets/images/items/basic-diamond.svg',
        }, {
            group: 'UML',
            name: 'Decision',
            iconUrl: '/assets/images/items/basic-diamond.svg',
        }],

        computePath(item) {
            return computePath(item);
        },

        getPins(item) {
            return getStandardRectPins(item);
        },

        args: { },
    }
}
