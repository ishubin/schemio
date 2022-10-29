<!-- This Source Code Form is subject to the terms of the Mozilla Public
     License, v. 2.0. If a copy of the MPL was not distributed with this
     file, You can obtain one at https://mozilla.org/MPL/2.0/. -->
<template>
    <div class="set-argument-editor">
        <div class="set-argument-control">
            <input v-if="argumentType === 'string'  || argumentType === 'image'"
                style="width: 100px" :value="argumentValue" @input="onInputValue"/>

            <number-textfield v-if="argumentType === 'number'" :value="argumentValue" @changed="emitValue"/>

            <color-picker v-if="argumentType === 'color'" height="18px" :color="argumentValue" @input="emitValue"></color-picker>

            <advanced-color-editor v-if="argumentType === 'advanced-color'" height="18px" :value="argumentValue" @changed="emitValue"/>

            <input v-if="argumentType === 'boolean'" type="checkbox" :checked="argumentValue" @input="onCheckboxInput"/>

            <select v-if="isChoice" :value="argumentValue" @input="onInputValue">
                <option v-for="option in choiceOptions" :value="(option.name&&option.value) ? option.value : option">{{option | toPrettyOptionName}}</option>
            </select>
        </div>
        <div class="set-argument-options" v-if="supportsAnimation">
            <span class="set-animated" @click="animationEditorShown = true" v-if="args.animated" title="Animated"><i class="fa-solid fa-video"></i></span>
            <span class="set-instant" @click="animationEditorShown = true" v-else title="Instant"><i class="fa-solid fa-video-slash"></i></span>
        </div>

        <modal v-if="animationEditorShown" title="Animation" @close="animationEditorShown = false">
            <div>
                <table class="properties-table">
                    <tbody>
                        <tr>
                            <td class="label" width="50%">Animated</td>
                            <td class="value" width="50%">
                                <input type="checkbox" v-model="args.animated"/>
                            </td>
                        </tr>
                        <tr>
                            <td class="label" width="50%">Duration</td>
                            <td class="value" width="50%">
                                <number-textfield :disabled="!args.animated" :value="args.animationDuration" @changed="args.animationDuration = arguments[0]"/>
                            </td>
                        </tr>
                        <tr>
                            <td class="label" width="50%">Transition</td>
                            <td class="value" width="50%">
                                <select v-model="args.transition" :disabled="!args.animated">
                                    <option v-for="transition in transitions" :value="transition">{{transition}}</option>
                                </select>
                            </td>
                        </tr>
                        <tr>
                            <td class="label" width="50%">In Background</td>
                            <td class="value" width="50%">
                                <input type="checkbox" v-model="args.inBackground" :disabled="!args.animated"/>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
            <div class="msg msg-info" v-if="argumentType === 'advanced-color' && args.value && args.value.type === 'gradient'">
                Gradient animation only works when both original gradient and target gradient have same amount of color points
            </div>
        </modal>
    </div>
</template>
<script>
import Dropdown from '../../../Dropdown.vue';
import NumberTextfield from '../../../NumberTextfield.vue';
import ColorPicker from '../../../editor/ColorPicker.vue';
import AdvancedColorEditor from '../../../editor/AdvancedColorEditor.vue';
import StrokePattern from '../../items/StrokePattern.js';
import Modal from '../../../Modal.vue';
import { supportsAnimationForSetFunction } from '../../../../userevents/functions/SetFunction';

export default {
    props: ['argumentValue', 'argumentDescription', 'args'],

    components: {Dropdown, ColorPicker, AdvancedColorEditor, NumberTextfield, Modal },

    data() {
        let isChoice = false;
        let choiceOptions = [];

        if (this.argumentDescription) {
            if (this.argumentDescription.type === 'stroke-pattern') {
                isChoice = true;
                choiceOptions = StrokePattern.patterns;
            } else if (this.argumentDescription.type === 'choice') {
                isChoice = true;
                choiceOptions = this.argumentDescription.options;
            }
        }

        return {
            transitions: ['linear', 'smooth', 'ease-in', 'ease-out', 'ease-in-out', 'bounce'],
            isChoice,
            choiceOptions,
            argumentType: this.argumentDescription.type,
            animationEditorShown: false
        };
    },

    computed: {
        supportsAnimation() {
            return supportsAnimationForSetFunction(this.argumentDescription.type);
        }
    },

    methods: {
        emitValue(value) {
            this.$emit('changed', value);
        },
        onInputValue(event) {
            this.emitValue(event.target.value);
        },
        onCheckboxInput(event) {
            this.emitValue(event.target.checked);
        }
    },
    filters: {
        toPrettyOptionName(option) {
            if (option.name && option.value) {
                return option.name;
            }
            return option;
        }
    }
}
</script>