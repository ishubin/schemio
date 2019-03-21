<template lang="html">
    <div>
        <general-panel :item="item"/>

        <links-panel :item="item"/>

        <connections-panel :item="item"/>

        <panel name="Properties" v-if="item.type === 'component'">
            <textarea v-model="item.properties"></textarea>
        </panel>

        <panel name="Image" v-if="item.type === 'component'">
            <span class="btn btn-secondary" v-on:click="showComponentImageModal = true"><i class="fas fa-image"></i> Set Image</span>
            <span class="btn btn-secondary" v-on:click="removeComponentImage()" v-if="item.image && item.image.url"><i class="fas fa-times"></i> Clear Image</span>

            <img v-if="item.image && item.image.url" :src="item.image.url" @click="showComponentImageModal = true" style="max-width:200px; max-height:200px;"/>

            <create-image-modal v-if="showComponentImageModal"
                @submit-image="setComponentImage"
                @close="showComponentImageModal = false"
                ></create-image-modal>
        </panel>

        <panel name="Style" v-if="item.type !== 'image'">
            <div class="property-row" v-if="item.type === 'component'">
                <span class="property-label">Shape: </span>
                <select v-model="item.style.shape">
                    <option v-for="componentShape in knownComponentShapes">{{componentShape}}</option>
                </select>
            </div>

            <div class="property-row" v-if="item.style.background && item.style.background.color">
                <color-picker :color="item.style.background.color" @input="item.style.background.color = arguments[0]; redrawItem();"></color-picker>
                <span class="property-label">Background</span>
            </div>
            <div class="property-row" v-if="item.style.text && item.style.text.color">
                <color-picker :color="item.style.text.color" @input="item.style.text.color = arguments[0]; redrawItem();"></color-picker>
                <span class="property-label">Text color</span>
            </div>
            <div class="property-row" v-if="item.style.stroke && item.style.stroke.color">
                <color-picker :color="item.style.stroke.color" @input="item.style.stroke.color = arguments[0]; redrawItem();"></color-picker>
                <span class="property-label">Stroke color</span>
            </div>

            <div v-if="item.type === 'component'">
                <div class="property-row">
                    <color-picker :color="item.style.properties.background.color" @input="item.style.properties.background.color = arguments[0]; redrawItem();"></color-picker>
                    <span class="property-label">Properties background</span>
                </div>
                <div class="property-row">
                    <color-picker :color="item.style.properties.text.color" @input="item.style.properties.text.color = arguments[0]; redrawItem();"></color-picker>
                    <span class="property-label">Properties text</span>
                </div>

                <div class="property-row">
                    <span class="property-label">Stroke size: </span>
                    <input type="text" v-model="item.style.stroke.size"/>
                </div>
            </div>
        </panel>

    </div>
</template>

<script>
import EventBus from '../EventBus.js';
import ColorPicker from '../ColorPicker.vue';
import Panel from '../Panel.vue';
import CreateImageModal from '../CreateImageModal.vue';
import LinksPanel from './LinksPanel.vue';
import ConnectionsPanel from './ConnectionsPanel.vue';
import GeneralPanel from './GeneralPanel.vue';
import _ from 'lodash';


export default {
    props: ['item'],
    components: {ConnectionsPanel, GeneralPanel, LinksPanel, ColorPicker, Panel, CreateImageModal},
    data() {
        return {
            toggleBackgroundColor: false,
            knownComponentShapes: ['component', 'ellipse'],
            showComponentImageModal: false,
            existingItemTags: [{text: 'Load Balancer'}, {text: 'Java'}, {text: 'Scalatra'}],
        };
    },
    methods: {
        setComponentImage(imageUrl) {
            if (!this.item.image) {
                this.item.image = {};
            }
            this.item.image.url = imageUrl;
        },
        removeComponentImage() {
            this.item.image = null;
        },

        redrawItem() {
            EventBus.emitRedrawItem(this.item.id);
        }
    },
    watch: {
       item: {
           handler: function(newValue) {
               EventBus.$emit(EventBus.ITEM_CHANGED, newValue);
               this.$forceUpdate();
               EventBus.$emit(EventBus.REDRAW);  //TODO move redrawing to SvgEditor
           },
           deep: true
       }
   }
}
</script>

<style lang="css">
</style>
