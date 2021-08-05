<template>
    <Modal :title="title" :primaryButton="isAdding ? 'Add Effect': null" @primary-submit="addEffect" @close="$emit('close')" closeName="Cancel" :useMask="false">

        Effect
        <select v-model="effectId">
            <option v-for="knownEffect in knownEffects" :value="knownEffect.id">{{knownEffect.name}}</option>
        </select>

        <br/>

        <input class="textfield" v-model="effectName"/>

        <EffectEditor :key="`effect-editor-${effectId}`" :effectId="effectId" :effectArgs="effectArgs" @effect-arg-changed="onEffectArgEdited"/>

    </Modal>
</template>

<script>
import Modal from '../Modal.vue';
import EffectEditor from './EffectEditor.vue';
import { getEffectById } from './Effects';

const knownEffects = [
    { id: 'drop-shadow', name: 'Drop Shadow' }
];

export default {
    components: { Modal, EffectEditor },

    props: {
        title     : { type: String, default: 'Add effect' },
        isAdding  : { type: Boolean, default: true },
        effectArgs: { type: Object, required: true },
    },

    data() {
        const effectId = 'drop-shadow';
        const effect = getEffectById(effectId);

        return {
            knownEffects,
            effectId,
            effectName: effect.name,
        };
    },

    methods: {
        addEffect() {
            this.$emit('effect-submited', {
                id: this.effectId,
                name: this.effectName,
                args: this.effectArgs
            });
        },

        onEffectArgEdited(argName, value) {
            // this.effectArgs[argName] = value;
            this.$emit('effect-arg-changed', argName, value);
        }
    },

    watch: {
        effectName(value) {
            this.$emit('effect-name-changed', value);
        }
    }
}
</script>