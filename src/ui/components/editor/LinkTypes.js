/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import find from 'lodash/find';

const _knownTypes = [{
    name: 'default',
    fontAwesomeSymbol: '\uf0c1',
    cssClass: 'fas fa-link'
}, {
    name: 'scheme',
    fontAwesomeSymbol: '\uf542',
    cssClass: 'fas fa-project-diagram'
}, {
    name: 'logs',
    fontAwesomeSymbol: '\uf550',
    cssClass: 'fas fa-stream'
}, {
    name: 'graphs',
    fontAwesomeSymbol: '\uf201',
    cssClass: 'fas fa-chart-line'
}, {
    name: 'video',
    fontAwesomeSymbol: '\uf03d',
    cssClass: 'fas fa-video'
}];

export default {
    knownTypes: _knownTypes,
    findTypeByNameOrDefault(name) {
        var linkType = find(_knownTypes, t => t.name === name);
        if (linkType) {
            return linkType;
        } else {
            return _knownTypes[0];
        }
    }
}
