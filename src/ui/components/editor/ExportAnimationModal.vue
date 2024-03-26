<template>
    <modal title="Export Animation" :width="600" @close="$emit('close')" primaryButton="Export" @primary-submit="exportSubmitted" :use-mask="false">
        <p>
            Exports document as animated GIF
        </p>

        <div class="row gap centered">
            <div class="col-5">
                <NumberTextfield name="Width" :value="width" @changed="onWidthChange"/>
            </div>
            <div>
                <span class="toggle-button small" :class="{toggled: sizeLocked}" @click="toggleSizeLock">
                    <i class="fa-solid fa-lock"></i>
                </span>
            </div>
            <div class="col-5">
                <NumberTextfield name="Height" :value="height" @changed="onHeightChange"/>
            </div>
        </div>
        <div class="row gap">
            <div class="col-1">
                <NumberTextfield name="Duration (sec)" :value="duration" @changed="duration = arguments[0]"/>
            </div>
            <div class="col-1">
                <NumberTextfield name="Delay (sec)" :value="delay" @changed="delay = arguments[0]"/>
            </div>
            <div class="col-1">
                <NumberTextfield name="Frames per second" :value="fps" @changed="fps = arguments[0]"/>
            </div>
        </div>
        <div class="row gap centered">
            <div class="col-1" style="text-align: right;">
                Limit area by:
            </div>
            <div class="col-1">
                <ElementPicker
                    :editorId="editorId"
                    :element="boundsElement"
                    :schemeContainer="schemeContainer"
                    :use-self="false"
                    @selected="onBoundsElementSelected"
                    />
            </div>
        </div>
    </modal>
</template>

<script>
import { getBoundingBoxOfItems } from '../../scheme/SchemeContainer';
import Modal from '../Modal.vue';
import NumberTextfield from '../NumberTextfield.vue';
import ElementPicker from './ElementPicker.vue';

export default {
    props: {
        editorId: {type: String},
        schemeContainer: {type: Object}
    },

    components: {Modal, NumberTextfield, ElementPicker},

    data() {
        const bbox = getBoundingBoxOfItems(this.schemeContainer.getItems());
        const width = Math.max(1, Math.round(bbox.w));
        const height = Math.max(1, Math.round(bbox.h));

        const ratio = width / height;

        return {
            duration: 2,
            fps: 12,
            delay: 0,
            width,
            height,
            ratio,
            sizeLocked: true,
            boundsElement: null
        };
    },

    methods: {
        onWidthChange(width) {
            this.width = Math.max(1, width);
            if (this.sizeLocked) {
                this.height = Math.max(1, Math.round(this.width / this.ratio));
            }
        },
        onHeightChange(height) {
            this.height = Math.max(1, height);
            if (this.sizeLocked) {
                this.width = Math.max(1, Math.round(this.height * this.ratio));
            }
        },
        toggleSizeLock() {
            this.sizeLocked = !this.sizeLocked;
            if (this.sizeLocked) {
                this.ratio = Math.max(1, this.width) / Math.max(1, this.height);
            }
        },
        exportSubmitted() {
            this.$emit('export-requested', {
                duration: this.duration,
                fps: this.fps,
                width: this.width,
                height: this.height,
                delay: this.delay,
                boundsElement: this.boundsElement
            });
        },
        onBoundsElementSelected(element) {
            this.boundsElement = element;

            const items = element ? this.schemeContainer.findElementsBySelector(element) : this.schemeContainer.getItems();
            const bbox = getBoundingBoxOfItems(items);
            if (bbox.w > 0 && bbox.h > 0) {
                this.width = bbox.w;
                this.height = bbox.h;
            }
        }
    }
}
</script>