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
        textSlots: {
            title: {text: '<b>Object</b>', fontSize: 16, halign: 'center', valign: 'middle', padding: {top: 6}},
            body: {text: '<p><ul><li>Property</li></ul></p>', fontSize: 14, font: 'Courier New', halign: 'left', valign: 'top'}
        },
        shape: 'uml_object',
        shapeProps: {}
    }, defaultItem)
}, {
    name: 'Module',
    iconUrl: '/images/items/uml-module.svg',
    item: utils.extendObject({
        shape: 'uml_module',
        textSlots: {
            title: {text: '<b>Module</b>', halign: 'center'},
            body: {text: '', halign: 'left'}
        },
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