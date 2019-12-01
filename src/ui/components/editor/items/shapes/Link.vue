<template>
    <g>
        <a class="item-link" @click="onLinkClick" :xlink:href="item.shapeProps.url">
            <foreignObject v-if="item.shapeProps.showIcon" x="0" y="0" :width="textOffset" :height="item.area.h"
                :style="iconStyle"
                ><i :class="iconClass"></i></foreignObject>
            <foreignObject :x="textOffset" y="0" :width="item.area.w - textOffset" :height="item.area.h" v-html="linkHtml" :style="style"></foreignObject>
        </a>
    </g>
    
</template>
<script>
import _ from 'lodash';
import LinkTypes from '../../LinkTypes.js';
import LinkEditPopupVue from '../../LinkEditPopup.vue';
import htmlSanitize from '../../../../../htmlSanitize';

export default {
    props: ['item', 'hiddenTextProperty'],

    computePath() {
        return null;
    },
    editorProps: {
        description: 'rich',
        text: 'rich'
    },

    args: {
        url      : {type: 'string', value: '', name: 'URL'},
        color    : {type: 'color', value: '#047FE4', name: 'Color'},
        underline: {type: 'boolean', value: true, name: 'Underline'},
        bold     : {type: 'boolean', value: false, name: 'Bold'},
        fontSize : {type: 'number', value: 16, name: 'Font Size'},
        showIcon : {type: 'boolean', value: true, name: 'Show Icon'},
        icon     : {type: 'choice', value: 'default', name: 'Icon', options: _.map(LinkTypes.knownTypes, linkType => linkType.name)},
        iconColor: {type: 'color', value: '#666666', name: 'Color'}
    },

    data() {
        return {

        };
    },

    methods: {
        onLinkClick(event) {
            if (this.item.shapeProps.url.startsWith('/')) {
                this.$router.push({path: url});
                event.preventDefault();
            }
            return false;
        }
    },

    computed: {
        style() {
            return {
                'font-weight': this.item.shapeProps.bold ? 'bold' : 'normal',
                'text-decoration': this.item.shapeProps.underline ? 'underline' : 'none',
                'color': this.item.shapeProps.color,
                'font-size': `${this.item.shapeProps.fontSize}px`
            }
        },
        iconStyle() {
            return {
                'color': this.item.shapeProps.iconColor,
                'font-size': `${this.item.shapeProps.fontSize}px`
            }
        },
        linkHtml() {
            if (this.item.text && this.item.text.length > 0) {
                return htmlSanitize(this.item.text);
            }
            return htmlSanitize(this.item.shapeProps.url);
        },

        textOffset() {
            if (this.item.shapeProps.showIcon) {
                return this.item.shapeProps.fontSize * 1.4;
            }
            return 0;
        },

        iconClass() {
            return LinkTypes.findTypeByNameOrDefault(this.item.shapeProps.icon).cssClass;
        }
    }
}
</script>