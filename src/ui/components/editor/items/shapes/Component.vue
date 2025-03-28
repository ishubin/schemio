<!-- This Source Code Form is subject to the terms of the Mozilla Public
     License, v. 2.0. If a copy of the MPL was not distributed with this
     file, You can obtain one at https://mozilla.org/MPL/2.0/. -->
<template>
    <g>
        <advanced-fill :fillId="`fill-pattern-${item.id}`" :fill="item.shapeProps.fill" :area="item.area"/>
        <advanced-fill :fillId="`fill-pattern-button-${item.id}`" :fill="item.shapeProps.buttonFill" :area="item.area"/>
        <advanced-fill :fillId="`fill-pattern-button-hovered-${item.id}`" :fill="item.shapeProps.buttonHoverFill" :area="item.area"/>

        <path v-if="item.shapeProps.kind !== 'embedded'" :d="shapePath"
            :stroke-width="item.shapeProps.strokeSize + 'px'"
            :stroke="item.shapeProps.strokeColor"
            :stroke-dasharray="strokeDashArray"
            :stroke-dashoffset="item.meta.strokeOffset"
            :fill="svgFill"></path>

        <foreignObject v-if="item.shapeProps.kind !== 'embedded' && isBodySlotShown && bodyTextShown" :x="0" :y="0" :width="item.area.w" :height="bodyTextSlotHeight" >
            <div class="item-text-container" xmlns="http://www.w3.org/1999/xhtml" :style="bodyTextStyle" v-html="sanitizedBodyText"></div>
        </foreignObject>

        <g style="cursor: pointer;" v-if="!(isLoading && item.shapeProps.showProgressBar) && buttonShown && buttonArea.w > 0 && buttonArea.h > 0">

            <path v-if="buttonHovered"
                :fill="svgButtonHoverFill"
                :stroke-width="item.shapeProps.buttonStrokeSize + 'px'"
                :stroke="item.shapeProps.buttonStrokeColor"
                :d="buttonPath"
                />
            <path v-else :fill="svgButtonFill"
                :stroke-width="item.shapeProps.buttonStrokeSize + 'px'"
                :stroke="item.shapeProps.buttonHoverStrokeColor"
                :d="buttonPath"
                />

            <foreignObject v-if="isButtonSlotShown" :x="buttonArea.x" :y="buttonArea.y" :width="buttonArea.w" :height="buttonArea.h" >
                <div class="item-text-container" xmlns="http://www.w3.org/1999/xhtml" :style="textStyle" v-html="sanitizedButtonText"></div>
            </foreignObject>
        </g>

        <foreignObject v-if="isLoading && item.shapeProps.showProgressBar && progressBar.w > 0 && progressBar.h > 0" :x="progressBar.x" :y="progressBar.y" :width="progressBar.w" :height="progressBar.h" >
            <div class="progress-bar" :style="progressBarStyle"></div>
        </foreignObject>

        <g v-if="!isLoading && item.meta && item.meta.componentLoadFailed" style="cursor: pointer;">
            <rect  :x="0" :y="0" :width="item.area.w" :height="item.area.h" fill="rgba(250, 70, 70)"/>
            <foreignObject :x="0" :y="0" :width="item.area.w" :height="item.area.h" >
                <div class="item-text-container" :style="failureMessageStyle" xmlns="http://www.w3.org/1999/xhtml"><b>Loading failed</b></div>
            </foreignObject>
        </g>


        <g v-if="item.meta && item.meta.cyclicComponent">
            <rect  :x="0" :y="0" :width="item.area.w" :height="item.area.h" fill="rgba(250, 70, 70)"/>
            <foreignObject :x="0" :y="0" :width="item.area.w" :height="item.area.h" >
                <div class="item-text-container" :style="failureMessageStyle" xmlns="http://www.w3.org/1999/xhtml"><b>Cyclic dependency!</b></div>
            </foreignObject>
        </g>
    </g>
</template>

