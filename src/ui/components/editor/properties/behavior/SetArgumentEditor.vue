<!-- This Source Code Form is subject to the terms of the Mozilla Public
     License, v. 2.0. If a copy of the MPL was not distributed with this
     file, You can obtain one at https://mozilla.org/MPL/2.0/. -->
<template>
    <div class="set-argument-editor">
        <div class="set-argument-wrapper">
            <div class="set-argument-control">
                <div v-if="!isBinded">
                    <input v-if="argumentType === 'string'  || argumentType === 'image'"
                        style="width: 100px" :value="argumentValue" @input="onInputValue"/>

                    <NumberTextfield v-if="argumentType === 'number'" :value="argumentValue" @changed="emitValue"/>

                    <color-picker :editorId="editorId" v-if="argumentType === 'color'" width="18px" height="18px" :color="argumentValue" @input="emitValue"></color-picker>

                    <AdvancedColorEditor :editorId="editorId" v-if="argumentType === 'advanced-color'" height="18px" :value="argumentValue" @changed="emitValue" />

                    <input v-if="argumentType === 'boolean'" type="checkbox" :checked="argumentValue" @input="onCheckboxInput"/>

                    <select v-if="isChoice" :value="argumentValue" @input="onInputValue">
                        <option v-for="option in choiceOptions" :value="(option.name&&option.value) ? option.value : option">{{option | toPrettyOptionName}}</option>
                    </select>
                </div>
            </div>
            <div class="set-argument-options" v-if="supportsAnimation">
                <span class="set-animated" @click="animationEditorShown = true" v-if="args.animated" title="Animated"><i class="fa-solid fa-video"></i></span>
                <span class="set-instant" @click="animationEditorShown = true" v-else title="Instant"><i class="fa-solid fa-video-slash"></i></span>
            </div>
            <div>
                <Dropdown
                    v-if="bindOptions.length > 0"
                    :key="`set-func-dropdown-binder-${revision}`"
                    :inline="true"
                    :borderless="true"
                    :options="bindOptions"
                    title="Bind argument"
                    @selected="onArgumentBindSelected(arguments[0])"
                    >
                    <i v-if="isBinded" class="fa-solid fa-link property-arg-binder-icon binded"></i>
                    <i v-else class="fa-solid fa-link-slash property-arg-binder-icon"></i>
                </Dropdown>
            </div>
            <div v-if="isBinded">
                <span class="property-arg-binder-ref" title="Class argument">{{ bindValue.ref }}</span>
            </div>
        </div>

        <modal v-if="animationEditorShown" title="Animation" @close="animationEditorShown = false" :use-mask="false">
            <div>
                <table class="properties-table">
                    <tbody>
                        <tr>
                            <td class="label" width="50%">Animated</td>
                            <td class="value" width="50%">
                                <input type="checkbox" :checked="args.animated" @input="onPropertyChange('animated', $event.target.checked)"/>
                            </td>
                        </tr>
                        <tr>
                            <td class="label" width="50%">Duration</td>
                            <td class="value" width="50%">
                                <NumberTextfield :disabled="!args.animated" :min="0" :value="args.animationDuration" @changed="onPropertyChange('animationDuration', arguments[0])"/>
                            </td>
                        </tr>
                        <tr>
                            <td class="label" width="50%">Transition</td>
                            <td class="value" width="50%">
                                <select :value="args.transition" :disabled="!args.animated" @input="onPropertyChange('transition', $event.target.value)">
                                    <option v-for="transition in transitions" :value="transition">{{transition}}</option>
                                </select>
                            </td>
                        </tr>
                        <tr>
                            <td class="label" width="50%">In Background</td>
                            <td class="value" width="50%">
                                <input type="checkbox" :checked="args.inBackground" :disabled="!args.animated" @input="onPropertyChange('inBackground', $event.target.checked)"/>
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
    props: {
        editorId: {type: String, required: true},
        argumentValue: {required: true},
        argumentDescription: {type: Object},
        args: {type: Object},
        /* Array of field descriptors (see FieldDescriptor in typedef.js) */
        scopeArgs : {type: Array, default: () => []},
        argBinds : {type: Object, default: () => {return {};}}
    },

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

        const isBinded = this.argBinds && this.argBinds.hasOwnProperty('value');

        return {
            transitions: ['linear', 'smooth', 'ease-in', 'ease-out', 'ease-in-out', 'bounce'],
            isChoice,
            choiceOptions,
            argumentType: this.argumentDescription ? this.argumentDescription.type : null,
            isBinded,
            bindValue: isBinded ? this.argBinds.value : null,
            bindOptions: this.buildArgumentBindOptions(isBinded),
            animationEditorShown: false,
            revision: 0
        };
    },

    computed: {
        supportsAnimation() {
            if (!this.argumentDescription) {
                return false;
            }
            return supportsAnimationForSetFunction(this.argumentDescription.type);
        }
    },

    methods: {
        onArgumentBindSelected(option) {
            if (option.kind === 'scopeArg') {
                this.isBinded = true;
                this.bindValue = {ref: option.name};
                this.$emit(`argument-bind-added`, 'value', this.bindValue);
            } else if (option.kind === 'unbind') {
                this.isBinded = false;
                this.bindValue = null;
                this.$emit(`argument-bind-removed`, 'value');
            }

            this.bindOptions = this.buildArgumentBindOptions(this.isBinded);
            this.revision += 1;
            this.$forceUpdate();
        },

        buildArgumentBindOptions(isBinded) {
            const argumentType = this.argumentDescription ? this.argumentDescription.type : null;
            const options = [];
            if (isBinded) {
                options.push({name: 'Remove binding', kind: 'unbind', style: {'font-style': 'italic'}});
            }
            this.scopeArgs.forEach(scopeArg => {
                if (scopeArg.type === argumentType) {
                    options.push({
                        name: scopeArg.name,
                        kind: 'scopeArg'
                    });
                }
            });
            return options;
        },

        emitValue(value) {
            this.onPropertyChange('value', value);
        },
        onInputValue(event) {
            this.emitValue(event.target.value);
        },
        onCheckboxInput(event) {
            this.emitValue(event.target.checked);
        },
        onPropertyChange(property, value) {
            this.$emit('property-changed', property, value);
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