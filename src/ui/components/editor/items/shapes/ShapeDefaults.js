/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
export function getStandardRectPins(item) {
    const w = item.area.w;
    const h = item.area.h;
    return [{
        x: w/2, y: h/2,
    }, {
        x: w / 2, y: 0,
        nx: 0, ny: -1
    }, {
        x: w / 2, y: h,
        nx: 0, ny: 1
    }, {
        x: 0, y: h/2,
        nx: -1, ny: 0
    }, {
        x: w, y: h/2,
        nx: 1, ny: 0
    }];
}