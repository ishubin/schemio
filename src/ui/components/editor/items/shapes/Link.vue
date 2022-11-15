<!-- This Source Code Form is subject to the terms of the Mozilla Public
     License, v. 2.0. If a copy of the MPL was not distributed with this
     file, You can obtain one at https://mozilla.org/MPL/2.0/. -->
<template>
    <g>
        <a class="item-link" v-if="!hideTextSlot" @click="onLinkClick" :xlink:href="item.shapeProps.url" :target="target">
            <foreignObject v-if="item.shapeProps.showIcon" x="0" y="0" :width="textOffset" :height="item.area.h"
                :style="iconStyle">
                <div xmlns="http://www.w3.org/1999/xhtml">
                    <i :class="iconClass"></i>
                </div>
            </foreignObject>
            <foreignObject v-if="textWidth > 0" :x="textOffset" y="0" :width="textWidth" :height="item.area.h" :style="linkStyle">
                <div xmlns="http://www.w3.org/1999/xhtml" v-html="linkHtml"></div>
            </foreignObject>
        </a>
    </g>

</template>
<script>
import map from 'lodash/map';
import LinkTypes from '../../LinkTypes.js';
import htmlSanitize from '../../../../../htmlSanitize';
import {generateTextStyle} from '../../text/ItemText';
import EditorEventBus from '../../EditorEventBus.js';

export default {
    props: ['item', 'editorId'],

    shapeConfig: {
        shapeType: 'vue',

        id: 'link',

        menuItems: [{
            group: 'General',
            name: 'Link',
            iconUrl: '/assets/images/items/link.svg',
            item: {
                textSlots: {
                    link: {text: 'Link', fontSize: 16, padding: {left: 0, top: 0, bottom: 0, right: 0}, color: '#047EFB', halign: 'left', valign: 'top'}
                },
            }
        }],

        computePath(item) {
            const w = item.area.w;
            const h = item.area.h;

            return `M 0 0   L ${w} 0  L ${w} ${h}  L 0 ${h} z`;
        },

        editorProps: {
            ignoreEventLayer: true,
            customTextRendering: true
        },

        getTextSlots(item) {
            return [{
                name: 'link', area: {x: 0, y: 0, w: item.area.w, h: item.area.h}
            }];
        },

        args: {
            url      : {type: 'string', value: '', name: 'URL'},
            otherTab : {type: 'boolean',value: false, name: 'In Other Tab', description: 'Open the link in another tab'},
            underline: {type: 'boolean', value: true, name: 'Underline'},
            showIcon : {type: 'boolean', value: true, name: 'Show Icon'},
            icon     : {type: 'choice', value: 'default', name: 'Icon', options: map(LinkTypes.knownTypes, linkType => linkType.name)},
            iconColor: {type: 'color', value: '#666666', name: 'Color', depends: {showIcon: true}}
        },
    },

    beforeMount() {
        EditorEventBus.item.changed.specific.$on(this.editorId, this.item.id, this.onItemChanged);
        EditorEventBus.textSlot.triggered.specific.$on(this.editorId, this.item.id, this.onItemTextSlotEditTriggered);
        EditorEventBus.textSlot.canceled.specific.$on(this.editorId, this.item.id, this.onItemTextSlotEditCanceled);
    },
    beforeDestroy() {
        EditorEventBus.item.changed.specific.$off(this.editorId, this.item.id, this.onItemChanged);
        EditorEventBus.textSlot.triggered.specific.$off(this.editorId, this.item.id, this.onItemTextSlotEditTriggered);
        EditorEventBus.textSlot.canceled.specific.$off(this.editorId, this.item.id, this.onItemTextSlotEditCanceled);
    },

    data() {
        return {
            linkStyle: this.createLinkStyle(),
            hideTextSlot: false
        };
    },

    methods: {
        createLinkStyle() {
            const style = generateTextStyle(this.item.textSlots.link);
            style['text-decoration'] = this.item.shapeProps.underline ? 'underline' : 'none';
            return style;
        },
        onLinkClick(event) {
            if (this.item.shapeProps.url.startsWith('/')) {
                window.location = url;
                event.preventDefault();
            }
            return false;
        },
        calculateTextOffset() {
            if (this.item.shapeProps.showIcon) {
                return this.item.textSlots.link.fontSize * 1.4;
            }
            return 0;
        },
        onItemChanged() {
            this.linkStyle = this.createLinkStyle();
        },
        onItemTextSlotEditTriggered(item, slotName, area, markupDisabled) {
            this.hideTextSlot = true;
        },
        onItemTextSlotEditCanceled(item, slotName) {
            this.hideTextSlot = false;
        }
    },

    computed: {
        target() {
            if (this.item.shapeProps.otherTab) {
                return '_blank';
            }
            return '_self';
        },
        iconStyle() {
            return {
                'color': this.item.shapeProps.iconColor,
                'padding-top': this.linkStyle['padding-left'],
                'padding-bottom': this.linkStyle['padding-left'],
            }
        },
        linkHtml() {
            return htmlSanitize(this.item.textSlots.link.text);
        },
        textOffset() {
            return this.calculateTextOffset();
        },
        textWidth() {
            return this.item.area.w - this.calculateTextOffset();
        },

        iconClass() {
            return LinkTypes.findTypeByNameOrDefault(this.item.shapeProps.icon).cssClass;
        }
    }
}
</script>