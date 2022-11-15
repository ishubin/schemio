<!-- This Source Code Form is subject to the terms of the Mozilla Public
     License, v. 2.0. If a copy of the MPL was not distributed with this
     file, You can obtain one at https://mozilla.org/MPL/2.0/. -->
<template>
    <g @click="$emit('custom-event', 'clicked')"
       @mouseover="$emit('custom-event', 'mousein')"
       @mouseleave="$emit('custom-event', 'mouseout')"
       >
        <advanced-fill :fillId="`fill-pattern-${item.id}`" :fill="item.shapeProps.fill" :area="item.area"/>
        <advanced-fill :fillId="`fill-pattern-button-${item.id}`" :fill="item.shapeProps.buttonFill" :area="item.area"/>
        <advanced-fill :fillId="`fill-pattern-button-hovered-${item.id}`" :fill="item.shapeProps.buttonHoverFill" :area="item.area"/>

        <path :d="shapePath"
            :stroke-width="item.shapeProps.strokeSize + 'px'"
            :stroke="item.shapeProps.strokeColor"
            :stroke-dasharray="strokeDashArray"
            :fill="svgFill"></path>

        <foreignObject v-if="hideTextSlot !== 'body' && bodyTextShown" :x="0" :y="0" :width="item.area.w" :height="bodyTextSlotHeight" >
            <div class="item-text-container" xmlns="http://www.w3.org/1999/xhtml" :style="bodyTextStyle" v-html="sanitizedBodyText"></div>
        </foreignObject>

        <g style="cursor: pointer;" v-if="!(isLoading && item.shapeProps.showProgressBar) && buttonShown && buttonArea.w > 0 && buttonArea.h > 0">

            <rect v-if="buttonHovered"
                :fill="svgButtonHoverFill"
                :x="buttonArea.x" :y="buttonArea.y"
                :rx="item.shapeProps.buttonCornerRadius"
                :width="buttonArea.w" :height="buttonArea.h"
                :stroke-width="item.shapeProps.buttonStrokeSize + 'px'"
                :stroke="item.shapeProps.buttonStrokeColor"
                />
            <rect v-else :fill="svgButtonFill"
                :x="buttonArea.x" :y="buttonArea.y"
                :rx="item.shapeProps.buttonCornerRadius"
                :width="buttonArea.w" :height="buttonArea.h"
                :stroke-width="item.shapeProps.buttonStrokeSize + 'px'"
                :stroke="item.shapeProps.buttonHoverStrokeColor"
                />

            <foreignObject v-if="hideTextSlot !== 'button'" :x="buttonArea.x" :y="buttonArea.y" :width="buttonArea.w" :height="buttonArea.h" >
                <div class="item-text-container" xmlns="http://www.w3.org/1999/xhtml" :style="textStyle" v-html="sanitizedButtonText"></div>
            </foreignObject>
            <rect
                data-preview-ignore="true"
                fill="rgba(255,255,255,0)"
                :x="buttonArea.x" :y="buttonArea.y"
                :rx="item.shapeProps.buttonCornerRadius"
                :width="buttonArea.w" :height="buttonArea.h"
                @click="onLoadSchemeClick"
                @mouseover="onButtonMouseOver"
                @mouseleave="onButtonMouseLeave"
                />
        </g>

        <foreignObject v-if="isLoading && item.shapeProps.showProgressBar && progressBar.w > 0 && progressBar.h > 0" :x="progressBar.x" :y="progressBar.y" :width="progressBar.w" :height="progressBar.h" >
            <div class="progress-bar" :style="progressBarStyle"></div>
        </foreignObject>

        <g @click="resetFailureMessage" v-if="!isLoading && item.meta && item.meta.componentLoadFailed" style="cursor: pointer;">
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
import EventBus from '../../EventBus';
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

export const COMPONENT_LOADED_EVENT = 'Component Loaded';
export const COMPONENT_FAILED = 'Component Failed';
export const COMPONENT_DESTROYED = 'Component Destroyed';

