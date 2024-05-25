/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import myMath from "../../../../myMath";

export default {
    shapeConfig: {
        shapeType: 'standard',

        id: 'donut_segment',

        menuItems: [{
            group: 'Basic Shapes',
            name: 'Donut Segment',
            iconUrl: '/assets/images/items/donut-segment.svg',
            size: {w: 60, h: 60},
            previewArea: {x: 0, y: 0, w: 150, h: 150, r: 0},
        }],

        computePath(item) {
            const cx = item.area.w/2;
            const cy = item.area.h/2;
            const r = Math.min(item.area.w, item.area.h) / 2;
            const rh = r * myMath.clamp(item.shapeProps.hole, 0, 100) / 100;

            if (item.shapeProps.percent < 0.0001) {
                return `M ${cx} ${cy - rh} L ${cx} ${cy - r}`;
            } else if (item.shapeProps.percent > 99.99) {
                return `M ${cx-r} ${cy}
                    A ${r} ${r} 0 1 1 ${cx+r} ${cy}
                    A ${r} ${r} 0 1 1 ${cx-r} ${cy}
                    M ${cx+rh} ${cy}
                    A ${rh} ${rh} 0 1 0 ${cx-rh} ${cy}
                    A ${rh} ${rh} 0 1 0 ${cx+rh} ${cy} Z`;
            }

            const radians = 2 * Math.PI * item.shapeProps.percent / 100;

            const sx = cx + Math.sin(radians) * r;
            const sy = cy - Math.cos(radians) * r;

            const shx = cx + Math.sin(radians) * rh;
            const shy = cy - Math.cos(radians) * rh;

            const largeArcFlag = item.shapeProps.percent < 50 ? 0 : 1;
            return `M ${cx} ${cy-rh}
                L ${cx} ${cy-r}
                A ${r} ${r} 0 ${largeArcFlag} 1 ${sx} ${sy}
                L ${shx} ${shy}
                A ${rh} ${rh} 0 ${largeArcFlag} 0 ${cx} ${cy-rh} Z`;
        },

        args: {
            percent  : {type: 'number', value: 75, min: 0, max: 100, name: 'Segment Percent (%)', description: 'Percent of the donut area that should be filled'},
            hole     : {type: 'number', value: 75, min: 0, max: 100, name: 'Donut Percent (%)'},
        },

    }
}

