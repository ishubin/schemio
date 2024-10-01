import { createRoundRectPath } from "./ShapeDefaults";

function generateKeyOptions() {
    const opts = [
        'Space',
        'Left',
        'Right',
        'Up',
        'Down',
        'Enter',
        'Escape',
    ];

    for (let i = 65; i < 90; i++) {
        opts.push(String.fromCharCode(i));
    }

    for (let i = 48; i < 58; i++) {
        opts.push(String.fromCharCode(i));
    }
    return opts;
}

const keyOptions = generateKeyOptions();

export const KEYBIND_KEY_UP_EVENT = 'Key up';
export const KEYBIND_KEY_DOWN_EVENT = 'Key down';

export default {
    props: ['item', 'mode'],

    shapeConfig: {
        shapeType: 'standard',

        id: 'key_bind',

        menuItems: [{
            group: 'General',
            name: 'Key',
            iconUrl: '/assets/images/items/key-bind.svg',
            description: `
                Used for reacting on keyboard events
            `,
            item: {
                name: 'Key',
                shapeProps: {},
                textSlots: {
                    body: {
                        text: 'Key'
                    }
                }
            },
            previewArea: {x: 3, y: 30, w: 100, h: 100},
        }],

        computeOutline(item) {
            return createRoundRectPath(item.area.w, item.area.h, Math.min(item.area.w / 4, item.area.h / 4))
        },

        getTextSlots(item) {
            const R = Math.min(item.area.w/4, item.area.h/4);
            return [{
                name: 'body',
                area: {x: 0, y: 0, w: item.area.w, h: item.area.h*3/4}
            }]
        },

        computePath(item) {
            const w = item.area.w;
            const h = item.area.h;
            const R = Math.min(item.area.w/4, item.area.h/4);

            return `M ${w-R} ${h}  L ${R} ${h} a ${R} ${R} 0 0 1 ${-R} ${-R}  L 0 ${R}  a ${R} ${R} 0 0 1 ${R} ${-R}   L ${w-R} 0   a ${R} ${R} 0 0 1 ${R} ${R}  L ${w} ${h-R}   a ${R} ${R} 0 0 1 ${-R} ${R} Z`
                + `M ${w} ${h-2*R} a ${R} ${R} 0 0 1 ${-R} ${R} L ${R} ${h-R} a ${R} ${R} 0 0 1 ${-R} ${-R}`;
        },


        editorProps: {
            // flag to specify that it should only be rendered in edit mode
            onlyEditMode: true
        },

        getEvents(item) {
            const events = [];
            if (item.shapeProps.down) {
                events.push({
                    name: KEYBIND_KEY_DOWN_EVENT,
                    description: 'Triggered once when key is pressed'
                });
            }
            if (item.shapeProps.up) {
                events.push({
                    name: KEYBIND_KEY_UP_EVENT,
                    description: 'Triggered when key is being released'
                });
            }
            return events;
        },

        args: {
            key    : {type: 'choice', value: 'Space', options: keyOptions, name: 'Key', immutable: true},
            down   : {type: 'boolean', value: true, name: 'Key down event', immutable: true},
            up     : {type: 'boolean', value: true, name: 'Key up event', immutable: true},
            active : {type: 'boolean', value: true, name: 'Active'}
        }
    }
};