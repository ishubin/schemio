<template>
    <g :transform="textEditArea.type === 'viewport' ? viewportTransform : relativeTransform">
        <foreignObject :x="area.x" :y="area.y" :width="area.w" :height="area.h">
            <div ref="itemTextContainer" id="item-in-place-text-editor" class="item-text-container" :style="textEditArea.style" v-html="text" contenteditable="true"></div>
        </foreignObject>
    </g>
</template>

<script>
import EventBus from './EventBus';
import htmlSanitize from '../../../htmlSanitize';
import utils from '../../utils';


export default {
    props: ['viewportTransform', 'relativeTransform', 'item', 'textEditArea', 'point'],

    mounted() {
        this.init();
    },

    data() {
        return {
            text: '',
            area: {
                x: 0, y: 0, w: 1, h: 1
            }
        };
    },

    methods: {
        init() {
            this.item.meta.hiddenTextProperty = this.textEditArea.property;
            EventBus.emitItemChanged(this.item.id);

            document.addEventListener('click', this.outsideClickListener);
            this.text = htmlSanitize(this.item[this.textEditArea.property]);
            this.$refs.itemTextContainer.focus();

            if (this.textEditArea.area) {
                this.area.x = this.point.x + this.textEditArea.area.x;
                this.area.y = this.point.y + this.textEditArea.area.y;
                this.area.w = this.textEditArea.area.w;
                this.area.h = this.textEditArea.area.h;
            } else {
                this.area.x = this.point.x
                this.area.y = this.point.y;
                this.area.w = this.item.area.w;
                this.area.h = this.item.area.h;
            }
        },

        outsideClickListener(event) {
            if (!utils.domHasParentNode(event.target, domElement => domElement.id === 'item-in-place-text-editor')) {
                document.removeEventListener('click', this.itemTextEditorOutsideClickListener);
                if (this.$refs.itemTextContainer) {
                    this.item[this.textEditArea.property] = this.$refs.itemTextContainer.innerHTML;
                }
                this.item.meta.hiddenTextProperty = null;
                EventBus.emitItemChanged(this.item.id);
                this.$emit('close');
            }
        },

    }

}
</script>