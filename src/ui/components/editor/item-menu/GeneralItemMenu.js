import utils from '../../../../ui/utils.js';

const defaultItem = {
    interactive: false,
    opacity: 1.0,
    blendMode: 'normal',
    name: '',
    description: '',
    text: '',
    links: []
};

export default [{
    name: 'Rect',
    svg: `<rect x="3" y="6" width="37" height="24" stroke-width="3" stroke-color="#111" fill="#fff"></rect>`,
    item: utils.extendObject({
        shape: 'rect',
        shapeProps: {}
    }, defaultItem)
}, {
    name: 'Ellipse',
    item: utils.extendObject({
        shape: 'ellipse',
        shapeProps: {}
    }, defaultItem)
}, {
    name: 'Overlay',
    item: utils.extendObject({
        shape: 'rect',
        opacity: 0.2,
        shapeProps: {
            strokeSize: 1,
            strokeColor: '#000',
            fillColor: '#fff'
        },
        behavior: [ {
            on: {
                originator: 'self',
                event: 'mousein', // simulates hover event only once when cursor enters element
                args: []
            },
            do: [{
                item: 'self',
                method: 'set',
                args: ['opacity', 0.5]
            }]
        }, {
            on: {
                originator: 'self',
                event: 'mouseout',
                args: []
            },
            do: [{
                item: 'self',
                method: 'set',
                args: ['opacity', 0.1]
            }]
        } ]
    }, defaultItem)
}, {
    name: 'Image',
    imageProperty: 'shapeProps.backgroundImage',
    item: utils.extendObject({
        shape: 'rect',
        shapeProps: {
            strokeSize: 0,
            fillColor: 'rgba(255, 255, 255, 1.0)'
        }
    }, defaultItem)
}, {
    name: 'Comment',
    item: utils.extendObject({
        shape: 'comment',
        text: 'Text...',
        shapeProps: {
            fontSize: 8,
            cornerRadius: 5,
            tailLength: 7,
            tailWidth: 4
        }
    }, defaultItem)
}, {
    name: 'Text',
    item: utils.extendObject({
        shape: 'none',
        text: 'Text ...',
        shapeProps: {
            fontSize: 9
        }
    }, defaultItem)
}];