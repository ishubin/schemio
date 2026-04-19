<template>
    <div>
        <div class="row gap centered">
            <div>
                <Tooltip>
                    Functions let you create scripted actions for items which you can then use from items events
                </Tooltip>
            </div>
            <span class="col-1 btn btn-secondary" @click="startAddingNewFunction" title="Add new function"><i class="fa-solid fa-florin-sign"></i> New function</span>
            <div></div>
        </div>

        <ul class="navbar-functions-list">
            <li v-for="(func, funcIdx) in functions">
                <span class="func-name" @click="openFuncEditor(funcIdx)">
                    <i class="fa-solid fa-florin-sign"></i>
                    {{ func.name }}
                </span>
                <div class="operations">
                    <span class="link" @click="copyFunc(funcIdx)" title="Copy function"><i class="fa-regular fa-copy"></i></span>
                    <span class="link icon-delete" @click="deleteFunc(funcIdx)"><i class="fas fa-times"></i></span>
                </div>
            </li>
        </ul>

        <div class="section">
            <span v-if="functions.length > 0"
                class="btn btn-secondary"
                @click="copyAllFuncs()"
                title="Copy all functions in this document"
                >
                Copy all
            </span>
            <span class="btn btn-secondary" @click="pasteFuncs()">Paste functions</span>
        </div>

        <Modal v-if="funcModal.shown" title="Function editor" :width="900" @close="funcModal.shown = false" closeName="Close" :useMask="false">
            <Panel uid="func-modal-name" name="Name & Description">
                <div class="ctrl-label">Name</div>
                <input type="text" class="textfield" :class="{'field-error': funcModal.isNameError}"
                    v-model="funcModal.name"
                    @input="onFuncNameChange($event.target.value)"/>

                <div class="ctrl-label">Description</div>
                <textarea type="text" class="textfield" v-model="funcModal.description" rows="3"
                    @input="onFuncDescriptionChange($event.target.value)"></textarea>
            </Panel>

            <Panel uid="func-modal-arguments" name="Arguments">
                <CustomArgsEditor
                    :editorId="editorId"
                    :args="funcModal.args"
                    :schemeContainer="schemeContainer"
                    @arg-added="onFuncArgAdded($event, funcModal.funcIdx)"
                    @arg-deleted="deleteFuncArgument($event)"
                    @arg-name-changed="onFunctionArgNameChange"
                    @arg-type-changed="onFuncArgTypeChanged"
                    @arg-value-changed="onFuncArgDefaultValueChange"
                />
            </Panel>

            <Panel uid="func-modal-script" name="Script">
                <div>
                    <ScriptFunctionEditor
                        :key="`global-function-script-editor-${funcModal.scriptEditorUpdateKey}`"
                        :editorId="editorId"
                        :args="funcModal.props"
                        :schemeContainer="schemeContainer"
                        :scopeArgs="funcModal.args"
                        @argument-changed="onScriptFunctionEditorPropChange"/>
                </div>
            </Panel>

            <div v-if="funcModal.errorMessage" class="msg msg-error">{{ funcModal.errorMessage }}</div>
        </Modal>

    </div>
</template>

<script>
import shortid from 'shortid';
import { isValidColor } from '../../colors';
import { createDelayer } from '../../delayer';
import Modal from '../Modal.vue';
import Tooltip from '../Tooltip.vue';
import utils from '../../utils';
import EditorEventBus from './EditorEventBus';
import CustomArgsEditor from './CustomArgsEditor.vue';
import ScriptFunctionEditor from './properties/behavior/ScriptFunctionEditor.vue';
import { copyObjectToClipboard, getObjectFromClipboard } from '../../clipboard';
import StoreUtils from '../../store/StoreUtils';

