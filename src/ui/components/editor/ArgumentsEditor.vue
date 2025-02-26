<!-- This Source Code Form is subject to the terms of the Mozilla Public
     License, v. 2.0. If a copy of the MPL was not distributed with this
     file, You can obtain one at https://mozilla.org/MPL/2.0/. -->
<template>
    <div>
        <table class="properties-table">
            <tbody>
                <template v-for="(arg, argName) in argsDefinition">
                    <tr v-if="argumentControlStates[argName] && !isDisabledScript(arg, argName) && !arg.hidden">
                        <template v-if="isRegularArg(arg)">
                            <td class="label" :class="{disabled: !argumentControlStates[argName].shown}" width="50%">
                                {{arg.name}}
                                <tooltip v-if="arg.description">{{arg.description}}</tooltip>
                            </td>
                            <td v-if="hasScopeArgs" class="property-arg-binder">
                                <Dropdown
                                    v-if="argumentBindStates[argName] && argumentBindStates[argName].options.length > 0"
                                    :key="`dropdown-binder-${argName}-${argumentBindStates[argName].revision}`"
                                    :inline="true"
                                    :borderless="true"
                                    :options="argumentBindStates[argName].options"
                                    title="Bind argument"
                                    @selected="onArgumentBindSelected(argName, $event)"
                                    >
                                    <i v-if="argumentBindStates[argName] && argumentBindStates[argName].isBinded" class="fa-solid fa-link property-arg-binder-icon binded"></i>
                                    <i v-else class="fa-solid fa-link-slash property-arg-binder-icon"></i>
                                </Dropdown>
                            </td>
                            <td class="value"
                                :class="{disabled: !argumentControlStates[argName].shown}"
                                width="50%"
                                :colspan="hasScopeArgs ? 1 : 2"
                                >
                                <div v-if="argumentBindStates[argName] && argumentBindStates[argName].isBinded">
                                    <span class="property-arg-binder-ref" title="Class argument">{{ argumentBindStates[argName].value.ref }}</span>
                                </div>
                                <div v-else>
                                    <input v-if="arg.type === 'string' || arg.type === 'image'"
                                        class="textfield"
                                        :value="argumentValues[argName]"
                                        :disabled="!argumentControlStates[argName].shown"
                                        @input="onValueChange(argName, $event.target.value)"/>

                                    <dropdown v-if="arg.type === 'font'"
                                        :options="allFonts"
                                        :value="argumentValues[argName]"
                                        @selected="onValueChange(argName, $event.name)"/>

                                    <NumberTextfield v-if="arg.type === 'number'"
                                        :value="argumentValues[argName]"
                                        :min="arg.min"
                                        :max="arg.max"
                                        :softMax="arg.softMax"
                                        :slider="arg.min !== null && (arg.max !== null || arg.softMax !== null)"
                                        :step="arg.step ? arg.step : 1"
                                        :disabled="!argumentControlStates[argName].shown"
                                        @changed="onValueChange(argName, $event)"/>

                                    <ColorPicker :editorId="editorId" v-if="arg.type === 'color'" :color="argumentValues[argName]"
                                        :disabled="!argumentControlStates[argName].shown"
                                        @input="onValueChange(argName, $event)"/>

                                    <AdvancedColorEditor v-if="arg.type === 'advanced-color'" :value="argumentValues[argName]"
                                        :apiClient="apiClient"
                                        :editorId="editorId"
                                        @changed="onValueChange(argName, $event)"
                                        :disabled="!argumentControlStates[argName].shown" />

                                    <input v-if="arg.type === 'boolean'" type="checkbox" :checked="argumentValues[argName]"
                                        :disabled="!argumentControlStates[argName].shown"
                                        @input="onValueChange(argName, $event.target.checked)"/>

                                    <select v-if="arg.type === 'choice'" :value="argumentValues[argName]"
                                        :disabled="!argumentControlStates[argName].shown"
                                        @input="onValueChange(argName, $event.target.value)">
                                        <option v-for="option in arg.options">{{option}}</option>
                                    </select>

                                    <ElementPicker v-if="arg.type === 'element'"
                                        :editorId="editorId"
                                        :scheme-container="schemeContainer"
                                        :element="argumentValues[argName]"
                                        :disabled="!argumentControlStates[argName].shown"
                                        :use-self="false"
                                        @selected="onValueChange(argName, $event)"
                                    />

                                    <DiagramPicker v-if="arg.type === 'scheme-ref'"
                                        :key="`args-editor-diagram-picker-${editorId}-${argumentValues[argName]}`"
                                        :diagramId="argumentValues[argName]"
                                        @diagram-selected="onDiagramPicked(argName, $event)"
                                        />

                                    <PathCapDropdown v-if="arg.type === 'path-cap'"
                                        :value="argumentValues[argName]"
                                        :is-source="false"
                                        :is-thick="false"
                                        width="100%"
                                        :height="16"
                                        :disabled="!argumentControlStates[argName].shown"
                                        @selected="onValueChange(argName, $event)"/>
                                </div>
                            </td>
                        </template>
                        <template v-else-if="arg.type === 'script'">
                            <td colspan="3">
                                <div class="label">
                                    {{arg.name}}
                                    <tooltip v-if="arg.description">{{arg.description}}</tooltip>
                                    <a class="link" target="_blank" href="https://github.com/ishubin/schemio/blob/master/docs/Scripting.md">(documentation)</a>
                                </div>

                                <ScriptEditor v-if="arg.type === 'script'"
                                    :key="`script-editor-${argName}-${editorId}`"
                                    :value="argumentValues[argName]"
                                    :schemeContainer="schemeContainer"
                                    :previousScripts="[schemeContainer.scheme.scripts.main.source]"
                                    @changed="onValueChange(argName, $event)"
                                />
                            </td>
                        </template>
                        <template v-else-if="arg.type === 'string' && arg.textarea">
                            <td colspan="3">
                                <div class="label">
                                    {{arg.name}}
                                    <tooltip v-if="arg.description">{{arg.description}}</tooltip>
                                </div>

                                <textarea class="property-textarea" :value="argumentValues[argName]" :rows="arg.rows || 10"
                                    @input="onValueChange(argName, $event.target.value)"
                                    ></textarea>
                            </td>
                        </template>
                    </tr>
                </template>
            </tbody>
        </table>
    </div>
