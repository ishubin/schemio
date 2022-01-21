<!-- This Source Code Form is subject to the terms of the Mozilla Public
     License, v. 2.0. If a copy of the MPL was not distributed with this
     file, You can obtain one at https://mozilla.org/MPL/2.0/. -->
<template>
    <g>
        <advanced-fill :fillId="`fill-pattern-${item.id}`" :fill="item.shapeProps.fill" :area="item.area"/>
        <advanced-fill :fillId="`fill-pattern-button-${item.id}`" :fill="item.shapeProps.buttonFill" :area="item.area"/>
        <advanced-fill :fillId="`fill-pattern-button-hovered-${item.id}`" :fill="item.shapeProps.buttonHoverFill" :area="item.area"/>

        <path :d="shapePath" 
            :stroke-width="item.shapeProps.strokeSize + 'px'"
            :stroke="item.shapeProps.strokeColor"
            :stroke-dasharray="strokeDashArray"
            :fill="svgFill"></path>

        <g style="cursor: pointer;" v-if="buttonShown">

            <rect v-if="buttonHovered"
                :fill="svgButtonHoverFill"
                :x="buttonArea.x" :y="buttonArea.y"
                :width="buttonArea.w" :height="buttonArea.h"
                :stroke-width="item.shapeProps.buttonStrokeSize + 'px'"
                :stroke="item.shapeProps.buttonStrokeColor"
                />
            <rect v-else :fill="svgButtonFill"
                :x="buttonArea.x" :y="buttonArea.y"
                :width="buttonArea.w" :height="buttonArea.h"
                :stroke-width="item.shapeProps.buttonStrokeSize + 'px'"
                :stroke="item.shapeProps.buttonHoverStrokeColor"
                />

            <g v-if="!hideTextSlot">
                <foreignObject :x="buttonArea.x" :y="buttonArea.y" :width="buttonArea.w" :height="buttonArea.h" >
                    <div class="item-text-container" xmlns="http://www.w3.org/1999/xhtml" :style="textStyle" v-html="sanitizedButtonText"></div>
                </foreignObject>
            </g>
            <rect 
                data-preview-ignore="true" 
                fill="rgba(255,255,255,0)"
                :x="buttonArea.x" :y="buttonArea.y"
                :width="buttonArea.w" :height="buttonArea.h"
                @click="onLoadSchemeClick"
                @mouseover="onButtonMouseOver"
                @mouseleave="onButtonMouseLeave"
                />
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


const computePath = (item) => {
    const W = item.area.w;
    const H = item.area.h;

    return `M ${W} ${H}  L 0 ${H}   L 0 ${0}   L ${W} 0  L ${W} ${H} Z`;
};

function calculateButtonArea(item) {
    const maxWidth = 180;
    const maxHeight = 40;
    const minPadding = 5;
    const itemMaxWidth = item.area.w - 2 * minPadding;
    const itemMaxHeight = item.area.h - 2 * minPadding;

    let w = Math.min(maxWidth, itemMaxWidth);
    let h = Math.min(maxHeight, itemMaxHeight);

    let x = minPadding;
    let y = minPadding;

    if (w < itemMaxWidth) {
        x = (itemMaxWidth - w) / 2;
    }

    if (h < itemMaxHeight) {
        y = (itemMaxHeight - h) / 2;
    }

    return { x, y, w, h };
}

export const COMPONENT_LOADED_EVENT = 'Component Loaded';
export const COMPONENT_FAILED = 'Component Failed';

