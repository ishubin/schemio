<template>
    <modal title="Export Animation" :width="600" @close="$emit('close')" primaryButton="Export" @primary-submit="exportSubmitted">
        <p>
            Exports document as animated GIF
        </p>

        <div class="row gap">
            <div class="col-1">
                <NumberTextfield name="Duration (sec)" :value="duration" @changed="duration = arguments[0]"/>
            </div>
            <div class="col-1">
                <NumberTextfield name="Width" :value="width" @changed="width = arguments[0]"/>
            </div>
        </div>
        <div class="row gap">
            <div class="col-1">
                <NumberTextfield name="Frames per second" :value="fps" @changed="fps = arguments[0]"/>
            </div>
            <div class="col-1">
                <NumberTextfield name="Height" :value="height" @changed="height = arguments[0]"/>
            </div>
        </div>
    </modal>
</template>

<script>
import { traverseItems } from '../../scheme/Item';
import { getBoundingBoxOfItems } from '../../scheme/SchemeContainer';
import Modal from '../Modal.vue';
import NumberTextfield from '../NumberTextfield.vue';

export default {
    props: {
        scheme: {type: Object}
    },

    components: {Modal, NumberTextfield},

    data() {
        const allItems = [];
        traverseItems(this.scheme.items, item => {
            allItems.push(item);
        });
        const bbox = getBoundingBoxOfItems(allItems);
        return {
            duration: 2,
            fps: 12,
            width: bbox.w,
            height: bbox.h
        };
    },

    methods: {
        exportSubmitted() {
            this.$emit('export-requested', {
                duration: this.duration,
                fps: this.fps,
                width: this.width,
                height: this.height,
            });
        }
    }
}
</script>