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
    iconUrl: '/images/items/rect.svg',
    item: utils.extendObject({
        shape: 'rect',
        shapeProps: {}
    }, defaultItem)
}, {
    name: 'Rounded Rect',
    iconUrl: '/images/items/rounded-rect.svg',
    item: utils.extendObject({
        shape: 'rect',
        shapeProps: {cornerRadius: 20}
    }, defaultItem)
}, {
    name: 'Ellipse',
    iconUrl: '/images/items/ellipse.svg',
    item: utils.extendObject({
        shape: 'ellipse',
        shapeProps: {}
    }, defaultItem)
}, {
    name: 'Overlay',
    iconUrl: '/images/items/overlay.svg',
    description: `
        It lets you create a clickable area on the image (or any other element of the scheme) and treat it like an object.
        E.g. you can select it, trigger events or connect it to other items on the page.
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
                element: {item: 'self'},
                event: 'mousein', // simulates hover event only when cursor enters element
                args: []
            },
            do: [{
                element: {item: 'self'},
                method: 'set',
                args: ['opacity', 0.5]
            }]
        }, {
            on: {
                element: {item: 'self'},
                event: 'mouseout',
                args: []
            },
            do: [{
                element: {item: 'self'},
                method: 'set',
                args: ['opacity', 0.1]
            }]
        } ]
    }, defaultItem)
}, {
    name: 'Image',
    imageProperty: 'shapeProps.backgroundImage',
    iconUrl: '/images/items/image.svg',
    description: `
        It lets you uppload an image or specify a link to external image
    `,
    item: utils.extendObject({
        shape: 'rect',
        shapeProps: {
            strokeSize: 0,
            fillColor: 'rgba(255, 255, 255, 1.0)'
        }
    }, defaultItem)
}, {
    name: 'Comment',
    iconUrl: '/images/items/comment.svg',
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
    iconUrl: '/images/items/text.svg',
    item: utils.extendObject({
        shape: 'none',
        text: 'Text ...',
        shapeProps: { }
    }, defaultItem)

}, {
    name: 'Link',
    iconUrl: '/images/items/link.svg',
    item: utils.extendObject({
        shape: 'link',
        shapeProps: { }
    }, defaultItem),
    previewItem: utils.extendObject({
        shape: 'link',
        shapeProps: {
            url: 'http://example.com'
        },
        text: 'http://example.com',
    }, defaultItem)

}, {
    name: 'Frame Player',
    iconUrl: '/images/items/frame-player.svg',
    item: utils.extendObject({
        shape: 'frame_player',
        shapeProps: { }
    }, defaultItem)
}, {
    name: 'Code Block',
    iconUrl: '/images/items/code-block.svg',
    item: utils.extendObject({
        shape: 'code_block',
        shapeProps: { }
    }, defaultItem),
    previewItem: utils.extendObject({
        shape: 'code_block',
        shapeProps: { },
        text: 'var x = 123.0;'
    }, defaultItem)
}];