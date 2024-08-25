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
                <table class="function-arguments">
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
            this.schemeContainer.scheme.scripts.functions.splice(funcIdx, 1);
            EditorEventBus.schemeChangeCommitted.$emit(this.editorId);
            this.$forceUpdate();
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

            this.funcModal.args.forEach(arg => {
                if (!argNameRegex.test(arg.name)) {
                    this.funcModal.errorMessage = 'Invalid argument name. It should not contain spaces or special symbols and start with a literal';
                    arg.isError = true;
                    isError = true;
                } else {
                    arg.isError = false;
                }
            });

            if (isError) {
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
                this.schemeContainer.scheme.scripts.functions[this.funcModal.funcIdx] = funcDef;
            }
            this.funcModal.shown = false;

            EditorEventBus.schemeChangeCommitted.$emit(this.editorId);
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