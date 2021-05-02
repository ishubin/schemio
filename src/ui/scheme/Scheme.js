import { defaultifyObject, enrichObjectWithDefaults } from '../../defaultify';
import { defaultifyItem } from './Item';
import map from 'lodash/map';

const defaultScheme = {
    name: '',
    description: '',
    tags: [],
    categoryId: null,
    items: [],
    style: {
        backgroundColor:    'rgba(240, 240, 240, 1.0)',
        gridColor:          'rgba(128 ,128, 128, 0.2)',
        boundaryBoxColor:   'rgba(36, 182, 255, 1)',
        controlPointsColor: 'rgba(4,177,23, 1.0)',
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