<script>
import {getStandardRectPins} from './ShapeDefaults'
import StrokePattern from '../StrokePattern.js';
import AdvancedFill from '../AdvancedFill.vue';
import {computeSvgFill} from '../AdvancedFill.vue';
import {generateTextStyle} from '../../text/ItemText';
import htmlSanitize from '../../../../../htmlSanitize';
import myMath from '../../../../myMath';
import shortid from 'shortid';
import EditorEventBus from '../../EditorEventBus';


const computePath = (item) => {
    const W = item.area.w;
    const H = item.area.h;

    const R = Math.min(item.shapeProps.cornerRadius, item.area.w/2, item.area.h/2);

    return `M ${W-R} ${H}  L ${R} ${H} a ${R} ${R} 0 0 1 ${-R} ${-R}  L 0 ${R}  a ${R} ${R} 0 0 1 ${R} ${-R}   L ${W-R} 0   a ${R} ${R} 0 0 1 ${R} ${R}  L ${W} ${H-R}   a ${R} ${R} 0 0 1 ${-R} ${R} Z`;
};

function calculateButtonArea(item, maxWidth, maxHeight) {
    const minPadding = 5;
    const itemMaxWidth = item.area.w - 2 * minPadding;
    const itemMaxHeight = item.area.h - 2 * minPadding;

    const w = Math.min(maxWidth, itemMaxWidth);
    const h = Math.min(maxHeight, itemMaxHeight);

    const x = (item.area.w - w) / 2;
    const y = Math.max(minPadding, item.area.h - h - 10);

    return { x, y, w, h };
}

export function computeButtonPath(item) {
    const area = calculateButtonArea(item, item.shapeProps.buttonWidth, item.shapeProps.buttonHeight);
    const R = Math.min(item.shapeProps.buttonCornerRadius, area.w/2, area.h/2);
    const X = area.x;
    const Y = area.y;
    const W = area.w;
    const H = area.h;
    return `M ${X+W-R} ${Y+H}  L ${X+R} ${Y+H} a ${R} ${R} 0 0 1 ${-R} ${-R}  L ${X} ${Y+R}  a ${R} ${R} 0 0 1 ${R} ${-R}   L ${X+W-R} ${Y}   a ${R} ${R} 0 0 1 ${R} ${R}  L ${X+W} ${Y+H-R}   a ${R} ${R} 0 0 1 ${-R} ${R} Z`;
}

export const COMPONENT_LOADED_EVENT = 'Component Loaded';
export const COMPONENT_FAILED = 'Component Failed';
export const COMPONENT_DESTROYED = 'Component Destroyed';

