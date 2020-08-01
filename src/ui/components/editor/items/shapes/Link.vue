<template>
    <g>
        <a class="item-link" v-if="!hideTextSlot" @click="onLinkClick" :xlink:href="item.shapeProps.url" :target="target">
            <foreignObject v-if="item.shapeProps.showIcon" x="0" y="0" :width="textOffset" :height="item.area.h"
                :style="iconStyle"
                ><i :class="iconClass"></i></foreignObject>
            <foreignObject v-if="textWidth > 0" :x="textOffset" y="0" :width="textWidth" :height="item.area.h" v-html="linkHtml" :style="linkStyle"></foreignObject>
        </a>
    </g>
    
</template>
<script>
import _ from 'lodash';
import LinkTypes from '../../LinkTypes.js';
import LinkEditPopupVue from '../../LinkEditPopup.vue';
import htmlSanitize from '../../../../../htmlSanitize';
import EventBus from '../../EventBus';
import {generateTextStyle} from '../../text/ItemText';

export default {
    props: ['item'],

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
        icon     : {type: 'choice', value: 'default', name: 'Icon', options: _.map(LinkTypes.knownTypes, linkType => linkType.name)},
        iconColor: {type: 'color', value: '#666666', name: 'Color'}
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
                this.$router.push({path: url});
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
        onItemTextSlotEditTriggered(item, slotName, area) {
            if (item.id === this.item.id) {
                this.hideTextSlot = true;
            }
        },
        onItemTextSlotEditCanceled(item, slotName) {
            if (item.id === this.item.id) {
                this.hideTextSlot = false;
            }
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