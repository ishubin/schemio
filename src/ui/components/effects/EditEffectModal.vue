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
            <select :value="effectId" @input="onEffectIdChanged($event.target.value)">
                <option v-for="knownEffect in knownEffects" :value="knownEffect.id">{{knownEffect.name}}</option>
            </select>
        </div>

        <div class="hint hint-small" v-if="description">{{ description }}</div>

        <div class="ctrl-label">Name</div>
        <input class="textfield" v-model="effectName"/>

        <div v-if="supportsCascade" class="section">
            <label if="chk-effect-cascade" class="ctrl-label-inline">Cascade</label>
            <Tooltip>
                Enables cascading of the effect to all child items, attached to current item
            </Tooltip>
            <input for="chk-effect-cascade" type="checkbox" :checked="cascade" @input="onCascadeUpdate($event.target.checked)"/>
        </div>

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
import {forEach} from '../../collections';
import shortid from 'shortid';
import Tooltip from '../Tooltip.vue';

function getKnownEffects() {
    const effects = [];
    forEach(getEffects(), (effect, effectId) => {
        effects.push({ id: effectId, name: effect.name});
    });
    return effects;
}

export default {
    components: { Modal, EffectEditor, Tooltip },

    props: {
        editorId  : { type: String, required: true},
        title     : { type: String, default: 'Add effect' },
        isAdding  : { type: Boolean, default: true },
        effectId  : { type: String, required: true },
        name      : { type: String, required: true},
        cascade   : { type: Boolean, required: true},
        effectArgs: { type: Object, required: true },
        schemeContainer: { type: Object, required: true },
    },

    data() {
        const effect = findEffect(this.effectId);

        return {
            knownEffects: getKnownEffects(),
            effectName: this.name,
            supportsCascade: effect.supportsCascade,
            description: effect.description,
            cascadeValue: this.cascade
        };
    },

    methods: {
        addEffect() {
            this.$emit('effect-submited', {
                id: shortid.generate(),
                effect: this.effectId,
                name: this.effectName,
                cascade: this.cascadeValue,
                args: this.effectArgs
            });
        },

        onEffectArgEdited(argName, value) {
            this.$emit('effect-arg-changed', argName, value);
        },

        onEffectIdChanged(newEffectId) {
            this.$emit('effect-id-changed', newEffectId);
        },

        onCascadeUpdate(cascade) {
            this.cascadeValue = cascade;
            this.$emit('effect-cascade-changed', cascade);
        }
    },

    watch: {
        effectName(value) {
            this.$emit('effect-name-changed', value);
        }
    }
}
</script>