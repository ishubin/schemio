/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import {getStandardRectPins} from './ShapeDefaults'

export default {
    shapeConfig: {
        shapeType: 'empty',

        id: 'none',

        menuItems: [{
            group: 'General',
            name: 'Text',
            iconUrl: '/assets/images/items/text.svg',
            item: {
                textSlots: {
                    body: {
                        text: 'Text ...',
                        paddingLeft  : 0,
                        paddingRight : 0,
                        paddingTop   : 0,
                        paddingBottom: 0
                    }
                },
            }
        }],

        getPins(item) {
            return getStandardRectPins(item);
        },

        computePath(item) {
            const w = item.area.w;
            const h = item.area.h;
            return `M 0 0  L ${w} 0  L ${w} ${h}  L 0 ${h} Z`;
        },
        args: {},
    }
}