/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
export default {
    shapeConfig: {
        shapeType: 'standard',

        id: 'npoly',

        menuItems: [{
            group: 'Basic Shapes',
            name: 'N-Polygon',
            iconUrl: '/assets/images/items/npolygon.svg',
            size: {w: 60, h: 60},
            previewArea: {x: 0, y: 0, w: 150, h: 150, r: 0},
        }],

        computePath(item) {
            const cx = item.area.w/2;
            const cy = item.area.h/2;

            const corners = Math.max(3, item.shapeProps.corners);
            let path = '';

            for(let i = 0; i < corners; i++) {
                const x = item.area.w / 2 * Math.cos(i * 2* Math.PI / corners - Math.PI / 2 + item.shapeProps.angle * Math.PI / 180) + cx;
                const y = item.area.h / 2 * Math.sin(i * 2* Math.PI / corners - Math.PI / 2 + item.shapeProps.angle * Math.PI / 180) + cy;

                if (i === 0) {
                    path = `M ${x} ${y} `;
                }

                path += ` L ${x} ${y}`;
            }

            return path + ' Z';
        },

        args: {
            corners: {type: 'number', value: 6, name: 'Corners'},
            angle  : {type: 'number', value: 0, name: 'Angle'},
        },

    }
}