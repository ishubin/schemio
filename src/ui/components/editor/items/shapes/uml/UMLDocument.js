/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
function computePath(item) {
    const d = item.area.h / 8;
    const w = item.area.w;
    const h = item.area.h - d;
    const k = h / 2;
    return `M 0 0 L ${w} 0 L ${w} ${h} C ${w/2} ${h-k} ${w/2} ${h+k} 0 ${h} Z`;
}

export default {
    shapeConfig: {
        shapeType: 'standard',

        id: 'uml_document',

        menuItems: [{
            group: 'UML',
            name: 'Document',
            iconUrl: '/assets/images/items/uml-document.svg',
            size: {w: 140, h: 100}
        }],

        getPins(item) {
            const d = item.area.h / 8;
            const w = item.area.w;
            const h = item.area.h - d;
            const k = h / 2;

            return {
                c: {
                    x: w/2, y: h/2,
                },
                t: {
                    x: w / 2, y: 0,
                    nx: 0, ny: -1
                },
                b: {
                    x: w / 2, y: h,
                    nx: 0, ny: 1
                },
                r: {
                    x: 0, y: h/2,
                    nx: -1, ny: 0
                },
                l: {
                    x: w, y: h/2,
                    nx: 1, ny: 0
                }
            };

        },

        computePath(item) {
            return computePath(item);
        },

        args: { },
    }
}

