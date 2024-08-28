<template lang="html">
    <div>
        <Panel uid="main-script" name="Main">
            <div class="row gap centered">
                <div>
                    <Tooltip>
                        "Main" script runs during scene initialization and registers all functions and variables in global scope.
                        These functions and variables are available from any other script.
                    </Tooltip>
                </div>
                <span class="col-1 btn btn-secondary" @click="toggleMainScript"><i class="fa-solid fa-code"></i>  Edit main script</span>
                <div></div>
            </div>
        </Panel>

        <Panel uid="script-functions" name="Item Functions">
            <div class="row gap centered">
                <div>
                    <Tooltip>
                        Functions let you create scripted actions for items which you can then use from items events
                    </Tooltip>
                </div>
                <span class="col-1 btn btn-secondary" @click="startAddingNewFunction"><i class="fa-solid fa-florin-sign"></i> New function</span>
                <div></div>
            </div>


            <ul class="navbar-functions-list">
                <li v-for="(func, funcIdx) in schemeContainer.scheme.scripts.functions">
                    <span class="func-name" @click="openFuncEditor(funcIdx)">
                        <i class="fa-solid fa-florin-sign"></i>
                        {{ func.name }}
                    </span>
                    <div class="operations">
                        <span class="link icon-delete" @click="deleteFunc(funcIdx)"><i class="fas fa-times"></i></span>
                    </div>
                </li>
            </ul>
        </Panel>

        <Modal v-if="mainScriptEditorShown" title="Main script" :width="900" @close="mainScriptEditorShown = false" :useMask="false">
            <ScriptEditor :value="mainScript" @changed="onMainScriptChange"/>
        </Modal>


        <Modal v-if="funcModal.shown" :title="funcModalTitle" :width="900" @close="funcModal.shown = false"
            :primaryButton="funcModalButtonName"
            closeName="Cancel"
            @primary-submit="onFuncSubmit"
            >

            <div v-if="funcModal.errorMessage" class="msg msg-error">{{ funcModal.errorMessage }}</div>

            <Panel uid="func-modal-name" name="Name & Description">
                <div class="ctrl-label">Name</div>
                <input type="text" class="textfield" :class="{'field-error': funcModal.isNameError}" v-model="funcModal.name"/> 

                <div class="ctrl-label">Description</div>
                <textarea type="text" class="textfield" v-model="funcModal.description" rows="3"></textarea>
            </Panel>

            <Panel uid="func-modal-arguments" name="Arguments">
                <table v-if="funcModal.args.length > 0" class="function-arguments">
                    <thead>
                        <tr>
                            <th></th>
                            <th width="45%">Name</th>
                            <th width="180px">Type</th>
                            <th>Default value</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-for="(arg, argIdx) in funcModal.args">
                            <td><span class="link icon-delete" @click="deleteFuncArgument(argIdx)"><i class="fas fa-times"></i></span></td>
                            <td><input class="textfield" type="text" :class="{'field-error': arg.isError}" v-model="arg.name"/></td>
                            <td>
                                <select class="dropdown" v-model="arg.type" @change="onArgTypeChanged(argIdx, $event)">
                                    <option v-for="opt in supportedArgumentTypes" :value="opt.value">{{ opt.name }}</option>
                                </select>
                            </td>
                            <td>
                                <div class="function-argument-value">
                                    <PropertyInput
                                        :key="`arg-property-input-${argIdx}-${arg.type}`"
                                        :editorId="editorId"
                                        :schemeContainer="schemeContainer"
                                        :descriptor="arg.descriptor"
                                        :value="arg.value"
                                        @input="onArgDefaultValueChange(argIdx, $event)"
                                        />
                                </div>
                            </td>
                        </tr>
                    </tbody>
                </table>
                <div v-else class="hint hint-small">
                    This function does not have arguments
                </div>
                <span class="btn btn-secondary" @click="addFuncArgument"><i class="fa-solid fa-gear"></i> Add argument</span>
            </Panel>

            <Panel uid="func-modal-script" name="Script">
                <div>
                    <ScriptFunctionEditor
                        :editorId="editorId"
                        :args="funcModal.props"
                        @argument-changed="onScriptFunctionEditorPropChange"/>
                </div>
            </Panel>

            <div v-if="funcModal.errorMessage" class="msg msg-error">{{ funcModal.errorMessage }}</div>
        </Modal>
    </div>
</template>

<script>
import Panel from './Panel.vue';
import Modal from '../Modal.vue';
import ScriptEditor from './ScriptEditor.vue';
import Tooltip from '../Tooltip.vue';
import PropertyInput from './properties/PropertyInput.vue';
import ScriptFunctionEditor from './properties/behavior/ScriptFunctionEditor.vue';
import utils from '../../utils';
import EditorEventBus from './EditorEventBus';
import { isValidColor, parseColor } from '../../colors';


const defaultTypeValues = {
    'string': '',
    'number': 0,
    'color': 'rgba(255,255,255,1.0)',
    'advanced-color': {type: 'solid', color: 'rgba(255,255,255,1.0)'},
    'image': '',
    'boolean': true,
    'stroke-pattern': 'solid',
    'element': '',
    'scheme-ref': '',
};

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

