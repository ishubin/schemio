import forEach from 'lodash/forEach';

class RecentPropsChanges {
    constructor() {
        this.itemShapeProps = {};
        this.itemTextProps = {};
    }

    registerItemShapeProp(shape, propPath, value) {
        if (!this.itemShapeProps.hasOwnProperty(shape)) {
            this.itemShapeProps[shape] = {};
        }
        this.itemShapeProps[shape][propPath] = JSON.stringify(value);
    }
    
    applyItemProps(item) {
        const shapeProps = this.itemShapeProps[item.shape];
        if (shapeProps) {
            forEach(shapeProps, (propValue, propName) => {
                item.shapeProps[propName] = JSON.parse(propValue);
            });
        }

        const textProps = this.itemTextProps[item.shape];
        if (textProps) {
            forEach(textProps, (slotProps, slotName) => {
                if (item.textSlots && item.textSlots[slotName]) {
                    forEach(slotProps, (value, name) => {
                        item.textSlots[slotName][name] = JSON.parse(value);
                    });
                }
            });
        }
    }

    registerItemTextProp(shape, textSlotName, propName, value) {
        if (!this.itemTextProps.hasOwnProperty(shape)) {
            this.itemTextProps[shape] = {};
        }

        if (!this.itemTextProps[shape].hasOwnProperty(textSlotName)) {
            this.itemTextProps[shape][textSlotName] = {};
        }
        
        this.itemTextProps[shape][textSlotName][propName] = JSON.stringify(value);
    }
}

export default new RecentPropsChanges();