export function generateComponentGoBackButton(componentItem, containerArea, currentScreenTransform) {
    if (!componentItem.shapeProps.showBackButton || componentItem.shapeProps.kind !== 'external') {
        return null;
    }
    const btnWidth = 95;
    const btnHeight = 30;
    return {
        id: componentItem.id + '-go-back-btn',
        shape: 'rect',
        area: {
            x: containerArea.w - btnWidth - componentItem.shapeProps.backButtonHPad,
            y: componentItem.shapeProps.backButtonVPad,
            w: btnWidth, h: btnHeight,
            sx: 1, sy: 1, r: 0, px: 0.5, py: 0.5
        },
        textSlots: {
            body: {
                text: '<b>go back</b>',
                color: componentItem.shapeProps.backButtonTextColor
            }
        },
        opacity: 70,
        visibile: true,
        cursor: 'pointer',
        shapeProps: {
            cornerRadius: 15,
            strokeSize: 0,
            fill: componentItem.shapeProps.backButtonFill
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
                    }
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
                    element: 'self',
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
                event: 'mouseout',
                actions: [ {
                    id: shortid.generate(),
                    element: 'self',
                    method: 'set',
                    args: {
                        field: 'selfOpacity',
                        value: 70,
                        animated: true,
                        animationDuration: 0.2,
                        transition: 'ease-in-out',
                        inBackground: false
                    }
                }]
            }]
        },
    }
}

