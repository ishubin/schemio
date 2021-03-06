import utils from '../../../../ui/utils.js';
import {defaultItem} from '../../../scheme/Item';

export default [{
    name: 'Rect',
    iconUrl: '/assets/images/items/rect.svg',
    item: utils.extendObject({
        shape: 'rect',
        shapeProps: {cornerRadius: 0}
    }, defaultItem)
}, {
    name: 'Rounded Rect',
    iconUrl: '/assets/images/items/rounded-rect.svg',
    item: utils.extendObject({
        shape: 'rect',
        shapeProps: {cornerRadius: 20}
    }, defaultItem)
}, {
    name: 'Ellipse',
    iconUrl: '/assets/images/items/ellipse.svg',
    item: utils.extendObject({
        shape: 'ellipse',
        shapeProps: {}
    }, defaultItem)
}, {
    name: 'N-Polygon',
    iconUrl: '/assets/images/items/npolygon.svg',
    item: utils.extendObject({
        shape: 'npoly',
        shapeProps: {}
    }, defaultItem)
}, {
    name: 'Curve',
    iconUrl: '/assets/images/items/curve.svg',
    item: utils.extendObject({
        shape: 'curve',
        shapeProps: {
            connector: false,
            points:[{"t":"B","x":30.570165745856354,"x1":-8.006471981057615,"x2":8.006471981057615,"y":44.03495504174695,"y1":14.115847784200385,"y2":-14.115847784200385},{"t":"B","x":19.652249408050515,"x1":-19.652249408050515,"x2":19.652249408050515,"y":10.384071933204881,"y1":10.384071933204881,"y2":-10.384071933204881},{"t":"B","x":61.14033149171271,"x1":-17.468666140489344,"x2":17.468666140489344,"y":29.07540141297367,"y1":-2.5960179833012202,"y2":2.5960179833012202},{"t":"B","x":97.53338595106553,"x1":-16.740805051302292,"x2":16.740805051302292,"y":20.768143866409762,"y1":-11.941682723185616,"y2":11.941682723185616},{"t":"B","x":105.53985793212311,"x1":26.202999210734017,"x2":-26.202999210734017,"y":52.43956326268464,"y1":-10.903275529865125,"y2":10.903275529865125},{"t":"B","x":61.14033149171271,"x1":21.107971586424625,"x2":-21.107971586424625,"y":58.15080282594734,"y1":-10.384071933204881,"y2":10.384071933204881},{"t":"B","x":61.14033149171271,"x1":23.561681767608952,"x2":-23.561681767608952,"y":82.5533718689788,"y1":-7.268850353243417,"y2":7.268850353243417},{"t":"B","x":13.829360694554063,"x1":1.455722178374112,"x2":-1.455722178374112,"y":66.97726396917147,"y1":18.172125883108542,"y2":-18.172125883108542}],
            closed: true,
        }
    }, defaultItem)
}, {
    name: 'Curly Bracket',
    iconUrl: '/assets/images/items/curly-bracket.svg',
    item: utils.extendObject({
        shape: 'bracket',
        shapeProps: {
            fill: {type: 'none'},
            style: 'curly',
        }
    }, defaultItem),
    area: {x: 5, y: 30, w: 130, h: 15, r: 0},
}, {
    name: 'Square Bracket',
    iconUrl: '/assets/images/items/square-bracket.svg',
    item: utils.extendObject({
        shape: 'bracket',
        shapeProps: {
            fill: {type: 'none'},
            style: 'square'
        }
    }, defaultItem),
    area: {x: 5, y: 30, w: 130, h: 15, r: 0},
}, {
    name: 'Round Bracket',
    iconUrl: '/assets/images/items/round-bracket.svg',
    item: utils.extendObject({
        shape: 'bracket',
        shapeProps: {
            fill: {type: 'none'},
            style: 'round'
        }
    }, defaultItem),
    area: {x: 5, y: 30, w: 130, h: 15, r: 0},
}, {
    name: 'Overlay',
    iconUrl: '/assets/images/items/overlay.svg',
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
    imageProperty: 'shapeProps.image',
    iconUrl: '/assets/images/items/image.svg',
    description: `
        It lets you upload an image or specify a link to external image
    `,
    item: utils.extendObject({
        shape: 'image',
        shapeProps: {
            image: '/assets/images/missing-scheme-preview.png'
        }
    }, defaultItem)
}, {
    name: 'Comment',
    iconUrl: '/assets/images/items/comment.svg',
    item: utils.extendObject({
        shape: 'comment',
        text: 'Text...',
        shapeProps: {
            fontSize: 8,
            cornerRadius: 5,
            tailLength: 20,
            tailWidth: 20,
            tailSide: 'bottom',
            tailPosition: 10
        },
    }, defaultItem),
    area: {x: 5, y: 5, w: 130, h: 60, r: 0},
}, {
    name: 'Text',
    iconUrl: '/assets/images/items/text.svg',
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
    iconUrl: '/assets/images/items/link.svg',
    item: utils.extendObject({
        shape: 'link',
        textSlots: { 
            link: {text: 'Link', fontSize: 16, padding: {left: 0, top: 0, bottom: 0, right: 0}, color: '#047EFB', halign: 'left', valign: 'top'}
        },
        shapeProps: { }
    }, defaultItem),
}, {
    name: 'Frame Player',
    iconUrl: '/assets/images/items/frame-player.svg',
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
    iconUrl: '/assets/images/items/code-block.svg',
    item: utils.extendObject({
        shape: 'code_block',
        shapeProps: { },
        textSlots: {
            title: {
                text: '<b>Code</b>',
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
    }, defaultItem)
}, {
    name: 'Button',
    iconUrl: '/assets/images/items/button.svg',
    item: utils.extendObject({
        shape: 'button',
        cursor: 'pointer',
        textSlots: { body: {text: '<b>Button</b>', color: '#fff'} },
        shapeProps: {
            strokeSize: 1,
            hoverTextColor: '#fff'
        }
    }, defaultItem),
    area: {x: 0, y: 0, w: 140, h: 60, r: 0},
}, {
    name: 'Dummy',
    iconUrl: '/assets/images/items/dummy.svg',
    description: `
        Dummy item can be used in order to group mulitple items together.
        It is only visible in the edit mode and completely transparent in view mode.
    `,
    item: utils.extendObject({
        shape: 'dummy',
        shapeProps: {cornerRadius: 0}
    }, defaultItem)
}, {
    name: 'HUD',
    iconUrl: '/assets/images/items/hud.svg',
    description: `
        HUD stands for Heads Up Display. 
        When going into view mode, HUD item will always be rendered in the viewport.
        This lets you design your own menu on top of the scheme which will always stay in the same place even if you drag screen`,
    item: utils.extendObject({
        shape: 'hud',
        shapeProps: {}
    }, defaultItem)
}];