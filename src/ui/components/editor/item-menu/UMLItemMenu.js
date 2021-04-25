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
    iconUrl: '/assets/images/items/uml-object.svg',
    item: utils.extendObject({
        textSlots: {
            title: {text: '<b>Object</b>', fontSize: 16, halign: 'center', valign: 'middle', padding: {top: 6}},
            body: {text: '<ul><li>Property</li></ul>', fontSize: 14, font: 'Courier New', halign: 'left', valign: 'top'}
        },
        shape: 'uml_object',
        shapeProps: {}
    }, defaultItem)
}, {
    name: 'Module',
    iconUrl: '/assets/images/items/uml-module.svg',
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
    iconUrl: '/assets/images/items/uml-package.svg',
    item: utils.extendObject({
        shape: 'uml_package',
        shapeProps: {}
    }, defaultItem)
}, {
    name: 'Node',
    iconUrl: '/assets/images/items/uml-node.svg',
    item: utils.extendObject({
        shape: 'uml_node',
        shapeProps: {}
    }, defaultItem)
}, {
    name: 'Start/End',
    iconUrl: '/assets/images/items/uml-start.svg',
    item: utils.extendObject({
        shape: 'uml_start',
        shapeProps: {}
    }, defaultItem)
}, {
    name: 'Input/Output',
    iconUrl: '/assets/images/items/uml-input.svg',
    item: utils.extendObject({
        shape: 'uml_input',
        shapeProps: {}
    }, defaultItem)
}, {
    name: 'Database',
    iconUrl: '/assets/images/items/uml-database.svg',
    item: utils.extendObject({
        shape: 'uml_database',
        shapeProps: {}
    }, defaultItem)
}, {
    name: 'Actor',
    iconUrl: '/assets/images/items/uml-actor.svg',
    item: utils.extendObject({
        shape: 'uml_actor',
        shapeProps: {}
    }, defaultItem),
    area: {x: 0, y: 0, w: 30, h: 90, r: 0},
}]