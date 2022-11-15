<!-- This Source Code Form is subject to the terms of the Mozilla Public
     License, v. 2.0. If a copy of the MPL was not distributed with this
     file, You can obtain one at https://mozilla.org/MPL/2.0/. -->
<template>
    <Modal
        :title="isAdding ? 'Add effect': 'Edit Effect'"
        :primaryButton="isAdding ? 'Add Effect': null"
        @primary-submit="addEffect"
        @close="$emit('close')"
        :closeName="isAdding ? 'Cancel' : 'Close'"
        :width="400"
        :useMask="false">

        <div class="section">
            <div class="ctrl-label">Effect</div>
            <select :value="effectId" @input="onEffectIdChanged(arguments[0].target.value)">
                <option v-for="knownEffect in knownEffects" :value="knownEffect.id">{{knownEffect.name}}</option>
            </select>
        </div>

        <div class="ctrl-label">Name</div>
        <input class="textfield" v-model="effectName"/>

        <EffectEditor
            :key="`effect-editor-${effectId}`"
            :editorId="editorId"
            :schemeContainer="schemeContainer"
            :effectId="effectId"
            :effectArgs="effectArgs"
            @effect-arg-changed="onEffectArgEdited"/>

    </Modal>
</template>

<script>
import Modal from '../Modal.vue';
import EffectEditor from './EffectEditor.vue';
import { findEffect, getEffects } from './Effects';
import forEach from 'lodash/forEach';
import shortid from 'shortid';

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
        editorId  : { type: String, required: true},
        title     : { type: String, default: 'Add effect' },
        isAdding  : { type: Boolean, default: true },
        effectId  : { type: String, required: true },
        effectArgs: { type: Object, required: true },
        schemeContainer: { type: Object, required: true },
    },

    data() {
        const effect = findEffect(this.effectId);

        return {
            knownEffects: getKnownEffects(),
            effectName: effect.name,
        };
    },

    methods: {
        addEffect() {
            this.$emit('effect-submited', {
                id: shortid.generate(),
                effect: this.effectId,
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