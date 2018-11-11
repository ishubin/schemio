import _ from 'lodash';
import myMath from '../myMath.js';
/*
Providing access to scheme elements and provides modifiers for it
*/
class SchemeContainer {
    constructor(scheme) {
        this.scheme = scheme;
    }

    getItems() {
        return this.scheme.items;
    }

    findHoveredItem(x, y) {
        return _.find(this.scheme.items, item => myMath.isPointInArea(x, y, item.area));
    }
}


export default SchemeContainer;