export default {
    props: ['item', 'editorId'],
    components: {AdvancedFill},

    shapeConfig: {
        shapeType: 'vue',

        id: 'component',

        menuItems: [{
            group: 'General',
            name: 'Component',
            iconUrl: '/assets/images/items/component.svg',
            description: `
                Lets you embed other schemes into this item.
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
            strokeSize            : {type: 'number', value: 2, name: 'Stroke size'},
            strokePattern         : {type: 'stroke-pattern', value: 'solid', name: 'Stroke pattern'},

            cornerRadius          : {type: 'number', value: 0, name: 'Corner radius', min: 0},
            placement             : {type: 'choice', value: 'centered', options: ['centered', 'stretch'], name: 'Placement'},
            autoZoom              : {type: 'boolean', value: true, name: 'Auto zoom', description: 'Zoom into component when it is loaded', depends: {kind: 'external'}},
            showButton            : {type: 'boolean', value: true, name: 'Show button', description: 'Displays a button which user can click to load component in view mode', depends: {kind: 'external'}},
            buttonFill            : {type: 'advanced-color', value: {type: 'solid', color: 'rgba(14,195,255,0.15)'}, name: 'Button Fill', depends: {showButton: true, kind: 'external'}},
            buttonStrokeColor     : {type: 'color', value: 'rgba(24,127,191,0.9)', name: 'Button stroke color', depends: {showButton: true, kind: 'external'}},
            buttonHoverFill       : {type: 'advanced-color', value: {type: 'solid', color: 'rgba(14,195,255,0.45)'}, name: 'Hovered button Fill', depends: {showButton: true, kind: 'external'}},
            buttonHoverStrokeColor: {type: 'color', value: 'rgba(24,127,191,0.9)', name: 'Hovered button stroke color', depends: {showButton: true, kind: 'external'}},
            buttonStrokeSize      : {type: 'number', value: 2, name: 'Button stroke size', depends: {showButton: true, kind: 'external'}},
            buttonCornerRadius    : {type: 'number', value: 0, name: 'Button Corner radius', min: 0, depends: {showButton: true, kind: 'external'}},
            buttonWidth           : {type: 'number', value: 180, name: 'Button width', depends: {showButton: true, kind: 'external'}},
            buttonHeight          : {type: 'number', value: 40, name: 'Button height', depends: {showButton: true, kind: 'external'}},
            showProgressBar       : {type: 'boolean', value: true, name: 'Show progress bar', depends: {kind: 'external'}},
            progressColor1        : {type: 'color', value: 'rgba(24,127,191,1)', name: 'Progress bar color 1', depends: {showProgressBar: true, kind: 'external'}},
            progressColor2        : {type: 'color', value: 'rgba(140,214,219,1)', name: 'Progress bar color 2', depends: {showProgressBar: true, kind: 'external'}},
            showBackButton        : {type: 'boolean', value: true, name: 'Show back button', depends: {kind: 'external'}},
            backButtonFill        : {type: 'advanced-color', value: {type: 'solid', color: 'rgba(102,102,102,1.0)'}, name: 'Button Fill', depends: {showBackButton: true, kind: 'external'}},
            backButtonTextColor   : {type: 'color', value: 'rgba(245,245,245,1.0)', name: 'Back button text color', depends: {showBackButton: true, kind: 'external'}},
            backButtonVPad        : {type: 'number', value: 20, name: 'Back Button Vertical Padding', depends: {showBackButton: true, kind: 'external'}},
            backButtonHPad        : {type: 'number', value: 20, name: 'Back Button Horizontal Padding', depends: {showBackButton: true, kind: 'external'}},
        },

        editorProps: {
            customTextRendering: true,
            ignoreEventLayer   : true   // tells not to draw a layer for events handling, as this shape will handle everything itself
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
        EditorEventBus.item.changed.specific.$on(this.editorId, this.item.id, this.onItemChanged);
        EventBus.$on(EventBus.ITEM_TEXT_SLOT_EDIT_TRIGGERED, this.onItemTextSlotEditTriggered);
        EventBus.$on(EventBus.ITEM_TEXT_SLOT_EDIT_CANCELED, this.onItemTextSlotEditCanceled);

        EditorEventBus.component.loadRequested.specific.$on(this.editorId, this.item.id, this.onComponentLoadRequested);
        EditorEventBus.component.loadFailed.specific.$on(this.editorId, this.item.id, this.onComponentLoadFailed);
        EditorEventBus.component.mounted.specific.$on(this.editorId, this.item.id, this.onComponentMounted);
    },

    beforeDestroy() {
        EditorEventBus.item.changed.specific.$off(this.editorId, this.item.id, this.onItemChanged);
        EventBus.$off(EventBus.ITEM_TEXT_SLOT_EDIT_TRIGGERED, this.onItemTextSlotEditTriggered);
        EventBus.$off(EventBus.ITEM_TEXT_SLOT_EDIT_CANCELED, this.onItemTextSlotEditCanceled);

        EditorEventBus.component.loadRequested.specific.$off(this.editorId, this.item.id, this.onComponentLoadRequested);
        EditorEventBus.component.loadFailed.specific.$off(this.editorId, this.item.id, this.onComponentLoadFailed);
        EditorEventBus.component.mounted.specific.$off(this.editorId, this.item.id, this.onComponentMounted);
    },

    data() {
        const externalItemsMounted = this.item._childItems && this.item._childItems.length > 0;
        return {
            buttonHovered: false,
            buttonShown: this.item.shapeProps.kind === 'external' && this.item.shapeProps.showButton && !externalItemsMounted,
            bodyTextShown: !externalItemsMounted,
            isLoading: false,
            hideTextSlot: null,
            textStyle: this.createTextStyle(),
            bodyTextStyle: this.createBodyTextStyle()
        };
    },

    methods: {
        onLoadSchemeClick() {
            this.isLoading = true;
            EditorEventBus.component.loadRequested.specific.$emit(this.editorId, this.item.id, this.item);
        },
        onItemChanged() {
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
        onItemTextSlotEditTriggered(item, slotName, area, markupDisabled) {
            if (item.id === this.item.id) {
                this.hideTextSlot = slotName;
            }
        },
        onItemTextSlotEditCanceled(item, slotName) {
            if (item.id === this.item.id) {
                this.hideTextSlot = null;
            }
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
        shapePath() {
            return computePath(this.item);
        },

        svgFill() {
            return AdvancedFill.computeSvgFill(this.item.shapeProps.fill, `fill-pattern-${this.item.id}`);
        },
        svgButtonFill() {
            return AdvancedFill.computeSvgFill(this.item.shapeProps.buttonFill, `fill-pattern-button-${this.item.id}`);
        },
        svgButtonHoverFill() {
            return AdvancedFill.computeSvgFill(this.item.shapeProps.buttonHoverFill, `fill-pattern-button-hovered-${this.item.id}`);
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