export default {
    props: ['item'],
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
            return [{
                name: 'button',
                area: calculateButtonArea(item)
            }];
        },

        computePath,

        args: {
            fill                  : {type: 'advanced-color', value: {type: 'solid', color: 'rgba(255,255,255,1)'}, name: 'Fill'},
            strokeColor           : {type: 'color', value: '#466AAA', name: 'Stroke color'},
            strokeSize            : {type: 'number', value: 2, name: 'Stroke size'},
            strokePattern         : {type: 'stroke-pattern', value: 'solid', name: 'Stroke pattern'},

            kind                  : {type: 'choice', value: 'external', name: 'Kind', options: ['external', 'embedded'],  description: 'External - allows to fetch other documents and render them inside the component. Embedded - uses the items in the same document'},
            schemeId              : {type: 'scheme-ref', value: '', name: 'Scheme ID', depends: {kind: 'external'}},
            externalItem          : {type: 'element', name: 'Item', depends: {kind: 'embedded'}},

            autoZoom              : {type: 'boolean', value: true, name: 'Auto zoom', description: 'Zoom into component when it is loaded'},
            showButton            : {type: 'boolean', value: true, name: 'Show button', description: 'Displays a button which user can click to load component in view mode'},
            buttonFill            : {type: 'advanced-color', value: {type: 'solid', color: 'rgba(14,195,255,0.15)'}, name: 'Button Fill', depends: {showButton: true}},
            buttonStrokeColor     : {type: 'color', value: 'rgba(24,127,191,0.9)', name: 'Button stroke color', depends: {showButton: true}},
            buttonHoverFill       : {type: 'advanced-color', value: {type: 'solid', color: 'rgba(14,195,255,0.45)'}, name: 'Hovered button Fill', depends: {showButton: true}},
            buttonHoverStrokeColor: {type: 'color', value: 'rgba(24,127,191,0.9)', name: 'Hovered button stroke color', depends: {showButton: true}},
            buttonStrokeSize      : {type: 'number', value: 2, name: 'Button stroke size', depends: {showButton: true}},
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
            }];
        },
    },

    beforeMount() {
        EventBus.subscribeForItemChanged(this.item.id, this.onItemChanged);
        EventBus.$on(EventBus.ITEM_TEXT_SLOT_EDIT_TRIGGERED, this.onItemTextSlotEditTriggered);
        EventBus.$on(EventBus.ITEM_TEXT_SLOT_EDIT_CANCELED, this.onItemTextSlotEditCanceled);
    },

    beforeDestroy() {
        EventBus.unsubscribeForItemChanged(this.item.id, this.onItemChanged);
        EventBus.$off(EventBus.ITEM_TEXT_SLOT_EDIT_TRIGGERED, this.onItemTextSlotEditTriggered);
        EventBus.$off(EventBus.ITEM_TEXT_SLOT_EDIT_CANCELED, this.onItemTextSlotEditCanceled);
    },

    data() {
        return {
            buttonHovered: false,
            buttonShown: this.item.shapeProps.showButton && !(this.item.childItems && this.item.childItems.length > 0),
            isLoading: false,
            hideTextSlot: false,
            textStyle: this.createTextStyle()
        };
    },

    methods: {
        onLoadSchemeClick() {
            this.isLoading = true;
            EventBus.emitComponentLoadRequested(this.item);
        },
        onItemChanged() {
            if (this.item.childItems && this.item.childItems.length > 0) {
                this.buttonShown = false;
            }
            this.isLoading = false;
            this.buttonHovered = false;
            this.textStyle = this.createTextStyle();
        },
        createTextStyle() {
            let style = {};
            if (this.item.textSlots && this.item.textSlots.button) {
                style = generateTextStyle(this.item.textSlots.button);
                const textArea = calculateButtonArea(this.item);
                style.width = `${textArea.w}px`;
                style.height = `${textArea.h}px`;
            }
            return style;
        },
        onItemTextSlotEditTriggered(item, slotName, area) {
            if (item.id === this.item.id) {
                this.hideTextSlot = true;
            }
        },
        onItemTextSlotEditCanceled(item, slotName) {
            if (item.id === this.item.id) {
                this.hideTextSlot = false;
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
            return calculateButtonArea(this.item);
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
        }
    }
}
</script>
