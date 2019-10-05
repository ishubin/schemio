import utils from '../../../../ui/utils.js';

const defaultItem = {
    cursor: 'default',
    opacity: 1.0,
    blendMode: 'normal',
    name: '',
    description: '',
    text: '',
    links: []
};

export default [{
    name: 'Rect',
    svg: `<rect x="3" y="6" width="32" height="22" stroke-width="2" stroke="rgba(30,30,30,1.0)" fill="rgba(240,240,240,1.0)"></rect>`,
    item: utils.extendObject({
        shape: 'rect',
        shapeProps: {}
    }, defaultItem)
}, {
    name: 'Rounded Rect',
    item: utils.extendObject({
        shape: 'rect',
        shapeProps: {cornerRadius: 20}
    }, defaultItem)
}, {
    name: 'Ellipse',
    item: utils.extendObject({
        shape: 'ellipse',
        shapeProps: {}
    }, defaultItem)
}, {
    name: 'Overlay',
    svg: `
        <path fill="#999" d="M 3 30  l 15 -6  l 20 0   l -15 6 Z"></path>
        <path fill="#777" style="opacity: 0.5" d="M 3 25  l 15 -6  l 20 0   l -15 6 Z"></path>
    `,
    item: utils.extendObject({
        shape: 'rect',
        opacity: 0.2,
        cursor: 'pointer',
        shapeProps: {
            strokeSize: 1,
            strokeColor: '#000',
            fillColor: '#fff'
        },
        behavior: [ {
            on: {
                originator: {item: 'self'},
                event: 'mousein', // simulates hover event only once when cursor enters element
                args: []
            },
            do: [{
                entity: {item: 'self'},
                method: 'set',
                args: ['opacity', 0.5]
            }]
        }, {
            on: {
                originator: {item: 'self'},
                event: 'mouseout',
                args: []
            },
            do: [{
                entity: {item: 'self'},
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
    svg: `
        <path fill="rgba(240,240,240,1.0)" stroke-width="2" stroke="rgba(30,30,30,1.0)" d="M 34 26  L 28 20  L 6 20   a 5 5 0 0 1 -5 -5  L 1 6  a 5 5 0 0 1 5 -5   L 29 1  a 5 5 0 0 1 5 5 Z"></path>
    `,
    shapeProps: {
        fontSize: 8,
        cornerRadius: 5,
        tailLength: 7,
        tailWidth: 4
    },
    item: utils.extendObject({
        shape: 'comment',
        text: 'Text...',
        shapeProps: { }
    }, defaultItem)
}, {
    name: 'Text',
    svg: `<text x="14" y="25" width="32" height="22" stroke-width="0" fill="#111" style="font-size:32px; font-family: Georgia; font-weight:bold;">A</text>`,
    item: utils.extendObject({
        shape: 'none',
        text: 'Text ...',
        shapeProps: { }
    }, defaultItem)
}, {
    name: 'Frame Player',
    svg: `<circle cx="16" cy="16" r="14"></circle>`,
    item: utils.extendObject({
        shape: 'frame_player',
        shapeProps: { }
    }, defaultItem)
}];