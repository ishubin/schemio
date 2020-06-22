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
    name: 'Rect',
    iconUrl: '/images/items/rect.svg',
    item: utils.extendObject({
        shape: 'rect',
        shapeProps: {cornerRadius: 0}
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
    name: 'N-Polygon',
    iconUrl: '/images/items/npolygon.svg',
    item: utils.extendObject({
        shape: 'npoly',
        shapeProps: {}
    }, defaultItem)
}, {
    name: 'Curve',
    iconUrl: '/images/items/curve.svg',
    item: utils.extendObject({
        shape: 'curve',
        shapeProps: { }
    }, defaultItem)
}, {
    name: 'Curly Bracket',
    iconUrl: '/images/items/curly-bracket.svg',
    item: utils.extendObject({
        shape: 'bracket',
        shapeProps: {
            style: 'curly'
        }
    }, defaultItem)
}, {
    name: 'Square Bracket',
    iconUrl: '/images/items/square-bracket.svg',
    item: utils.extendObject({
        shape: 'bracket',
        shapeProps: {
            style: 'square'
        }
    }, defaultItem)
}, {
    name: 'Round Bracket',
    iconUrl: '/images/items/round-bracket.svg',
    item: utils.extendObject({
        shape: 'bracket',
        shapeProps: {
            style: 'round'
        }
    }, defaultItem)
}, {
    name: 'Overlay',
    iconUrl: '/images/items/overlay.svg',
    description: `
        It lets you create a clickable area on the image (or any other element of the scheme) and treat it like an object.
        E.g. you can select it, trigger events or connect it to other items on the page.
    `,
    item: utils.extendObject({
        shape: 'overlay',
        cursor: 'pointer',
        shapeProps: {
            showName: false
        },
    }, defaultItem)
}, {
    name: 'Image',
    imageProperty: 'shapeProps.fill.image',
    iconUrl: '/images/items/image.svg',
    description: `
        It lets you upload an image or specify a link to external image
    `,
    item: utils.extendObject({
        shape: 'rect',
        shapeProps: {
            strokeSize: 0,
            fill: {type: 'image', image: ''}
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
}, {
    name: 'Button',
    iconUrl: '/images/items/rounded-rect.svg',
    item: utils.extendObject({
        shape: 'button',
        cursor: 'pointer',
        shapeProps: {
            strokeSize: 1,
            strokeColor: '#3377A0',
            fillColor: '#209BC5',
            hoverFillColor: '#236CAB',
            textColor: '#ffffff',
            hoverTextColor: '#ffffff',
            cornerRadius: 5,
        },
    }, defaultItem)
}];