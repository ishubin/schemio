<!-- This Source Code Form is subject to the terms of the Mozilla Public
     License, v. 2.0. If a copy of the MPL was not distributed with this
     file, You can obtain one at https://mozilla.org/MPL/2.0/. -->
<template>
    <g>
        <AdvancedFill :fillId="`fill-pattern-${item.id}`" :fill="item.shapeProps.fill" :area="rectArea"/>
        <path
            :d="shapePath"
            :stroke="shapeStroke"
            :stroke-width="item.shapeProps.strokeSize + 'px'"
            :fill="svgFill"
            />
        <line
            :x1="item.area.w/2" :y1="Math.max(0, Math.min(item.shapeProps.size, item.area.h))"
            :x2="item.area.w/2" :y2="item.area.h"
            :stroke="item.shapeProps.strokeColor"
            :stroke-dasharray="strokeDashArray"
            :stroke-dashoffset="item.meta.strokeOffset"
            :stroke-width="item.shapeProps.strokeSize + 'px'"
        />
    </g>
</template>

<script>
import myMath from '../../../../../myMath';
import EditorEventBus from '../../../EditorEventBus';
import AdvancedFill from '../../AdvancedFill.vue';
import {computeSvgFill} from '../../AdvancedFill.vue';
import StrokePattern from '../../StrokePattern';
import {createRoundRectPath} from '../ShapeDefaults';
import {computeActorPath} from './UMLActor.vue';

const K = 3;

function computePath(item) {
    const h = myMath.clamp(item.shapeProps.size, 0, item.area.h);
    if (item.shapeProps.lifelineType === 'entity') {
        const r = Math.min(item.area.w / 2, h / 2);
        return `M ${item.area.w/2} ${r}  m ${r}, 0 a ${r},${r} 0 1,0 -${r*2},0 a ${r},${r} 0 1,0  ${r*2},0  M ${item.area.w/2-r} ${r*2} l ${r*2} 0`;

    } else if (item.shapeProps.lifelineType === 'border') {
        let r = Math.min(item.area.w / 2, h / 2);
        let d = r / K;
        const w = item.area.w /2;
        if (r + d > w) {
            r = w * K / 4;
            d = w / 4;
        }
        return `M ${item.area.w/2} ${r}  m ${r}, 0 a ${r},${r} 0 1,0 -${r*2},0 a ${r},${r} 0 1,0  ${r*2},0 `
            + `M ${item.area.w/2 - r - d} 0 l 0 ${r*2}`
            + `M ${item.area.w/2 - r - d} ${r} l ${d} 0`;

    } else if (item.shapeProps.lifelineType === 'control') {
        const r = Math.min(item.area.w / 2, h / 2);
        const d = r / 4;
        return `M ${item.area.w/2} ${r}  m ${r}, 0 a ${r},${r} 0 1,0 -${r*2},0 a ${r},${r} 0 1,0  ${r*2},0 `
            + `M ${item.area.w/2} 0 l ${d} ${-d} `
            + `M ${item.area.w/2} 0 l ${d} ${d}`;

    } else if (item.shapeProps.lifelineType === 'actor') {
        return computeActorPath(item.area.w, h);
    }
    return createRoundRectPath(item.area.w, h, item.shapeProps.cornerRadius);
};


