<template>
    <g>
        <advanced-fill :fillId="`fill-pattern-${item.id}`" :fill="item.shapeProps.fill" :area="titleArea"/>
        <advanced-fill :fillId="`titlefill-pattern-${item.id}`" :fill="item.shapeProps.titleFill" :area="item.area"/>

        <rect v-if="item.shapeProps.showTitle"
            :x="0" :y="0"
            :width="item.area.w" :height="item.shapeProps.titleHeight"
            :stroke-width="item.shapeProps.strokeSize + 'px'"
            :stroke="item.shapeProps.strokeColor"
            :fill="svgTitleFill"/>

        <rect v-if="item.shapeProps.showTitle"
            :x="imageX" :y="imageY"
            :width="imageWidth" :height="imageHeight"
            :stroke-width="0"
            stroke="none"
            :fill="svgFill"/>

        <g :transform="`translate(0 ${imageY})`">
            <defs v-if="item.shapeProps.image">
                <pattern :id="`image-fill-${item.id}`" patternUnits="userSpaceOnUse" :width="imageWidth" :height="imageHeight">
                    <image :xlink:href="item.shapeProps.image" :x="0" :y="0" :width="imageWidth" :height="imageHeight" :preserveAspectRatio="imagePreserveAspectRatio"/>
                </pattern>
            </defs>

            <rect v-if="item.shapeProps.image"
                :x="0" :y="0"
                :width="imageWidth" :height="imageHeight"
                :stroke-width="item.shapeProps.strokeSize + 'px'"
                :stroke="item.shapeProps.strokeColor"
                :fill="`url(#image-fill-${item.id})`"/>
        </g>
    </g>
</template>

<script>
import {getStandardRectPins} from './ShapeDefaults'
import AdvancedFill from '../AdvancedFill.vue';

const computePath = (item) => {
    const W = item.area.w;
    const H = item.area.h;

    return `M 0 0  L ${W} 0  L ${W} ${H} L 0 ${H} Z`;
};

export default {
    props: ['item'],
    components: {AdvancedFill},

    shapeConfig: {
        shapeType: 'vue',

        id: 'image',

        menuItems: [{
            group: 'General',
            name: 'Image',
            imageProperty: 'shapeProps.image',
            iconUrl: '/assets/images/items/image.svg',
            description: 'It lets you upload an image or specify a link to external image',
            item: {
                shapeProps: {
                    image: '/assets/images/missing-scheme-preview.png'
                }
            },
        }],

        getPins(item) {
            return getStandardRectPins(item);
        },

        computePath,

        getTextSlots(item) {
            return [{
                name: "title", area: {x: 0, y: 0, w: item.area.w, h: Math.max(0, item.shapeProps.titleHeight)}
            }];
        },

        editorProps: {},
        args: {
            image       : {type: 'image', name: 'Image'},
            stretch     : {type: 'boolean', value: false, name: 'Stretch'},
            strokeColor : {type: 'color', value: 'rgba(80, 80, 80, 1.0)', name: 'Stroke color'},
            strokeSize  : {type: 'number', value: 0, name: 'Stroke size'},
            showTitle   : {type: 'boolean', value: false, name: 'Title'},
            titleHeight : {type: 'number', value: 36, name: 'Title height', min: 0, depends: {showTitle: true}},
            titleFill   : {type: 'advanced-color', value: {type: 'solid', color: 'rgba(240,240,240,1.0)'}, name: 'Title Background', depends: {showTitle: true}},
            fill        : {type: 'advanced-color', value: {type: 'solid', color: 'rgba(240,240,240,1.0)'}, name: 'Background', depends: {showTitle: true}},
        },
    },

    computed: {
        shapePath() {
            return computePath(this.item);
        },

        svgTitleFill() {
            return AdvancedFill.computeStandardFillForValue(this.item.shapeProps.titleFill, `titlefill-pattern-${this.item.id}`);
        },

        svgFill() {
            return AdvancedFill.computeStandardFill(this.item);
        },


        imagePreserveAspectRatio() {
            if (!this.item.shapeProps.stretch) {
                return 'xMidYMid meet';
            }
            return 'none';
        },

        titleArea() {
            return {x: 0, y: 0, w: this.item.area.w, h: this.item.shapeProps.titleHeight};
        },

        imageX() {
            return 0;
        },

        imageY() {
            if (this.item.shapeProps.showTitle) {
                return this.item.shapeProps.titleHeight;
            }
            return 0;
        },

        imageWidth() {
            return this.item.area.w;
        },

        imageHeight() {
            if (this.item.shapeProps.showTitle) {
                return Math.max(0, this.item.area.h - this.item.shapeProps.titleHeight);
            }
            return this.item.area.h;
        }
    },
}
</script>