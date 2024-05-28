/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

export default {
    shapeConfig: {
        shapeType: 'standard',

        id: 'pie_segment',

        menuItems: [{
            group: 'Basic Shapes',
            name: 'Pie Segment',
            iconUrl: '/assets/images/items/pie-segment.svg',
            size: {w: 60, h: 60},
            previewArea: {x: 0, y: 0, w: 150, h: 150, r: 0},
        }],

        computePath(item) {
            const cx = item.area.w/2;
            const cy = item.area.h/2;
            const r = Math.min(item.area.w, item.area.h) / 2;

            if (item.shapeProps.percent < 0.0001) {
                return `M ${cx} ${cy} L ${cx} ${cy - r}`;
            } else if (item.shapeProps.percent > 99.99) {
                return `M ${cx-r} ${cy} A ${r} ${r} 0 1 1 ${cx+r} ${cy}  A ${r} ${r} 0 1 1 ${cx-r} ${cy} Z`;
            }

            const radians = 2 * Math.PI * item.shapeProps.percent / 100;

            const sx = cx + Math.sin(radians) * r;
            const sy = cy - Math.cos(radians) * r;

            const largeArcFlag = item.shapeProps.percent < 50 ? 0 : 1;
            return `M ${cx} ${cy-r} A ${r} ${r} 0 ${largeArcFlag} 1 ${sx} ${sy} L ${cx} ${cy} Z`;
        },

        args: {
            percent  : {type: 'number', value: 75, min: 0, max: 100, name: 'Percent (%)', description: 'Percent of the circle area that should be filled'},
        },

    }
}