export function generateComponentGoBackButton(componentItem, containerItem, currentScreenTransform) {
    if (!componentItem.shapeProps.showBackButton || componentItem.shapeProps.kind !== 'external') {
        return null;
    }
    const btnWidth = 55;
    const btnHeight = 30;

    const sx = componentItem.area.w / (20 * btnWidth);
    const sy = componentItem.area.h / (20 * btnHeight);
    const scale = Math.max(sx, sy) * componentItem.shapeProps.backButtonScale;
    const buttonId = shortid.generate();
    return {
        id: buttonId,
        shape: 'rect',
        area: {
            x: 0 + componentItem.area.w - (btnWidth + componentItem.shapeProps.backButtonHPad) * scale,
            y: (btnHeight - componentItem.shapeProps.backButtonVPad) * scale,
            w: btnWidth, h: btnHeight,
            sx: scale, sy: scale, r: 0, px: 0, py: 0
        },
        textSlots: { },
        selfOpacity: 50,
        visible: true,
        cursor: 'pointer',
        shapeProps: {
            cornerRadius: componentItem.shapeProps.backButtonCornerRadius,
            strokeSize: 0,
            fill: componentItem.shapeProps.backButtonFill
        },
        childItems: [ {
            id: shortid.generate(),
            name: "back button icon",
            area: {
                x: 12, y: 5, w: 28, h: 18, r: 0, sx: 1, sy: 1, px: 0.5, py: 0.5
            },
            shape: "path",
            shapeProps: {
                paths: [ {
                    id: shortid.generate(),
                    closed: true,
                    points: [
                        { t: "L", x: 39.39, y: 19.05, id:  shortid.generate()},
                        { t: "L", x: 39.39, y: 0, id:  shortid.generate()},
                        { t: "L", x: 0, y: 28.57, id:  shortid.generate()},
                        { t: "L", x: 39.39, y: 57.14, id:  shortid.generate()},
                        { t: "L", x: 39.39, y: 38.1, id:  shortid.generate()},
                        { t: "A", x: 75.76, y: 38.1, h: 50, id:  shortid.generate()},
                        { t: "L", x: 75.76, y: 80.95, id:  shortid.generate()},
                        { t: "L", x: 51.52, y: 80.95, id:  shortid.generate()},
                        { t: "L", x: 51.52, y: 100, id:  shortid.generate()},
                        { t: "A", x: 75.76, y: 100, h: -47.05, id:  shortid.generate()},
                        { t: "L", x: 75.76, y: 19.05, id:  shortid.generate()}
                    ],
                    pos: "relative"
                } ],
                fill: {
                    type: "solid",
                    color: componentItem.shapeProps.backButtonTextColor
                },
                strokeColor:componentItem.shapeProps.backButtonTextColor,
                strokeSize: 2,
                strokePattern: "solid"
            },
            textSlots: { },
            opacity: 100,
            selfOpacity: 100,
            visible: true,
            blendMode: "normal",
            cursor: "default",
            clip: false,
            mount: true,
            effects: [ ],
            description: "",
            interactionMode: "tooltip",
            autoLayout: {
                on: false,
                rules: { }
            },
            behavior: {
                events: [ ],
                dragging: "none",
                dropTo: "",
                dragPath: "",
                dragPathAlign: false,
                dragPathRotation: 0
            },
            tooltipBackground: "rgba(230,230,230,1.0)",
            tooltipColor: "rgba(30,30,30,1.0)",
            classes: [ ],
        }, {
            id: shortid.generate(),
            name: 'back button overlay',
            shape: 'rect',
            area: {
                x: 0,
                y: 0,
                w: btnWidth, h: btnHeight,
                sx: 1, sy: 1, r: 0, px: 0, py: 0
            },
            cursor: 'pointer',
            shapeProps: {
                fill: {
                    type: 'solid',
                    color: 'rgba(255,255,255,0.0)'
                },
                cornerRadius: componentItem.shapeProps.backButtonCornerRadius,
                strokeSize: 0,
            },
            behavior: {
                events: [ {
                    id: shortid.generate(),
                    event: 'clicked',
                    actions: [ {
                        id: shortid.generate(),
                        element: '#' + componentItem.id,
                        method: '_transformScreen',
                        args: {
                            x: currentScreenTransform.x,
                            y: currentScreenTransform.y,
                            scale: currentScreenTransform.scale,
                            inBackground: true
                        }
                    }, {
                        id: shortid.generate(),
                        element: '#' + containerItem.id,
                        method: 'hide',
                        args: { }
                    }, {
                        id: shortid.generate(),
                        element: '#' + componentItem.id,
                        method: 'destroyComponent',
                        args: { }
                    }]
                }, {
                    id: shortid.generate(),
                    event: 'mousein',
                    actions: [ {
                        id: shortid.generate(),
                        element: `#${buttonId}`,
                        method: 'set',
                        args: {
                            field: 'selfOpacity',
                            value: 100,
                            animated: true,
                            animationDuration: 0.2,
                            transition: 'ease-in-out',
                            inBackground: false
                        }
                    }]
                }, {
                    id: shortid.generate(),
                    element: `#${buttonId}`,
                    actions: [ {
                        id: shortid.generate(),
                        element: 'self',
                        method: 'set',
                        args: {
                            field: 'selfOpacity',
                            value: 50,
                            animated: true,
                            animationDuration: 0.2,
                            transition: 'ease-in-out',
                            inBackground: false
                        }
                    }]
                }]
            }
        } ]
    }
}