export default {
    props: ['item', 'editorId'],
    components: {AdvancedFill},

    shapeConfig: {
        shapeType: 'vue',


        id: 'uml_lifeline',

        menuItems: [{
            group: 'UML',
            name: 'Lifeline',
            iconUrl: '/assets/images/items/lifeline-rect.svg',
            item: {
                shapeProps: {
                    lifelineType: 'rect'
                }
            },
            size: {w: 120, h: 300}
        }, {
            group: 'UML',
            name: 'Lifeline Entity',
            iconUrl: '/assets/images/items/lifeline-entity.svg',
            item: {
                area: {x: 0, y:0, w: 60, h: 200},
                shapeProps: {
                    lifelineType: 'entity'
                }
            },
            size: {w: 80, h: 300}
        }, {
            group: 'UML',
            name: 'Lifeline Border',
            iconUrl: '/assets/images/items/lifeline-border.svg',
            item: {
                area: {x: 0, y:0, w: 60, h: 200},
                shapeProps: {
                    lifelineType: 'border'
                }
            },
            size: {w: 80, h: 300}
        }, {
            group: 'UML',
            name: 'Lifeline Control',
            iconUrl: '/assets/images/items/lifeline-control.svg',
            item: {
                area: {x: 0, y:0, w: 60, h: 200},
                shapeProps: {
                    lifelineType: 'control'
                }
            },
            size: {w: 80, h: 300}
        }, {
            group: 'UML',
            name: 'Lifeline Actor',
            iconUrl: '/assets/images/items/lifeline-actor.svg',
            item: {
                area: {x: 0, y:0, w: 60, h: 200},
                shapeProps: {
                    lifelineType: 'actor'
                }
            },
            size: {w: 20, h: 300},
            previewArea: {x: 0, y: 0, w: 20, h: 90, r: 0},
        }],

        computeOutline(item) {
            const y = myMath.clamp(item.shapeProps.size, 0, item.area.h);
            return `M ${item.area.w/2} ${y} L ${item.area.w/2} ${item.area.h} ` + createRoundRectPath(item.area.w, y, item.shapeProps.cornerRadius);
        },

        getPins(item) {
            return [];
        },

        // it doesn't support text slots
        getTextSlots(item) {
            const h = myMath.clamp(item.shapeProps.size, 0, item.area.h);
            let area = null;
            if (item.shapeProps.lifelineType === 'entity' || item.shapeProps.lifelineType === 'control') {
                const r = Math.min(item.area.w / 2, h / 2);
                area = { x: item.area.w/2 - r, y: 0, w: r*2, h: r*2};
            } else if (item.shapeProps.lifelineType === 'border') {
                const r = Math.min((item.area.w * K / (K+1)) / 2, h / 2);
                area = { x: item.area.w/2 - r, y: 0, w: r*2, h: r*2};
            } else {
                area = { x: 0, y: 0, w: item.area.w, h};
            }
            return [{
                name: 'body',
                area: area
            }];
        },

        controlPoints: {
            make(item) {
                const controls = {
                    size: {
                        x: item.area.w/2,
                        y: myMath.clamp(item.shapeProps.size, 0, item.area.h)
                    }
                };
                if (item.shapeProps.lifelineType === 'rect') {
                    controls.cornerRadius = {
                        x: Math.min(item.area.w, Math.max(item.area.w - item.shapeProps.cornerRadius, item.area.w/2)),
                        y: 0
                    };
                }
                return controls;
            },
            handleDrag(item, controlPointName, originalX, originalY, dx, dy) {
                if (controlPointName === 'cornerRadius') {
                    item.shapeProps.cornerRadius = Math.max(0, myMath.roundPrecise(item.area.w - Math.max(item.area.w/2, originalX + dx), 1));
                } else if (controlPointName === 'size') {
                    if (item.shapeProps.lifelineType === 'entity' || item.shapeProps.lifelineType === 'control') {
                        item.shapeProps.size = myMath.clamp(originalY+dy, 0, Math.min(item.area.h, item.area.w));
                        return;
                    }
                    if (item.shapeProps.lifelineType === 'border') {
                        item.shapeProps.size = myMath.clamp(originalY+dy, 0, Math.min(item.area.h, item.area.w * K / (K+1)));
                        return;
                    }
                    item.shapeProps.size = myMath.clamp(originalY+dy, 0, item.area.h);
                }
            }
        },

        args: {
            size         : {name: 'Size', type: 'number', value: 40, min: 0},
            fill         : {name: 'Fill', type: 'advanced-color', value: {type: 'solid', color: 'rgba(240, 240, 240, 1.0)'}},
            lifelineType : {name: 'Type', type: 'choice', value: 'rect', options: ['rect', 'entity', 'border', 'control', 'actor']},
            strokeColor  : {name: 'Stroke', type: 'color', value: 'rgba(0, 0, 0, 1)'},
            rectStroke   : {name: 'Rect stroke', type: 'boolean', value: true, depends: {lifelineType: 'rect'}},
            strokePattern: {type: 'stroke-pattern', value: 'dashed', name: 'Stroke pattern'},
            strokeSize   : {name: 'Stroke Size', type: 'number', value: 2},
            cornerRadius : {name: 'Stroke Size', type: 'number', value: 1, depends: {type: 'rect'}, min: 0},
        },
    },


    beforeMount() {
        EditorEventBus.item.changed.specific.$on(this.editorId, this.item.id, this.onItemChanged);
    },

    beforeDestroy() {
        EditorEventBus.item.changed.specific.$off(this.editorId, this.item.id, this.onItemChanged);
    },

    methods: {
        onItemChanged() {
            this.$forceUpdate();
        }
    },

    computed: {
        shapePath() {
            return computePath(this.item);
        },

        strokeDashArray() {
            return StrokePattern.createDashArray(this.item.shapeProps.strokePattern, this.item.shapeProps.strokeSize);
        },

        svgFill() {
            return computeSvgFill(this.item.shapeProps.fill, `fill-pattern-${this.item.id}`);
        },

        rectArea() {
            const h = myMath.clamp(this.item.shapeProps.size, 0, this.item.area.h);
            return {
                x: 0, y: 0, w: this.item.area.w, h: h
            };
        },

        shapeStroke() {
            if (this.item.shapeProps.lifelineType === 'rect' && !this.item.shapeProps.rectStroke) {
                return 'none';
            }
            return this.item.shapeProps.strokeColor;
        }
    }
}
</script>