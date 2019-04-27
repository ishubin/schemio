/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import _ from 'lodash';

const _knownTypes = [{
    name: 'default',
    fontAwesomeSymbol: '\uf0c1',
    cssClass: 'fa-link'
}, {
    name: 'scheme',
    fontAwesomeSymbol: '\uf542',
    cssClass: 'fa-project-diagram'
}, {
    name: 'logs',
    fontAwesomeSymbol: '\uf550',
    cssClass: 'fa-stream'
}, {
    name: 'graphs',
    fontAwesomeSymbol: '\uf201',
    cssClass: 'fa-chart-line'
}, {
    name: 'video',
    fontAwesomeSymbol: '\uf03d',
    cssClass: 'fa-video'
}];

export default {
    knownTypes: _knownTypes,
    findTypeByNameOrDefault(name) {
        var linkType = _.find(_knownTypes, t => t.name === name);
        if (linkType) {
            return linkType;
        } else {
            return _knownTypes[0];
        }
    }
}
