import utils from '../utils';

class RecentPropsChanges {
    constructor() {
        this.itemShapeProps = {};
        this.connectorProps = {};
    }

    registerConnectorProp(propPath, value) {
        this.connectorProps[propPath] = value;
    }

    applyConnectorProps(connector) {
        for (let propPath in this.connectorProps) {
            if (this.connectorProps.hasOwnProperty(propPath)) {
                utils.setObjectProperty(connector, propPath, this.connectorProps[propPath]);
            }
        }
    }

    registerItemProp(shape, propPath, value) {
        if (!this.itemShapeProps.hasOwnProperty(shape)) {
            this.itemShapeProps[shape] = {};
        }
        this.itemShapeProps[shape][propPath] = value;
    }
    
    applyItemProps(item, shape) {
        const shapeProps = this.itemShapeProps[shape];
        if (!shapeProps) {
            return;
        }

        for (let propPath in shapeProps) {
            if (shapeProps.hasOwnProperty(propPath)) {
                utils.setObjectProperty(item, propPath, shapeProps[propPath]);
            }
        }
    }
}

export default new RecentPropsChanges();