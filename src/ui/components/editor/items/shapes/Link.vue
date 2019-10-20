<template>
    <g>
        <a class="item-link" @click="onLinkClick" :xlink:href="item.shapeProps.url">
            <foreignObject x="0" y="0" width="24" :height="item.area.h"
                :style="iconStyle"
                ><i class="fas fa-link"></i></foreignObject>
            <foreignObject x="24" y="0" :width="item.area.w" :height="item.area.h" v-html="linkHtml" :style="style"></foreignObject>
        </a>
    </g>
    
</template>
<script>
export default {
    props: ['item', 'hiddenTextProperty'],

    computePath() {
        return null;
    },

    args: {
        url: {type: 'string', value: '', name: 'URL'},
        color: {type: 'color', value: '#047FE4', name: 'Color'},
        underline: {type: 'boolean', value: true, name: 'Underline'},
        bold: {type: 'boolean', value: false, name: 'Bold'},
        fontSize: {type: 'number', value: 16, name: 'Font Size'}
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
                'color': '#666',
                'font-size': `${this.item.shapeProps.fontSize}px`
            }
        },
        linkHtml() {
            if (this.item.text && this.item.text.length > 0) {
                return this.item.text;
            }
            return this.item.shapeProps.url;
        }
    }
}
</script>