</template>
<script>
import {forEach, map, mapObjectValues} from '../../collections';
import ColorPicker from './ColorPicker.vue';
import AdvancedColorEditor from './AdvancedColorEditor.vue';
import Modal from '../Modal.vue';
import ElementPicker from './ElementPicker.vue';
import DiagramPicker from './DiagramPicker.vue';
import Tooltip from '../Tooltip.vue';
import NumberTextfield from '../NumberTextfield.vue';
import ScriptEditor from './ScriptEditor.vue';
import PathCapDropdown from './PathCapDropdown.vue';
import Dropdown from '../Dropdown.vue';
import { getAllFonts } from '../../scheme/Fonts';
import Panel from './Panel.vue';

export default {
    props: {
        editorId           : {type: String, required: true},
        argsDefinition     : {type: Object, required: true},
        args               : {type: Object, required: true},
        schemeContainer    : {type: Object, required: true},
        apiClient          : {type: Object, default: null},
        /* Array of field descriptors (see FieldDescriptor in typedef.js) */
        scopeArgs          : {type: Array, default: () => []},
        argBinds           : {type: Object, default: () => {return {};}}
    },

    components: {
        Modal, ColorPicker, ElementPicker, Tooltip, NumberTextfield, Dropdown,
        AdvancedColorEditor, ScriptEditor, DiagramPicker, PathCapDropdown,
        Panel
    },

    beforeMount() {
        this.updateArgumentControlDependencies();
    },

    data() {
        const argumentValues = {};
        const argumentBindStates = {};
        forEach(this.argsDefinition, (arg, argName) => {
            if (this.args.hasOwnProperty(argName)) {
                argumentValues[argName] = this.args[argName];
            } else {
                argumentValues[argName] =  arg.value;
            }

            argumentBindStates[argName] = {
                revision: 0,
                options: [],
                value: null,
                isBinded: false
            };

            if (this.scopeArgs && this.scopeArgs.length > 0) {
                argumentBindStates[argName].options = this.buildArgumentBindOptions(argName);

                if (this.argBinds && this.argBinds.hasOwnProperty(argName)) {
                    argumentBindStates[argName].value = this.argBinds[argName];
                    argumentBindStates[argName].isBinded = true;
                }
            }
        });

        return {
            allFonts: map(getAllFonts(), font => {return {name: font.name, style: {'font-family': font.family}}}),
            argumentBindStates,
            argumentValues,
            argumentControlStates: mapObjectValues(this.argsDefinition, () => {return {shown: true};}),
            scriptEnlarged: false,
        };
    },

    methods: {
        isRegularArg(arg) {
            if (arg.type === 'script') {
                return false;
            } else if (arg.type === 'string' && arg.textarea) {
                return false;
            }
            return true;
        },

        buildArgumentBindOptions(argName) {
            const options = [];
            if (this.argBinds && this.argBinds.hasOwnProperty(argName)) {
                options.push({name: 'Remove binding', kind: 'unbind', style: {'font-style': 'italic'}});
            }
            this.scopeArgs.forEach(scopeArg => {
                if (scopeArg.type === this.argsDefinition[argName].type) {
                    options.push({
                        name: scopeArg.name,
                        kind: 'scopeArg'
                    });
                }
            });
            return options;
        },
        onArgumentBindSelected(argName, option) {
            if (option.kind === 'scopeArg') {
                this.argumentBindStates[argName].value = {ref: option.name};
                this.argumentBindStates[argName].isBinded = true;
                this.argBinds[argName] = {ref: option.name};
                this.$emit(`argument-bind-added`, argName, {ref: option.name});
            } else if (option.kind === 'unbind') {
                this.argumentBindStates[argName].value = null;
                this.argumentBindStates[argName].isBinded = false;
                this.$emit(`argument-bind-removed`, argName);
                delete this.argBinds[argName];
            }

            this.argumentBindStates[argName].options = this.buildArgumentBindOptions(argName);
            this.argumentBindStates[argName].revision += 1;
            this.$forceUpdate();
        },

        updateArgumentControlDependencies() {
            forEach(this.argsDefinition, (argConfig, argName) => {
                if (argConfig.depends) {
                    if (!this.argumentControlStates[argName]) {
                        this.argumentControlStates[argName] = {shown: shown};
                    }
                    let shown = true;
                    forEach(argConfig.depends, (depArgValue, depArgName) => {
                        shown = shown && this.argumentValues[depArgName] === depArgValue;
                    });
                    this.argumentControlStates[argName].shown = shown;
                }
            });
        },

        onValueChange(argName, value) {
            this.argumentValues[argName] = value;
            this.emitArgumentChange(argName);
            this.updateArgumentControlDependencies();
        },

        onDiagramPicked(argName, diagram) {
            this.onValueChange(argName, diagram.id);
        },

        emitArgumentChange(argName) {
            this.$emit('argument-changed', argName, this.argumentValues[argName]);
        },

        /**
         * determines whether the argument is of script type and it is disabled
         * In this case we don't want to render it at all as it is taking too much space
         */
        isDisabledScript(arg, argName) {
            return arg.type === 'script' && !this.argumentControlStates[argName].shown;
        }
    },

    computed: {
        hasScopeArgs() {
            return this.scopeArgs && this.scopeArgs.length > 0;
        }
    }
}
</script>