export default {
    props: ['item', 'editorId', 'mode'],
    components: {AdvancedFill},

    shapeConfig: {
        shapeType: 'vue',

        id: 'component',

        menuItems: [{
            group: 'General',
            name: 'Component',
            iconUrl: '/assets/images/items/component.svg',
            description: `
                Lets you embed other documents into this item.
            `,
            item: {
                textSlots: {
                    body: {
                        text: 'Component',
                        valign: 'middle',
                        halign: 'center',
                        paddingLeft  : 0,
                        paddingRight : 0,
                        paddingTop   : 0,
                        paddingBottom: 0
                    },
                    button: {
                        text: 'Load more',
                        paddingLeft  : 0,
                        paddingRight : 0,
                        paddingTop   : 0,
                        paddingBottom: 0
                    }
                }
            }
        }],

        getPins(item) {
            return getStandardRectPins(item);
        },

        getTextSlots(item) {
            if (item.shapeProps.kind === 'embedded') {
                return [];
            }
            const btnArea = calculateButtonArea(item, item.shapeProps.buttonWidth, item.shapeProps.buttonHeight);
            let h = item.area.h;
            let hasButton = false;
            if (item.shapeProps.kind === 'external' && item.shapeProps.showButton) {
                h = btnArea.y;
                hasButton = true;
            }
            const textSlots = [{
                name: 'body',
                area: {x: 0, y: 0, w: item.area.w, h}
            }];

            if (hasButton) {
                textSlots.push({
                    name: 'button',
                    area: btnArea
                });
            }
            return textSlots;
        },

        onMouseDown(editorId, item, customAreaId, x, y) {
            EditorEventBus.item.custom.$emit('mouse-down', editorId, item.id, customAreaId);
        },

        onMouseMove(editorId, item, customAreaId, x, y) {
            EditorEventBus.item.custom.$emit('mouse-move', editorId, item.id, customAreaId);
        },

        computeCustomAreas(item) {
            if (item.shapeProps.kind === 'embedded' || (item.meta && item.meta.componentLoadFailed)) {
                return [];
            }
            return [{
                id: 'load-button',
                cursor: 'pointer',
                path: computeButtonPath(item)
            }];
        },

        computePath,

        controlPoints: {
            make(item) {
                const points = {
                    cornerRadius: {
                        x: Math.min(item.area.w, Math.max(item.area.w - item.shapeProps.cornerRadius, item.area.w/2)),
                        y: 0
                    }
                };

                if (item.shapeProps.kind === 'external' && item.shapeProps.showButton) {
                    const btnArea = calculateButtonArea(item, item.shapeProps.buttonWidth, item.shapeProps.buttonHeight);
                    points['buttonCornerRadius'] = {
                        x: btnArea.x + btnArea.w - Math.min(item.shapeProps.buttonCornerRadius, btnArea.w / 2, btnArea.h / 2),
                        y: btnArea.y
                    };
                }
                return points;
            },
            handleDrag(item, controlPointName, originalX, originalY, dx, dy) {
                if (controlPointName === 'cornerRadius') {
                    item.shapeProps.cornerRadius = Math.max(0, myMath.roundPrecise(item.area.w - Math.max(item.area.w/2, originalX + dx), 1));
                } else if (controlPointName === 'buttonCornerRadius') {
                    const btnArea = calculateButtonArea(item, item.shapeProps.buttonWidth, item.shapeProps.buttonHeight);
                    item.shapeProps.buttonCornerRadius = Math.min(btnArea.h / 2, btnArea.w / 2, Math.max(0, myMath.roundPrecise(btnArea.x + btnArea.w - originalX - dx)));
                }
            }
        },

        args: {
            kind                  : {type: 'choice', value: 'external', name: 'Kind', options: ['external', 'embedded'],  description: 'External - allows to fetch other documents and render them inside the component. Embedded - uses the items in the same document'},
            schemeId              : {type: 'scheme-ref', value: '', name: 'External Document', depends: {kind: 'external'}, description: 'ID of the document that this component should load'},
            referenceItem         : {type: 'element', name: 'Item', depends: {kind: 'embedded'}, description: 'Reference item that this component should render'},

            fill                  : {type: 'advanced-color', value: {type: 'solid', color: 'rgba(255,255,255,1)'}, name: 'Fill'},
            strokeColor           : {type: 'color', value: '#466AAA', name: 'Stroke color'},
            strokeSize            : {type: 'number', value: 2, name: 'Stroke size', min: 0, softMax: 100},
            strokePattern         : {type: 'stroke-pattern', value: 'solid', name: 'Stroke pattern'},

            cornerRadius          : {type: 'number', value: 0, name: 'Corner radius', min: 0, softMax: 100},
            placement             : {type: 'choice', value: 'centered', options: ['centered', 'stretch'], name: 'Placement'},
            autoZoom              : {type: 'boolean', value: true, name: 'Auto zoom', description: 'Zoom into component when it is loaded', depends: {kind: 'external'}},
            showButton            : {type: 'boolean', value: true, name: 'Show button', description: 'Displays a button which user can click to load component in view mode', depends: {kind: 'external'}},
            buttonFill            : {type: 'advanced-color', value: {type: 'solid', color: 'rgba(14,195,255,0.15)'}, name: 'Button Fill', depends: {showButton: true, kind: 'external'}},
            buttonStrokeColor     : {type: 'color', value: 'rgba(24,127,191,0.9)', name: 'Button stroke color', depends: {showButton: true, kind: 'external'}},
            buttonHoverFill       : {type: 'advanced-color', value: {type: 'solid', color: 'rgba(14,195,255,0.45)'}, name: 'Hovered button Fill', depends: {showButton: true, kind: 'external'}},
            buttonHoverStrokeColor: {type: 'color', value: 'rgba(24,127,191,0.9)', name: 'Hovered button stroke color', depends: {showButton: true, kind: 'external'}},
            buttonStrokeSize      : {type: 'number', value: 2, name: 'Button stroke size', depends: {showButton: true, kind: 'external'}, min: 0, softMax: 100},
            buttonCornerRadius    : {type: 'number', value: 0, name: 'Button Corner radius', min: 0, depends: {showButton: true, kind: 'external'}},
            buttonWidth           : {type: 'number', value: 180, name: 'Button width', depends: {showButton: true, kind: 'external'}},
            buttonHeight          : {type: 'number', value: 40, name: 'Button height', depends: {showButton: true, kind: 'external'}},
            showProgressBar       : {type: 'boolean', value: true, name: 'Show progress bar', depends: {kind: 'external'}},
            progressColor1        : {type: 'color', value: 'rgba(24,127,191,1)', name: 'Progress bar color 1', depends: {showProgressBar: true, kind: 'external'}},
            progressColor2        : {type: 'color', value: 'rgba(140,214,219,1)', name: 'Progress bar color 2', depends: {showProgressBar: true, kind: 'external'}},
            showBackButton        : {type: 'boolean', value: true, name: 'Show back button', depends: {kind: 'external'}},
            backButtonFill        : {type: 'advanced-color', value: {type: 'solid', color: 'rgba(102,102,102,1.0)'}, name: 'Button Fill', depends: {showBackButton: true, kind: 'external'}},
            backButtonTextColor   : {type: 'color', value: 'rgba(245,245,245,1.0)', name: 'Back button icon color', depends: {showBackButton: true, kind: 'external'}},
            backButtonVPad        : {type: 'number', value: 20, name: 'Back button vertical padding', depends: {showBackButton: true, kind: 'external'}},
            backButtonHPad        : {type: 'number', value: 20, name: 'Back button horizontal padding', depends: {showBackButton: true, kind: 'external'}},
            backButtonCornerRadius: {type: 'number', value: 15, name: 'Back button corner radius', depends: {showBackButton: true, kind: 'external'}},
            backButtonScale       : {type: 'number', value: 1.0, name: 'Back button scale', depends: {showBackButton: true, kind: 'external'}}
        },

        editorProps: {
            customTextRendering: true,
        },

        /**
         * Returns events that given item is able to emit
         * The result of this function is dynamic based on the item settings.
         * This is used in order to build suggestions in BehaviorPanel.
         */
        getEvents(item) {
            return [{
                name: COMPONENT_LOADED_EVENT
            }, {
                name: COMPONENT_FAILED
            }, {
                name: COMPONENT_DESTROYED
            }];
        },
    },

    beforeMount() {
        EditorEventBus.item.custom.$on('mouse-move', this.editorId, this.item.id, this.onMouseMove);
        EditorEventBus.item.custom.$on('mouse-down', this.editorId, this.item.id, this.onMouseDown);
        EditorEventBus.item.changed.specific.$on(this.editorId, this.item.id, this.onItemChanged);
        EditorEventBus.component.loadRequested.specific.$on(this.editorId, this.item.id, this.onComponentLoadRequested);
        EditorEventBus.component.loadFailed.specific.$on(this.editorId, this.item.id, this.onComponentLoadFailed);
    },

    beforeDestroy() {
        EditorEventBus.item.custom.$off('mouse-move', this.editorId, this.item.id, this.onMouseMove);
        EditorEventBus.item.custom.$off('mouse-down', this.editorId, this.item.id, this.onMouseDown);
        EditorEventBus.item.changed.specific.$off(this.editorId, this.item.id, this.onItemChanged);

        EditorEventBus.component.loadRequested.specific.$off(this.editorId, this.item.id, this.onComponentLoadRequested);
        EditorEventBus.component.loadFailed.specific.$off(this.editorId, this.item.id, this.onComponentLoadFailed);
    },

    data() {
        const externalItemsMounted = this.item._childItems && this.item._childItems.length > 0;
        return {
            buttonHovered: false,
            buttonShown: this.item.shapeProps.kind === 'external' && this.item.shapeProps.showButton && !externalItemsMounted,
            bodyTextShown: !externalItemsMounted,
            isLoading: false,
            textStyle: this.createTextStyle(),
            bodyTextStyle: this.createBodyTextStyle()
        };
    },

    methods: {
        onMouseMove(customAreaId) {
            if (customAreaId === 'load-button') {
                this.onButtonMouseOver();
            } else {
                this.onButtonMouseLeave();
            }
        },
        onMouseDown(customAreaId) {
            if (!this.isLoading && this.item.meta && this.item.meta.componentLoadFailed) {
                this.resetFailureMessage();
            } else if (customAreaId === 'load-button') {
                this.onLoadSchemeClick();
            }
        },
        onLoadSchemeClick() {
            this.isLoading = true;
            this.$emit('component-load-requested', this.item);
        },
        onItemChanged() {
            if (this.item.shape !== 'shape') {
                return;
            }
            if (this.item._childItems && this.item._childItems.length > 0) {
                this.buttonShown = false;
                this.bodyTextShown = false;
            }
            this.isLoading = false;
            this.buttonHovered = false;
            this.textStyle = this.createTextStyle();
            this.bodyTextStyle = this.createBodyTextStyle();
        },
        createBodyTextStyle() {
            let style = {};
            if (this.item.textSlots && this.item.textSlots.body) {
                style = generateTextStyle(this.item.textSlots.body);
                const btnArea = calculateButtonArea(this.item, this.item.shapeProps.buttonWidth, this.item.shapeProps.buttonHeight);
                style.width = `${this.item.area.w}px`;
                let h = this.item.area.h;
                if (this.item.shapeProps.kind === 'external' && this.item.shapeProps.showButton) {
                    h = btnArea.y;
                }
                style.height = `${h}px`;
            }
            return style;
        },
        createTextStyle() {
            let style = {};
            if (this.item.textSlots && this.item.textSlots.button) {
                style = generateTextStyle(this.item.textSlots.button);
                const textArea = calculateButtonArea(this.item, this.item.shapeProps.buttonWidth, this.item.shapeProps.buttonHeight);
                style.width = `${textArea.w}px`;
                style.height = `${textArea.h}px`;
            }
            return style;
        },
        onButtonMouseOver() {
            this.buttonHovered = true;
            this.$forceUpdate();
        },
        onButtonMouseLeave() {
            this.buttonHovered = false;
            this.$forceUpdate();
        },
        onComponentLoadRequested() {
            this.isLoading = true;
        },
        onComponentLoadFailed() {
            this.isLoading = false;
        },
        onComponentMounted() {
            this.isLoading = false;
        },

        resetFailureMessage() {
            this.item.meta.componentLoadFailed = false;
            this.$forceUpdate();
        }
    },

    computed: {
        isBodySlotShown() {
            return this.mode !== 'edit' || this.item.meta.activeTextSlot !== 'body';
        },

        isButtonSlotShown() {
            return this.mode !== 'edit' || this.item.meta.activeTextSlot !== 'button';
        },

        buttonPath() {
            return computeButtonPath(this.item);
        },
        shapePath() {
            return computePath(this.item);
        },

        svgFill() {
            return computeSvgFill(this.item.shapeProps.fill, `fill-pattern-${this.item.id}`);
        },
        svgButtonFill() {
            return computeSvgFill(this.item.shapeProps.buttonFill, `fill-pattern-button-${this.item.id}`);
        },
        svgButtonHoverFill() {
            return computeSvgFill(this.item.shapeProps.buttonHoverFill, `fill-pattern-button-hovered-${this.item.id}`);
        },

        strokeDashArray() {
            return StrokePattern.createDashArray(this.item.shapeProps.strokePattern, this.item.shapeProps.strokeSize);
        },

        buttonArea() {
            return calculateButtonArea(this.item, this.item.shapeProps.buttonWidth, this.item.shapeProps.buttonHeight);
        },

        bodyTextSlotHeight() {
            const btnArea = calculateButtonArea(this.item, this.item.shapeProps.buttonWidth, this.item.shapeProps.buttonHeight);
            if (this.item.shapeProps.kind === 'external' && this.item.shapeProps.showButton) {
                return btnArea.y;
            }
            return this.item.area.h;
        },

        sanitizedBodyText() {
            if (this.item.textSlots && this.item.textSlots.body) {
                return htmlSanitize(this.item.textSlots.body.text);
            }
            return '';
        },

        sanitizedButtonText() {
            if (this.isLoading) {
                return 'Loading ...';
            }
            let text = '';
            if (this.item.textSlots && this.item.textSlots.button) {
                text = this.item.textSlots.button.text;
            }
            return htmlSanitize(text);
        },

        failureMessageStyle() {
            return {
                color: 'rgb(255, 255, 255)',
                'font-size': '14px',
                'font-family': 'Arial, Helvetica, sans-serif',
                padding: '10px',
                'text-align': 'center',
                'vertical-align': 'middle',
                'white-space': 'normal',
                display: 'table-cell',
                'box-sizing': 'border-box',
                width: `${this.item.area.w}px`,
                height: `${this.item.area.h}px`,
            };
        },

        progressBar() {
            return calculateButtonArea(this.item, 180, 10);
        },

        progressBarStyle() {
            return {
                background: `linear-gradient(90deg, ${this.item.shapeProps.progressColor1} 0%, ${this.item.shapeProps.progressColor2} 25%, ${this.item.shapeProps.progressColor2} 50%, ${this.item.shapeProps.progressColor1} 75%) 0% 0% / 60% 100%`,
            };
        },

        progressBarHeight() {
            return Math.min(20, this.item.area.h);
        }
    }
}
</script>
