<template>
    <div class="ssc-container" oncontextmenu="return false;" style="position: relative; display: inline-block;">
        <div class="ssc-header" style="position: absolute; top: 0; left: 0; background: #999; display: block; width: 100%; font-size: 14px;">
            <div style="padding: 4px;">
                Zoom:
                <input v-model="textZoom" style="display: inline-block; padding: 2px 4px; border: 1px solid #555; width: 60px;" @input="onTextZoomChange"/>
                <span class="ssc-button" @click="zoomToScheme">Auto-Zoom</span>
            </div>
        </div>
        <svg-editor :scheme-container="schemeContainer"
            :width="width"
            :height="height"
            :offset-x="offsetX"
            :offset-y="offsetY"
            :zoom="vZoom"
            mode="view" 
            @zoom-updated="onZoomUpdateInside"/>
    </div>
</template>

<script>
import SvgEditor from '../components/editor/SvgEditor.vue';
import SchemeContainer from '../scheme/SchemeContainer';
import EventBus from '../components/editor/EventBus';

export default {
    props: ['scheme', 'width', 'height', 'offsetX', 'offsetY', 'zoom', 'autoZoom'],

    components: {SvgEditor},

    mounted() {
        if (this.autoZoom) {
            this.zoomToScheme();
        }
    },
    data() {
        return {
            schemeContainer: new SchemeContainer(this.scheme, EventBus),
            textZoom: "" + this.zoom * 100.0,
            vZoom: this.zoom || 1.0
        }
    },

    methods: {
        onZoomUpdateInside(newZoom) {
            const value = Math.floor(newZoom * 1000) / 10;
            this.textZoom = "" + Math.min(1000, Math.max(2, value));
        },
        onTextZoomChange() {
            this.vZoom = parseFloat(this.textZoom) / 100.0;
        },
        zoomToScheme() {
            this.zoomToItems(this.schemeContainer.getItems());
        },

        zoomToItems(items) {
            if (items && items.length > 0) {
                const area = this.getBoundingBoxOfItems(items);
                if (area) {
                    EventBus.$emit(EventBus.BRING_TO_VIEW, area);
                }
            }
        },

        getBoundingBoxOfItems(items) {
            let area = null;

            _.forEach(items, item => {
                if (!area) {
                    area = {x: item.area.x, y: item.area.y, w: item.area.w, h: item.area.h};
                } else {
                    if (area.x > item.area.x) {
                        area.x = item.area.x;
                    }
                    if (area.y > item.area.y) {
                        area.y = item.area.y;
                    }
                    if (area.x + area.w < item.area.x + item.area.w) {
                        area.w = item.area.x + item.area.w - area.x;
                    }
                    if (area.y + area.h < item.area.y + item.area.h) {
                        area.h = item.area.y + item.area.h - area.y;
                    }
                }
            });
            return area;
        },
    }
}
</script>