export default {
    props: {
        editorId       : {type: String, required: true},
        schemeContainer: {type: Object, required: true},
        functions      : {type: Array, required: true},
    },

    components: { Modal, Tooltip, CustomArgsEditor, ScriptFunctionEditor },

    data() {
        return {
            funcModal: {
                name: '',
                isNameError: false,
                description: '',
                shown: false,
                script: '',
                args: [],
                errorMessage: null,
                funcIdx: -1,
                scriptEditorUpdateKey: 0,
                updateDelayer: createDelayer(100, () => {
                    this.funcModal.scriptEditorUpdateKey += 1;
                }),

                props: {
                    initScript          :  '',
                    script              :  '',
                    endScript           :  '',
                    animated            :  false,
                    animationType       :  'animation',
                    animationDuration   :  0.5,
                    transition          :  'ease-out',
                    inBackground        :  false,
                },
            },

        };
    },

    beforeDestroy() {
        this.funcModal.updateDelayer.destroy();
    },

    methods: {
        openFuncEditor(funcIdx) {
            const funcDef = this.functions[funcIdx];
            this.funcModal.name = funcDef.name;
            this.funcModal.isNameError = false;
            this.funcModal.description = funcDef.description;
            this.funcModal.args = funcDef.args;
            this.funcModal.props = utils.clone(funcDef.props);
            this.funcModal.script = funcDef.source;
            this.funcModal.shown = true;
            this.funcModal.funcIdx = funcIdx;
        },

        startAddingNewFunction() {
            this.funcModal.name = 'Unnamed function...';
            this.funcModal.isNameError = false;
            this.funcModal.description = '';
            this.funcModal.args = [];
            this.funcModal.script = '';
            this.funcModal.shown = true;
            this.funcModal.funcIdx = this.functions.length;
            this.funcModal.scriptEditorUpdateKey += 1;
            this.funcModal.props = {
                initScript          :  '',
                script              :  '',
                endScript           :  '',
                animated            :  false,
                animationType       :  'animation',
                animationDuration   :  0.5,
                transition          :  'ease-out',
                inBackground        :  false,
            };
            const funcDef = {
                id: shortid.generate(),
                name: this.funcModal.name,
                description: this.funcModal.description,
                args: [],
                props: utils.clone(this.funcModal.props),
            };

            this.functions.push(funcDef);
        },

        deleteFunc(funcIdx) {
            const funcName = this.functions[funcIdx].name;
            this.deleteFuncRefInItems(funcName);
            this.functions.splice(funcIdx, 1);
            EditorEventBus.schemeChangeCommitted.$emit(this.editorId);
            this.$forceUpdate();
        },

        deleteFuncRefInItems(funcName) {
            const funcRefName = `function:${funcName}`;
            this.schemeContainer.getItems().forEach(item => {
                item.behavior.events.forEach(event => {
                    for (let i = event.actions.length - 1; i >= 0; i--) {
                        if (event.actions[i].method === funcRefName) {
                            event.actions.splice(i, 1);
                        }
                    }
                });
            });
        },

        deleteFuncArgument(argIdx) {
            this.functions[this.funcModal.funcIdx].args.splice(argIdx, 1);
            EditorEventBus.schemeChangeCommitted.$emit(this.editorId, `scripts.functions.${this.funcModal.funcIdx}.args.${argIdx}`);
            this.funcModal.updateDelayer.trigger();
        },

        /**
         * Ensures that all arguments specified in item behavior actions are consistent with the types of arguments in the function
         * @param {Array} args
         * @param {String} funcName the old function name
         * @param {String} newFuncName
         */
        fixAllFunctionArgsInItems(args, funcName, newFuncName) {
            const funcRefName = `function:${funcName}`;
            this.schemeContainer.getItems().forEach(item => {
                item.behavior.events.forEach(event => {
                    event.actions.forEach(action => {
                        if (action.method === funcRefName) {
                            action.method = `function:${newFuncName}`;
                            this.ensureFunctionArgsAreCorrect(action, args);
                        }
                    });
                });
            });
        },

        /**
         * Ensures that all arguments specified in item behavior actions are consistent with the types of arguments in the function
         * @param {Object} action
         * @param {Array} args
         */
        ensureFunctionArgsAreCorrect(action, args) {
            args.forEach(argDef => {
                if (!action.args.hasOwnProperty(argDef.name)) {
                    action.args[argDef.name] = utils.clone(argDef.value);
                    return;
                }
                const usedValue = action.args[argDef.name];
                action.args[argDef.name] = ensureCorrectArgValue(argDef, usedValue);
            });

            // cleaning up old args in case they were deleted from function
            for (let argName in action.args) {
                if (action.args.hasOwnProperty(argName)) {
                    const idx = args.findIndex(argDef => argDef.name === argName);
                    if (idx < 0) {
                        delete action.args[argName];
                    }
                }
            }
        },

        onFuncNameChange(name) {
            this.functions[this.funcModal.funcIdx].name = name;
            EditorEventBus.schemeChangeCommitted.$emit(this.editorId, `scripts.functions.${this.funcModal.funcIdx}.name`);
        },

        onFuncDescriptionChange(value) {
            this.functions[this.funcModal.funcIdx].description = value;
        },

        onFunctionArgNameChange(argIdx, name) {
            this.functions[this.funcModal.funcIdx].args[argIdx].name = name;
            EditorEventBus.schemeChangeCommitted.$emit(this.editorId, `scripts.functions.${this.funcModal.funcIdx}.args.${argIdx}.name`);
            this.funcModal.updateDelayer.trigger();
        },

        onFuncArgAdded(argDef, funcIdx) {
            this.functions[funcIdx].args.push(argDef);
            EditorEventBus.schemeChangeCommitted.$emit(this.editorId);
            this.funcModal.updateDelayer.trigger();
        },

        onFuncArgTypeChanged(argIdx, argType, argValue) {
            this.functions[this.funcModal.funcIdx].args[argIdx].type = argType;
            this.functions[this.funcModal.funcIdx].args[argIdx].value = argValue;
            EditorEventBus.schemeChangeCommitted.$emit(this.editorId, `scripts.functions.${this.funcModal.funcIdx}.args.${argIdx}.type`);
            this.funcModal.updateDelayer.trigger();
        },

        onFuncArgDefaultValueChange(argIdx, value) {
            this.functions[this.funcModal.funcIdx].args[argIdx].value = value;
            EditorEventBus.schemeChangeCommitted.$emit(this.editorId, `scripts.functions.${this.funcModal.funcIdx}.args.${argIdx}.value`);
        },

        onFuncScriptChanged(script) {
            this.funcModal.script = script;
        },

        onScriptFunctionEditorPropChange({ name, value }) {
            this.funcModal.props[name] = value;
            this.functions[this.funcModal.funcIdx].props[name] = value;
            EditorEventBus.schemeChangeCommitted.$emit(this.editorId, `scripts.functions.${this.funcModal.funcIdx}.props.${name}`);
        },

        pasteFuncs() {
            getObjectFromClipboard('script-functions').then(funcs => {
                if (!Array.isArray(funcs)) {
                    return
                }
                funcs.forEach(func => {
                    func.id = shortid.generate();
                    this.functions.push(func);
                });
                EditorEventBus.schemeChangeCommitted.$emit(this.editorId);
            });
        },

        copyAllFuncs(idx) {
            copyObjectToClipboard('script-functions', this.functions).then(() => {
                StoreUtils.addInfoSystemMessage(this.$store, 'Copied all functions');
            });
        },

        copyFunc(idx) {
            const func = this.functions[idx];
            copyObjectToClipboard('script-functions', [func]).then(() => {
                StoreUtils.addInfoSystemMessage(this.$store, `Copied "${func.name}" function`);
            });
        },

    }
}

function stringValidator(value) {
    return typeof value === 'string';
}

function numberValidator(value) {
    return typeof value === 'number' && isFinite(value);
}

function colorValidator(value) {
    if (typeof value !== 'string') {
        return false;
    }
    return isValidColor(value);
}

function fillValidator(value) {
    if (typeof value !== 'object') {
        return false;
    }
    if (!value.hasOwnProperty('type')) {
        return false;
    }
    return true;
}

function booleanValidator(value) {
    return typeof value === 'boolean';
}

const argTypeValidator = {
    string: stringValidator,
    number: numberValidator,
    color: colorValidator,
    'advanced-color': fillValidator,
    image: stringValidator,
    boolean: booleanValidator,
    'stroke-pattern': stringValidator,
    element: stringValidator,
    'scheme-ref': stringValidator
};

function ensureCorrectArgValue(argDef, usedValue) {
    if (argTypeValidator.hasOwnProperty(argDef.type)) {
        const validator = argTypeValidator[argDef.type];
        if (!validator(usedValue)) {
            return argDef.value;
        }
    }
    return usedValue;
}
</script>