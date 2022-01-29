/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

function zeroPad(n) {
    if (n >=0 && n < 10) {
        return '0' + n;
    } else {
        return '' + n;
    }
}

export function applyVueFilters(vue) {
    vue.filter('formatDateTime', encodedDate => {
        const d = new Date(encodedDate);
        const z = zeroPad;
        return `${d.getFullYear()}.${z(d.getMonth()+1)}.${z(d.getDate())} ${z(d.getHours())}:${z(d.getMinutes())}`;
    });
}