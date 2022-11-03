/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { defaultifyObject, enrichObjectWithDefaults } from '../../defaultify';
import { defaultifyItem } from './Item';
import map from 'lodash/map';
import utils from '../utils';

const defaultScheme = {
    name: '',
    description: '',
    tags: [],
    categoryId: null,
    items: [],
    settings: {
        screen: {
            draggable: true,
        }
    },
    style: {
        backgroundColor:    'rgba(240, 240, 240, 1.0)',
        gridColor:          'rgba(128 ,128, 128, 0.2)',
        boundaryBoxColor:   'rgba(36, 182, 255, 1)',
        controlPointsColor: 'rgba(4,177,23, 1.0)',
        itemMarkerColor:    'rgba(36, 182, 255, 1)',
        itemMarkerToggled:  false
    }
};


export function enrichSchemeWithDefaults(scheme) {
    enrichObjectWithDefaults(scheme, defaultScheme);
}

export function defaultifyScheme(scheme) {
    const resultedScheme = defaultifyObject(scheme, defaultScheme);

    resultedScheme.items = map(resultedScheme.items, item => defaultifyItem(item));
    return resultedScheme;
}

export function prepareSchemeForSaving(scheme) {
    const schemeCopy = utils.clone(scheme);
    const sanitizedScheme = utils.sanitizeScheme(schemeCopy);
    return defaultifyScheme(sanitizedScheme);
}