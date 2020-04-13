import utils from '../../../../ui/utils.js';

const defaultItem = {
    cursor: 'default',
    opacity: 100.0,
    blendMode: 'normal',
    name: '',
    description: '',
    text: '',
    links: [],
    behavior: {
        events: []
    }
};

export default [{
    name: 'Object',
    iconUrl: '/images/items/uml-object.svg',
    item: utils.extendObject({
        shape: 'uml_object',
        shapeProps: {}
    }, defaultItem)
}, {
    name: 'Module',
    iconUrl: '/images/items/uml-module.svg',
    item: utils.extendObject({
        shape: 'uml_module',
        shapeProps: {}
    }, defaultItem)
}, {
    name: 'Package',
    iconUrl: '/images/items/uml-package.svg',
    item: utils.extendObject({
        shape: 'uml_package',
        shapeProps: {}
    }, defaultItem)
}, {
    name: 'Node',
    iconUrl: '/images/items/uml-node.svg',
    item: utils.extendObject({
        shape: 'uml_node',
        shapeProps: {}
    }, defaultItem)
}]