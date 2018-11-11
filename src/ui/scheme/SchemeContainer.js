import _ from 'lodash';
import myMath from '../myMath.js';
/*
Providing access to scheme elements and provides modifiers for it
*/
class SchemeContainer {
    constructor(scheme) {
        this.scheme = scheme;
        this.selectedItems = [];
    }

    getItems() {
        return this.scheme.items;
    }

    findHoveredItem(x, y) {
        return _.find(this.scheme.items, item => myMath.isPointInArea(x, y, item.area));
    }

    selectItem(item, inclusive) {
        var isAlreadyIn = false;
        var i = 0;
        for (; i < this.selectedItems.length; i++) {
            if (this.selectedItems[i] === item) {
                isAlreadyIn = true;
                break;
            }
        }

        if (!isAlreadyIn) {
            this.selectedItems.push(item);
            item.selected = true;
        } else {
            item.selected = false;
            this.selectedItems.splice(i, 1);
        }

        console.log(this.selectedItems);
    }
}


export default SchemeContainer;
