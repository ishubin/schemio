<template>
    <Modal
        :title="isAdding ? 'Add effect': 'Edit Effect'" 
        :primaryButton="isAdding ? 'Add Effect': null"
        @primary-submit="addEffect"
        @close="$emit('close')"
        :closeName="isAdding ? 'Cancel' : 'Close'"
        :useMask="false">

        Effect
        <select :value="effectId" @input="onEffectIdChanged(arguments[0].target.value)">
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
import { getEffectById, getEffects } from './Effects';
import forEach from 'lodash/forEach';

function getKnownEffects() {
    const effects = [];
    forEach(getEffects(), (effect, effectId) => {
        effects.push({ id: effectId, name: effect.name});
    });
    return effects;
}

export default {
    components: { Modal, EffectEditor },

    props: {
        title     : { type: String, default: 'Add effect' },
        isAdding  : { type: Boolean, default: true },
        effectId  : { type: String, required: true },
        effectArgs: { type: Object, required: true },
    },

    data() {
        const effect = getEffectById(this.effectId);

        return {
            knownEffects: getKnownEffects(),
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
            this.$emit('effect-arg-changed', argName, value);
        },

        onEffectIdChanged(newEffectId) {
            this.$emit('effect-id-changed', newEffectId);
        }
    },

    watch: {
        effectName(value) {
            this.$emit('effect-name-changed', value);
        }
    }
}
</script>