export default {
    props: {
        editorId            : {type: String, required: true},
        schemeContainer     : {type: Object},
    },

    components: {Panel, ScriptEditor, Modal, Tooltip, PropertyInput, ScriptFunctionEditor},

    data() {
        const scheme = this.schemeContainer.scheme;
        return {
            mainScriptEditorShown: false,
            mainScript: scheme.scripts.main.source,

            funcModal: {
                name: '',
                isNameError: false,
                description: '',
                shown: false,
                isNew: true,
                script: '',
                args: [],
                errorMessage: null,
                funcIdx: -1,

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

            supportedArgumentTypes: [
                {name: 'string', value: 'string'},
                {name: 'number', value: 'number'},
                {name: 'color', value: 'color'},
                {name: 'fill', value: 'advanced-color'},
                {name: 'image', value: 'image'},
                {name: 'checkbox', value: 'boolean'},
                {name: 'stroke pattern', value: 'stroke-pattern'},
                {name: 'item', value: 'element'},
                {name: 'diagram', value: 'scheme-ref'},
            ]
        };
    },

    methods: {
        onScriptFunctionEditorPropChange(name, value) {
            this.funcModal.props[name] = value;
        },

        deleteFunc(funcIdx) {
            const funcName = this.schemeContainer.scheme.scripts.functions[funcIdx].name;
            this.deleteFuncRefInItems(funcName);
            this.schemeContainer.scheme.scripts.functions.splice(funcIdx, 1);
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
            this.funcModal.args.splice(argIdx, 1);
        },

        onFuncSubmit() {
            const name = this.funcModal.name.trim();

            let isError = false;
            this.funcModal.errorMessage = null;
            if (name.length === 0) {
                this.funcModal.errorMessage = 'Missing function name';
                this.funcModal.isNameError = true;
                isError = true;
            } else {
                this.funcModal.isNameError = false;
            }

            const argNameRegex = new RegExp('^[a-zA-Z_][a-zA-Z0-9_]*$');

            const argNames = new Set();

            this.funcModal.args.forEach(arg => {
                if (!argNameRegex.test(arg.name)) {
                    this.funcModal.errorMessage = 'Invalid argument name. It should not contain spaces or special symbols and start with a literal';
                    arg.isError = true;
                    isError = true;
                } else {
                    if (argNames.has(arg.name)) {
                        arg.isError = true;
                        isError = true;
                        this.funcModal.errorMessage = 'Duplicated argument names';
                    } else {
                        argNames.add(arg.name);
                        arg.isError = false;
                    }
                }
            });
            if (isError) {
                return;
            }

            const existentFuncNames = new Set();

            this.schemeContainer.scheme.scripts.functions.forEach((funcDef, funcIdx) => {
                if (!this.funcModal.isNew && funcIdx === this.funcModal.funcIdx) {
                    return;
                }
                existentFuncNames.add(funcDef.name);
            });
            if (existentFuncNames.has(name)) {
                this.funcModal.errorMessage = 'Function name is already taken by another function';
                this.funcModal.isNameError = true;
                return;
            }


            const funcDef = {
                name: name,
                description: this.funcModal.description,
                args: this.funcModal.args.map(arg => {
                    return {
                        name: arg.name,
                        description: '',
                        type: arg.type,
                        value: arg.value
                    };
                }),
                props: utils.clone(this.funcModal.props),
            };


            if (this.funcModal.isNew) {
                this.schemeContainer.scheme.scripts.functions.push(funcDef);
            } else {
                const oldFuncDef = this.schemeContainer.scheme.scripts.functions[this.funcModal.funcIdx];
                this.fixAllFunctionArgsInItems(funcDef.args, oldFuncDef.name, funcDef.name);
                this.schemeContainer.scheme.scripts.functions[this.funcModal.funcIdx] = funcDef;
            }
            this.funcModal.shown = false;

            EditorEventBus.schemeChangeCommitted.$emit(this.editorId);
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

        onArgTypeChanged(argIdx, event) {
            const argDef = this.funcModal.args[argIdx];
            const newType = event.target.value;
            argDef.descriptor = {type: newType};
            argDef.value = defaultTypeValues[newType];
        },

        onArgDefaultValueChange(argIdx, value) {
            this.funcModal.args[argIdx].value = value;
        },

        addFuncArgument() {
            const idx = this.funcModal.args.length + 1;
            this.funcModal.args.push({
                name: `arg${idx}`,
                type: 'string',
                descriptor: {type: 'string'},
                value: '',
                isError: false,
            });
        },

        onFuncScriptChanged(script) {
            this.funcModal.script = script;
        },

        onMainScriptChange(script) {
            this.schemeContainer.scheme.scripts.main.source = script;
            EditorEventBus.schemeChangeCommitted.$emit(this.editorId);
            this.mainScript = script;
        },

        toggleMainScript() {
            this.mainScriptEditorShown = true;
        },

        startAddingNewFunction() {
            this.funcModal.name = '';
            this.funcModal.isNameError = false;
            this.funcModal.description = '';
            this.funcModal.isNew = true;
            this.funcModal.args = [];
            this.funcModal.script = '';
            this.funcModal.errorMessage = null;
            this.funcModal.shown = true;
            this.funcModal.funcIdx = -1;
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
        },

        openFuncEditor(funcIdx) {
            const funcDef = this.schemeContainer.scheme.scripts.functions[funcIdx];
            this.funcModal.name = funcDef.name;
            this.funcModal.isNameError = false;
            this.funcModal.description = funcDef.description;
            this.funcModal.isNew = false;
            this.funcModal.args = funcDef.args.map(arg => {
                return {
                    ...arg,
                    descriptor: {type: arg.type},
                };
            });
            this.funcModal.props = utils.clone(funcDef.props);
            this.funcModal.script = funcDef.source;
            this.funcModal.errorMessage = null;
            this.funcModal.shown = true;
            this.funcModal.funcIdx = funcIdx;
        }
    },

    computed: {
        funcModalTitle() {
            return this.funcModal.isNew ? 'New function ...' : 'Function editor';
        },

        funcModalButtonName() {
            return this.funcModal.isNew ? 'Add' : 'Update';
        }
    }
}
</script>