import utils from '../utils';

class RecentPropsChanges {
    constructor() {
        this.itemShapeProps = {};
    }

    registerItemProp(shape, propPath, value) {
        if (!this.itemShapeProps.hasOwnProperty(shape)) {
            this.itemShapeProps[shape] = {};
        }
        this.itemShapeProps[shape][propPath] = JSON.stringify(value);
    }
    
    applyItemProps(item, shape) {
        const shapeProps = this.itemShapeProps[shape];
        if (!shapeProps) {
            return;
        }

        for (let propPath in shapeProps) {
            if (shapeProps.hasOwnProperty(propPath)) {
                utils.setObjectProperty(item, propPath, JSON.parse(shapeProps[propPath]));
            }
        }
    }
}

export default new RecentPropsChanges();