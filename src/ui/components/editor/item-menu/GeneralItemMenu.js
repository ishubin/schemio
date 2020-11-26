import utils from '../../../../ui/utils.js';
import {defaultItem} from '../../../scheme/Item';

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
            fill: {type: 'none'},
            style: 'curly',
        }
    }, defaultItem)
}, {
    name: 'Square Bracket',
    iconUrl: '/images/items/square-bracket.svg',
    item: utils.extendObject({
        shape: 'bracket',
        shapeProps: {
            fill: {type: 'none'},
            style: 'square'
        }
    }, defaultItem)
}, {
    name: 'Round Bracket',
    iconUrl: '/images/items/round-bracket.svg',
    item: utils.extendObject({
        shape: 'bracket',
        shapeProps: {
            fill: {type: 'none'},
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
        textSlots: {
            body: {
                text: 'Text ...'
            }
        },
        shapeProps: { }
    }, defaultItem)

}, {
    name: 'Link',
    iconUrl: '/images/items/link.svg',
    item: utils.extendObject({
        shape: 'link',
        textSlots: { 
            link: {text: 'Link', fontSize: 16, padding: {left: 0, top: 0, bottom: 0, right: 0}, color: '#047EFB', halign: 'left', valign: 'top'}
        },
        shapeProps: { }
    }, defaultItem),
    previewItem: utils.extendObject({
        shape: 'link',
        shapeProps: {
            url: 'http://example.com'
        },
        textSlots: { 
            link: {text: 'Link', fontSize: 16, padding: {left: 0, top: 0, bottom: 0, right: 0}, color: '#047EFB', halign: 'left', valign: 'top'}
        },
    }, defaultItem)

}, {
    name: 'Frame Player',
    iconUrl: '/images/items/frame-player.svg',
    item: utils.extendObject({
        shape: 'frame_player',
        shapeProps: { },
        textSlots: {
            title: {
                text: '<b>Frame Player</b>',
                color: '#000000',
                fontSize: 14
            }
        }
    }, defaultItem)
}, {
    name: 'Code Block',
    iconUrl: '/images/items/code-block.svg',
    item: utils.extendObject({
        shape: 'code_block',
        shapeProps: { },
        textSlots: {
            title: {
                text: '<b>Code Block</b>',
                halign: 'center',
                valign: 'middle',
                padding: {
                    top: 4,
                    left: 10,
                    right: 10,
                    bottom: 4
                }
            },
            body: {
                font: 'Courier New',
                text: '',
                halign: 'left',
                valign: 'top',
                whiteSpace: 'pre-wrap',
                padding: {
                    top: 10,
                    left: 10,
                    right: 10,
                    bottom: 10
                }
            }
        }
    }, defaultItem),
    previewItem: utils.extendObject({
        shape: 'code_block',
        shapeProps: { },
    }, defaultItem)
}, {
    name: 'Button',
    iconUrl: '/images/items/button.svg',
    item: utils.extendObject({
        shape: 'button',
        cursor: 'pointer',
        textSlots: { body: {text: '<b>Button</b>', color: '#fff'} },
        shapeProps: {
            strokeSize: 1,
            hoverTextColor: '#fff'
        }
    }, defaultItem),
    previewItem: utils.extendObject({
        shape: 'button',
        shapeProps: { },
        textSlots: { body: {text: '<b>Button</b>'} },
        shapeProps: {
            strokeSize: 1,
            hoverTextColor: '#fff'
        }
    }, defaultItem)
}, {
    name: 'Dummy',
    iconUrl: '/images/items/rect.svg',
    item: utils.extendObject({
        shape: 'dummy',
        shapeProps: {cornerRadius: 0}
    }, defaultItem)
}];