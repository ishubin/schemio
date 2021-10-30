/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import {getStandardRectPins} from '../ShapeDefaults'


function computePath(item) {
    const w = item.area.w;
    const h = item.area.h;
    const r = Math.min(w, h) / 2;
    return `M ${r} 0 L ${w-r} 0 A ${r} ${r} 0 0 1 ${w-r} ${h} L ${r} ${h} A ${r} ${r} 0 0 1 ${r} 0 Z`;
}

export default {
    shapeConfig: {
        shapeType: 'standard',

        id: 'uml_start',

        menuItems: [{
            group: 'UML',
            name: 'Start/End',
            iconUrl: '/assets/images/items/uml-start.svg',
        }],

        getPins(item) {
            return getStandardRectPins(item);
        },

        computePath(item) {
            return computePath(item);
        },

        computeOutline(item) {
            return computePath(item);
        },

        args: { },
    }
}
