<!-- This Source Code Form is subject to the terms of the Mozilla Public
     License, v. 2.0. If a copy of the MPL was not distributed with this
     file, You can obtain one at https://mozilla.org/MPL/2.0/. -->

<template lang="html">
    <g :transform="`translate(${item.area.x},${item.area.y}) rotate(${item.area.r})`"
        :style="{'opacity': item.opacity/100.0, 'mix-blend-mode': item.blendMode}"
    >

        <component
            :key="`item-component-${item.id}-${item.shape}-${revision}`"
            v-if="shapeComponent && item.visible"
            :is="shapeComponent"
            :item="item"
            :style="{'opacity': item.selfOpacity/100.0}"
            :hidden-text-property="hiddenTextProperty"
            @custom-event="onShapeCustomEvent">
        </component>

        <g v-if="item.text && hiddenTextProperty !== 'text'">
            <foreignObject
                :x="textArea.x" :y="textArea.y" :width="textArea.w" :height="textArea.h">
                <div class="item-text-container" v-html="sanitizedItemText"
                    :style="textStyle"
                    ></div>
            </foreignObject>
            <rect :x="textArea.x" :y="textArea.y" :width="textArea.w" :height="textArea.h" stoke="none" fill="rgba(0,0,0,0.0)" data-preview-ignore="true"  data-void="true"/>
        </g>


        <g :id="`animation-container-${item.id}`"></g>

        <path v-if="itemSvgPath && shouldDrawEventLayer"
            class="svg-event-layer"
            data-preview-ignore="true"
            :id="`item-svg-path-${item.id}`"
            :d="itemSvgPath" 
            :data-item-id="item.id"
            :stroke-width="hoverPathStrokeWidth"
            :style="{'cursor': item.cursor}"
            stroke="rgba(255, 255, 255, 0)"
            :fill="hoverPathFill" />

        <g v-if="item.childItems && item.visible">
            <item-svg v-for="childItem in item.childItems"
                v-if="childItem.visible"
                :key="`${childItem.id}-${childItem.shape}-${schemeContainer.revision}`"
                :item="childItem"
                :mode="mode"
                :scheme-container="schemeContainer"
                @custom-event="$emit('custom-event', arguments[0])"
                />
        </g>    

    </g>
</template>

<script>
import Shape from './shapes/Shape.js';
import EventBus from '../EventBus.js';
import myMath from '../../../myMath';
import htmlSanitize from '../../../../htmlSanitize';
import {getFontFamilyFor} from '../../../scheme/Fonts';

export function generateTextStyle(item) {
    const textArea = calculateTextArea(item);
    const style = {
        'color'           : item.textProps.color,
        'font-size'       : item.textProps.fontSize + 'px',
        'font-family'     : getFontFamilyFor(item.textProps.font),
        'padding-left'    : item.textProps.padding.left + 'px',
        'padding-right'   : item.textProps.padding.right + 'px',
        'padding-top'     : item.textProps.padding.top + 'px',
        'padding-bottom'  : item.textProps.padding.bottom + 'px',
        'text-align'      : item.textProps.halign,
        'vertical-align'  : item.textProps.valign,
        'white-space'     : item.textProps.whiteSpace,
        'display'         : 'table-cell',
        'width'           : textArea.w + 'px',
        'height'          : textArea.h + 'px',
    };

    if (item.textProps.valign === 'above') {
        style['vertical-align'] = 'bottom';
    } else if (item.textProps.valign === 'below') {
        style['vertical-align'] = 'top';
    } else {
        style['vertical-align'] = item.textProps.valign;
    }

    return style;
}

function calculateTextArea(item) {
    const textHeight = Math.max(100, item.area.h)
    if (item.textProps.valign === 'above') {
        return {x: 0, y: -textHeight, w: item.area.w, h: textHeight};
    } else if (item.textProps.valign === 'below') {
        return {x: 0, y: item.area.h, w: item.area.w, h: textHeight};
    }
    return {x: 0, y: 0, w: item.area.w, h: item.area.h};
}



export default {
    name: 'item-svg',
    props: ['item', 'mode', 'schemeContainer'],

    mounted() {
        this.switchShape(this.item.shape);
        EventBus.subscribeForItemChanged(this.item.id, this.onItemChanged);
    },

    beforeDestroy() {
        EventBus.unsubscribeForItemChanged(this.item.id, this.onItemChanged);
    },

    data() {


        return {
            shapeComponent        : null,
            oldShape              : this.item.shape,
            itemSvgPath           : null,
            hiddenTextProperty    : this.item.meta.hiddenTextProperty || null,
            shouldDrawEventLayer  : true,

            // using revision in order to trigger full re-render of item component
            // on each item changed event revision is incremented
            revision              : 0,
            textStyle             : generateTextStyle(this.item),
            textArea              : calculateTextArea(this.item)
        };
    },

    methods: {
        switchShape(shapeId) {
            this.oldShape = this.item.shape;
            const shape = Shape.make(shapeId);
            if (shape.editorProps && shape.editorProps.ignoreEventLayer && this.mode === 'view') {
                this.shouldDrawEventLayer = false;
            }
            if (shape.component) {
                this.shapeComponent = shape.component;
                this.itemSvgPath = shape.component.computePath(this.item);
            } else {
                this.shapeComponent = shape.vueComponentName;
            }
        },

        onItemChanged() {
            if (this.oldShape !== this.item.shape) {
                this.switchShape(this.item.shape);
            } else {
                // re-computing item svg path for event layer
                const shape = Shape.make(this.item.shape);
                if (shape && shape.component) {
                    this.itemSvgPath = shape.component.computePath(this.item);
                }
            }
            // refreshing the state of text display. This is needed when text edit is triggered for item with double click
            this.hiddenTextProperty = this.item.meta.hiddenTextProperty || null;
            this.revision += 1;
            this.textStyle = generateTextStyle(this.item);
            this.textArea = calculateTextArea(this.item);
            this.$forceUpdate();
        },

        onShapeCustomEvent(eventName, ...args) {
            this.$emit('custom-event', {
                itemId: this.item.id,
                eventName: eventName,
                args: arguments
            });
        }
    },

    computed: {
        hoverPathStrokeWidth() {
            if (this.item.shape === 'curve') {
                return (parseInt(this.item.shapeProps.strokeSize) + 2)  + 'px';
            }
            return '0px';
        },

        hoverPathFill() {
            if (this.item.shape === 'curve' && this.item.shapeProps.fill.type === 'none') {
                return 'none';
            }
            return 'rgba(255, 255, 255, 0)';
        },
        
        sanitizedItemText() {
            return htmlSanitize(this.item.text);
        }
    }
}
</script>

