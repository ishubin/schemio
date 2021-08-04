<template>
    <Modal title="Add effect" @close="$emit('close')">

        Effect
        <select v-model="effectId">
            <option v-for="knownEffect in knownEffects" :value="knownEffect.id">{{knownEffect.name}}</option>
        </select>

        <br/>

        <input class="textfield" v-model="effectName"/>

        <EffectEditor :key="`effect-editor-${effectId}`" :effectId="effectId" :effectArgs="effectArgs" @effect-prop-changed="onEffectPropEdited"/>

        <div>
            <span class="btn btn-primary" @click="addEffect">Add Effect</span>
        </div>

    </Modal>
</template>

<script>
import utils from '../../utils';
import forEach from 'lodash/forEach';
import Modal from '../Modal.vue';
import EffectEditor from './EffectEditor.vue';
import {getEffectById} from './Effects';

const knownEffects = [
    { id: 'drop-shadow', name: 'Drop Shadow' }
];

function generateEffectArgs(effect) {
    if (!effect) {
        return {};
    }

    const props = {};
    forEach(effect.args, (arg, argName) => {
        props[argName] = utils.clone(arg.value);
    })
    return props;
}

export default {
    components: { Modal, EffectEditor },

    data() {
        const effectId = 'drop-shadow';
        const effect = getEffectById(effectId);

        return {
            knownEffects,
            effectId,
            effectName: effect.name,
            effectArgs: generateEffectArgs(effect)
        };
    },

    methods: {
        addEffect() {
            this.$emit('effect-selected', {
                id: this.effectId,
                name: this.effectName,
                args: this.effectArgs
            });
        },

        onEffectPropEdited(argName, argType, value) {
            this.effectArgs[argName] = value;
        }
    }
}
</script>