import _ from 'lodash';
import myMath from '../myMath.js';
/*
Providing access to scheme elements and provides modifiers for it
*/
class SchemeContainer {
    constructor(scheme) {
        this.scheme = scheme;
        this.selectedItems = [];
        this.sortedItemsIndex = null;
        this.reindexItems();
    }

    reindexItems() {
        var sortedItems = [].concat(this.scheme.items);
        sortedItems.sort((a,b) => {
            var areaA = a.area.w * a.area.h,
                areaB = b.area.w * b.area.h;
            return areaA - areaB;
        });
        return this.sortedItemsIndex = sortedItems;
    }

    addItem(item) {
        this.scheme.items.push(item);
        this.reindexItems();
    }

    getItems() {
        return this.scheme.items;
    }

    findHoveredItem(x, y) {
        return _.find(this.sortedItemsIndex, item => myMath.isPointInArea(x, y, item.area));
    }

    selectItem(item, inclusive) {
        if (inclusive) {
            this.selectItemInclusive();
        } else {
            this.deselectAllItems();
            item.selected = true;
            this.selectedItems.push(item);
        }
    }

    selectItemInclusive(item) {
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
    }

    deselectAllItems() {
        _.forEach(this.selectedItems, item => {
            item.selected = false;
        });
        this.selectedItems = [];
    }
}


export default SchemeContainer;
