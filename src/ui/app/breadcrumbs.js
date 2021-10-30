/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import forEach from 'lodash/forEach';


export function buildBreadcrumbs(path) {
    let currentPath = '';

    const breadcrumbs = [{
        path: '',
        name: 'Home',
        kind: 'home'
    }];

    forEach(path.split('/'), dirName => {
        if (currentPath.length === 0) {
            currentPath = dirName;
        } else {
            currentPath = currentPath + '/' + dirName;
        }

        breadcrumbs.push({
            path: currentPath,
            name: dirName,
            kind: 'dir'
        });
    });

    return breadcrumbs;
}