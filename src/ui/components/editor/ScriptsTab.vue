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
                <span class="col-1 btn btn-secondary" @click="startAddingNewFunction" title="Add new function"><i class="fa-solid fa-florin-sign"></i> New function</span>
                <span class="btn btn-secondary" @click="openImportFunctionModal" title="Import functions & classes"><i class="fa-solid fa-file-import"></i></span>
                <div></div>
            </div>


            <ul class="navbar-functions-list">
                <li v-for="(func, funcIdx) in schemeContainer.scheme.scripts.functions">
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
                <span v-if="schemeContainer.scheme.scripts.functions.length > 0"
                    class="btn btn-secondary"
                    @click="copyAllFuncs()"
                    title="Copy all functions in this document"
                    >
                    Copy all
                </span>
                <span class="btn btn-secondary" @click="pasteFuncs()">Paste functions</span>
            </div>
        </Panel>


        <Panel uid="item-classes" name="Item Classes">
            <div class="row gap centered">
                <div>
                    <Tooltip>
                        Classes let you define global and parameterized behavior and re-use accross numerous items.
                        Any item can be extended with multiple classes.
                    </Tooltip>
                </div>
                <span class="col-1 btn btn-secondary" @click="startAddingNewClass" title="Add new class"><i class="fa-solid fa-book"></i> New class</span>
                <span class="btn btn-secondary" @click="openImportFunctionModal" title="Import classes"><i class="fa-solid fa-file-import"></i></span>
                <div></div>
            </div>
            <ul class="navbar-functions-list">
                <li v-for="(clazz, classIdx) in schemeContainer.scheme.scripts.classes">
                    <span class="func-name" @click="openClassEditor(classIdx)">
                        <i class="fa-solid fa-book"></i>
                        {{ clazz.name }}
                    </span>
                    <div class="operations">
                        <span class="link" @click="copyClass(classIdx)" title="Copy class"><i class="fa-regular fa-copy"></i></span>
                        <span class="link icon-delete" @click="deleteClass(classIdx)" title="Remove class"><i class="fas fa-times"></i></span>
                    </div>
                </li>
            </ul>

            <div class="section">
                <span v-if="schemeContainer.scheme.scripts.classes.length > 0"
                    class="btn btn-secondary"
                    @click="copyAllClasses()"
                    title="Copy all classes in this document">
                    Copy all
                </span>
                <span class="btn btn-secondary" @click="pasteClasses()">Paste classes</span>
            </div>
        </Panel>

        <Modal v-if="mainScriptEditorShown" title="Main script" :width="900" @close="mainScriptEditorShown = false" :useMask="false">
            <ScriptEditor
                :value="mainScript"
                :schemeContainer="schemeContainer"
                :height="mainScriptEditorHeight"
                @changed="onMainScriptChange"
                />
        </Modal>


        <Modal v-if="classModal.shown" title="Class editor" :width="900" @close="classModal.shown = false" closeName="Close" :useMask="false">
            <Panel uid="class-modal-name" name="General">
                <div class="section">
                    <div class="ctrl-label-inline">Shape support:</div>
                    <Dropdown :inline="true" :width="200" :options="allShapeOptions" @selected="onClassShapeSelected">
                        {{ classModal.shape }}
                    </Dropdown>
                </div>

                <div class="ctrl-label">Name</div>
                <input type="text" class="textfield" :class="{'field-error': classModal.isNameError}"
                    v-model="classModal.name"
                    @input="onClassNameChange($event.target.value)"/>

                <div class="ctrl-label">Description</div>
                <textarea type="text" class="textfield" v-model="classModal.description" rows="3"
                    @input="onClassDescriptionChange($event.target.value)"></textarea>

            </Panel>


            <Panel uid="class-modal-arguments" name="Arguments">
                <CustomArgsEditor
                    :editorId="editorId"
                    :args="classModal.args"
                    :schemeContainer="schemeContainer"
                    @arg-added="onClassArgAdded($event, classModal.classIdx)"
                    @arg-deleted="deleteClassArgument($event)"
                    @arg-name-changed="onClassArgNameChange"
                    @arg-type-changed="onClassArgTypeChanged"
                    @arg-value-changed="onClassArgDefaultValueChange"
                />
            </Panel>


            <BehaviorProperties
                :key="`class-behavior-panel-${classModal.id}-${classModal.revision}`"
                :editorId="editorId"
                :item="classModal.item"
                :onlyEvents="true"
                :schemeContainer="schemeContainer"
                :shadowItem="true"
                :scopeArgs="classModal.args"
                @shadow-item-updated="onBehaviorPropertiesUpdate"
                />
        </Modal>


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

        <Modal v-if="importFunctionModal.shown" title="Import functions & classes"
            primaryButton="Import"
            :primaryButtonDisabled="importButtonDisabled"
            @close="importFunctionModal.shown = false"
            @primary-submit="importSelectedFunctionsAndClasses"
            >
            <div>
                <span v-if="importFunctionModal.searchDiagramSupported"
                    class="btn btn-secondary"
                    @click="openSchemeSearchModalForImport"
                    title="Search for other documents and import their functions"
                    >
                    <i class="fa-solid fa-magnifying-glass"></i> Search documents
                </span>
                <span class="btn btn-secondary" title="Extract script functions from a file" @click="showImportJSONModal"><i class="fa-solid fa-file-arrow-up"></i> Upload document</span>

                <div class="function-import-container">
                    <div v-if="importFunctionModal.functions.length > 0">
                        <div class="hint hint-small">Select the function you want to import</div>
                        <ul>
                            <li v-for="(func, funcIdx) in importFunctionModal.functions">
                                <input type="checkbox" :id="`import-func-checkbox-${funcIdx}`" :checked="func.selected"  @input="toggleImportFunctionCheckbox(funcIdx, $event.target.checked)">
                                <label :for="`import-func-checkbox-${funcIdx}`">
                                    <i class="fa-solid fa-florin-sign"></i>
                                    {{ func.name }}
                                </label>
                                <Tooltip v-if="func.description">{{ func.description }}</Tooltip>
                            </li>
                        </ul>
                    </div>
                    <div v-if="importFunctionModal.classes.length > 0">
                        <div class="hint hint-small">Select classes you want to import</div>
                        <ul>
                            <li v-for="(classDef, classIdx) in importFunctionModal.classes">
                                <input type="checkbox" :id="`import-class-checkbox-${classIdx}`" :checked="classDef.selected"  @input="toggleImportClassCheckbox(classIdx, $event.target.checked)">
                                <label :for="`import-class-checkbox-${funcIdx}`">
                                    <i class="fa-solid fa-florin-sign"></i>
                                    {{ classDef.name }}
                                </label>
                                <Tooltip v-if="classDef.description">{{ classDef.description }}</Tooltip>
                            </li>
                        </ul>
                    </div>
                    <div v-if="importFunctionModal.functions.length === 0 && importFunctionModal.classes.length === 0" class="hint hint-small">
                        There are no functions or classes to import. Choose a diagram from which you want to import functions &amp; classes.
                    </div>
                </div>
            </div>

            <div class="msg msg-error" v-if="importFunctionModal.errorMessage">{{ importFunctionModal.errorMessage }}</div>

            <SchemeSearchModal v-if="importFunctionModal.searchModalShown"
                @close="importFunctionModal.searchModalShown = false"
                @selected-scheme="onExternalDiagramPicked"
                />
        </Modal>

        <div v-if="importSchemeFileShown" style="display: none">
            <input ref="importSchemeFileInput" type="file" @change="onImportSchemeFileInputChanged" accept="application/json"/>
        </div>

    </div>
</template>

<script>
import Panel from './Panel.vue';
import Modal from '../Modal.vue';
import ScriptEditor from './ScriptEditor.vue';
import Tooltip from '../Tooltip.vue';
import ScriptFunctionEditor from './properties/behavior/ScriptFunctionEditor.vue';
import utils from '../../utils';
import EditorEventBus from './EditorEventBus';
import { isValidColor } from '../../colors';
import shortid from 'shortid';
import SchemeSearchModal from './SchemeSearchModal.vue';
import StoreUtils from '../../store/StoreUtils';
import { defaultItemDefinition, traverseItems } from '../../scheme/Item';
import CustomArgsEditor from './CustomArgsEditor.vue';
import BehaviorProperties from './properties/BehaviorProperties.vue';
import Shape from './items/shapes/Shape';
import Dropdown from '../Dropdown.vue';
import { enrichItemWithDefaults } from '../../scheme/ItemFixer';
import { copyObjectToClipboard, getObjectFromClipboard } from '../../clipboard';
import { createDelayer } from '../../delayer';


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

    components: {
        Panel, ScriptEditor, Modal, Tooltip, ScriptFunctionEditor,
        SchemeSearchModal, CustomArgsEditor, BehaviorProperties, Dropdown
    },

    beforeDestroy() {
        this.funcModal.updateDelayer.destroy();
    },

    data() {
        const scheme = this.schemeContainer.scheme;
        return {
            mainScriptEditorShown: false,
            mainScript: scheme.scripts.main.source,

            allShapeOptions : [
                {name: 'All', shape: 'all', description: 'Support all shapes'}
            ].concat(Shape.getShapeIds().map(shapeId => {
                return {
                    name: shapeId,
                    shape: shapeId,
                };
            })),

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

            classModal: {
                revision: 0,
                shown: false,
                name: '',
                description: '',
                isNameError: false,
                args: [],
                classIdx: -1,
                errorMessage: null,
                shape: 'all',

                // used as a mock item to be passed into BehaviorProperties component
                // for editting class behavior
                item: null
            },

            importFunctionModal: {
                shown: false,
                searchModalShown: false,
                functions: [],
                classes: [],
                totalSelected: 0,
                errorMessage: null,
                searchDiagramSupported: this.$store.state.apiClient && this.$store.state.apiClient.getScheme
            },

            importSchemeFileShown: false,
        };
    },

    methods: {
        onClassShapeSelected(option) {
            const idx = this.classModal.classIdx;
            this.schemeContainer.scheme.scripts.classes[idx].shape = option.shape;
            this.classModal.shape = option.shape;
            const selectedShape = option.shape === 'all' ? 'rect' : option.shape;

            const tempItem = {shape: selectedShape};
            enrichItemWithDefaults(tempItem);
            this.classModal.item.shape = selectedShape;
            this.classModal.item.shapeProps = tempItem.shapeProps;

            this.classModal.revision += 1;
        },

        onBehaviorPropertiesUpdate(item) {
            const idx = this.classModal.classIdx;
            if (!this.classModal.shown || idx < 0) {
                return;
            }
            this.schemeContainer.scheme.scripts.classes[idx].events = item.behavior.events;
            this.classModal.item = item;
        },

        startAddingNewClass() {
            const classDef = {
                id: shortid.generate(),
                name: 'Unnamed class...',
                shape: 'all',
                description: '',
                args: [],
                events: utils.clone(defaultItemDefinition.behavior.events)
            };

            this.schemeContainer.scheme.scripts.classes.push(classDef);
            const idx = this.schemeContainer.scheme.scripts.classes.length - 1;
            this.classModal.classIdx = idx;
            this.classModal.name = this.schemeContainer.scheme.scripts.classes[idx].name;
            this.classModal.description = this.schemeContainer.scheme.scripts.classes[idx].description;
            this.classModal.args = [];
            this.classModal.isNameError = false;
            this.classModal.errorMessage = null;
            this.classModal.shape = 'all';
            const item = {id: classDef.id, shape: 'ellipse'};
            enrichItemWithDefaults(item);
            this.classModal.item = item;
            this.classModal.id = classDef.id;
            this.classModal.shown = true;
        },

        openClassEditor(classIdx) {
            const classDef = this.schemeContainer.scheme.scripts.classes[classIdx];
            // correcting for the docs which were previously created without shape contraint
            if (!classDef.shape) {
                classDef.shape = 'all';
            }
            this.classModal.name = classDef.name;
            this.classModal.isNameError = false;
            this.classModal.errorMessage = null;
            this.classModal.description = classDef.description;
            this.classModal.shape = classDef.shape || 'all';
            this.classModal.args = classDef.args.map(arg => {
                return {
                    ...arg,
                    descriptor: {type: arg.type},
                };
            });
            this.classModal.classIdx = classIdx;
            const item = {
                id: classDef.id,
                shape: classDef.shape === 'all' ? 'ellipse' : classDef.shape,
                behavior: {
                    events: classDef.events,
                }
            };
            enrichItemWithDefaults(item);
            this.classModal.item = item;
            this.classModal.shown = true;
        },

        onClassNameChange(name) {
            if (!name.trim()) {
                StoreUtils.addErrorSystemMessage(this.$store, 'Class should have a name', 'invalid-class-name');
                this.classModal.isNameError = true;
            } else {
                this.schemeContainer.scheme.scripts.classes[this.classModal.classIdx].name = name;
            }
        },

        onClassDescriptionChange(value) {
            this.schemeContainer.scheme.scripts.classes[this.classModal.classIdx].description = value;
            EditorEventBus.schemeChangeCommitted.$emit(this.editorId, `scripts.classes.${this.classModal.classIdx}.description`);
        },

        pasteClasses() {
            getObjectFromClipboard('script-classes').then(scriptClasses => {
                if (!Array.isArray(scriptClasses)) {
                    return
                }
                scriptClasses.forEach(scriptClass => {
                    scriptClass.id = shortid.generate();
                    this.schemeContainer.scheme.scripts.classes.push(scriptClass);
                });
                EditorEventBus.schemeChangeCommitted.$emit(this.editorId);
            });
        },

        copyAllClasses(idx) {
            copyObjectToClipboard('script-classes', this.schemeContainer.scheme.scripts.classes).then(() => {
                StoreUtils.addInfoSystemMessage(this.$store, 'Copied all classes');
            });
        },

        copyClass(idx) {
            const scriptClass = this.schemeContainer.scheme.scripts.classes[idx];
            copyObjectToClipboard('script-classes', [scriptClass]).then(() => {
                StoreUtils.addInfoSystemMessage(this.$store, `Copied "${scriptClass.name}" class`);
            });
        },

        deleteClass(idx) {
            const classDef = this.schemeContainer.scheme.scripts.classes[idx];
            this.schemeContainer.scheme.scripts.classes.splice(idx, 1);
            traverseItems(this.schemeContainer.scheme.items, item => {
                if (!Array.isArray(item.classes)) {
                    return;
                }
                for (let i = item.classes.length - 1; i >= 0; i--) {
                    if (item.classes[i].id === classDef.id) {
                        item.classes.splice(i, 1);
                    }
                }
            });
            EditorEventBus.schemeChangeCommitted.$emit(this.editorId);
            this.$forceUpdate();
        },

        deleteClassArgument(argIdx) {
            const classDef = this.schemeContainer.scheme.scripts.classes[this.classModal.classIdx];
            const argDef = this.schemeContainer.scheme.scripts.classes[this.classModal.classIdx].args[argIdx];
            classDef.args.splice(argIdx, 1);
            EditorEventBus.schemeChangeCommitted.$emit(this.editorId, `scripts.classes.${this.classModal.classIdx}.args.${argIdx}`);
            traverseItems(this.schemeContainer.scheme.items, item => {
                if (!Array.isArray(item.classes)) {
                    return;
                }
                item.classes.forEach(itemClass => {
                    if (!itemClass.id === classDef.id) {
                        return;
                    }
                    if (!itemClass.args) {
                        return;
                    }
                    if (itemClass.args.hasOwnProperty(argDef.name)) {
                        delete itemClass.args[argDef.name];
                    }
                });
            });
        },

        onClassArgNameChange(argIdx, name) {
            this.schemeContainer.scheme.scripts.classes[this.classModal.classIdx].args[argIdx].name = name;
            this.classModal.args[argIdx].name = name;
            this.classModal.revision += 1;
            EditorEventBus.schemeChangeCommitted.$emit(this.editorId, `scripts.classes.${this.classModal.classIdx}.args.${argIdx}.name`);
        },

        onClassArgAdded(argDef, classIdx) {
            const classDef = this.schemeContainer.scheme.scripts.classes[classIdx];
            classDef.args.push(argDef);
            this.classModal.args.push({
                ...argDef,
                descriptor: {type: argDef.type}
            });

            EditorEventBus.schemeChangeCommitted.$emit(this.editorId);

            traverseItems(this.schemeContainer.scheme.items, item => {
                if (!Array.isArray(item.classes)) {
                    return;
                }
                item.classes.forEach(itemClass => {
                    if (!itemClass.id === classDef.id) {
                        return;
                    }
                    if (!itemClass.args) {
                        itemClass.args = {};
                    }
                    itemClass.args[argDef.name] = argDef.value;
                });
            });
            this.classModal.revision += 1;
        },

        onClassArgTypeChanged(argIdx, argType, argValue) {
            const classDef = this.schemeContainer.scheme.scripts.classes[this.classModal.classIdx];
            if (classDef.args[argIdx].type === argType) {
                return;
            }
            classDef.args[argIdx].type = argType;
            classDef.args[argIdx].value = argValue;
            this.classModal.args[argIdx].type = argType;
            this.classModal.args[argIdx].descriptor.type = argType;
            EditorEventBus.schemeChangeCommitted.$emit(this.editorId, `scripts.classes.${this.classModal.classIdx}.args.${argIdx}.type`);

            traverseItems(this.schemeContainer.scheme.items, item => {
                if (!Array.isArray(item.classes)) {
                    return;
                }
                item.classes.forEach(itemClass => {
                    if (!itemClass.id === classDef.id) {
                        return;
                    }
                    if (!itemClass.args) {
                        itemClass.args = {};
                    }
                    itemClass.args[classDef.args[argIdx].name] = argValue;
                });
            });
            this.classModal.revision += 1;
        },

        onClassArgDefaultValueChange(argIdx, value) {
            this.schemeContainer.scheme.scripts.classes[this.classModal.classIdx].args[argIdx].value = value;
            EditorEventBus.schemeChangeCommitted.$emit(this.editorId, `scripts.classes.${this.classModal.classIdx}.args.${argIdx}.value`);
        },

        onClassNameChange(name) {
            this.schemeContainer.scheme.scripts.classes[this.classModal.classIdx].name = name;
            EditorEventBus.schemeChangeCommitted.$emit(this.editorId, `scripts.classes.${this.classModal.classIdx}.name`);
        },

        onFuncNameChange(name) {
            this.schemeContainer.scheme.scripts.functions[this.funcModal.funcIdx].name = name;
            EditorEventBus.schemeChangeCommitted.$emit(this.editorId, `scripts.functions.${this.funcModal.funcIdx}.name`);
        },

        onFuncDescriptionChange(value) {
            this.schemeContainer.scheme.scripts.functions[this.funcModal.funcIdx].description = value;
        },

        importSelectedFunctionsAndClasses() {
            this.importFunctionModal.functions.forEach(func => {
                if (func.selected) {
                    delete func.selected;
                    this.schemeContainer.scheme.scripts.functions.push(func);
                }
            });
            this.importFunctionModal.classes.forEach(classDef => {
                if (classDef.selected) {
                    delete classDef.selected;
                    this.schemeContainer.scheme.scripts.classes.push(classDef);
                }
            });
            this.importFunctionModal.shown = false;
            EditorEventBus.schemeChangeCommitted.$emit(this.editorId);
        },

        showImportJSONModal() {
            this.importSchemeFileShown = true;
            this.$nextTick(() => {
                this.$refs.importSchemeFileInput.click();
            });
        },

        openImportFunctionModal() {
            this.importFunctionModal.functions = [];
            this.importFunctionModal.totalSelected = 0;
            this.importFunctionModal.searchModalShown = false;
            this.importFunctionModal.errorMessage = null;
            this.importFunctionModal.shown = true;
        },

        toggleImportFunctionCheckbox(idx, selected) {
            this.importFunctionModal.functions[idx].selected = selected;
            this.updateTotalSelectedForImport();
        },

        toggleImportClassCheckbox(idx, selected) {
            this.importFunctionModal.classes[idx].selected = selected;
            this.updateTotalSelectedForImport();
        },

        updateTotalSelectedForImport() {
            let count = 0;
            this.importFunctionModal.functions.forEach(func => {
                if (func.selected) {
                    count++;
                }
            });
            this.importFunctionModal.classes.forEach(classDef => {
                if (classDef.selected) {
                    count++;
                }
            });
            this.importFunctionModal.totalSelected = count;
        },

        openSchemeSearchModalForImport() {
            this.importFunctionModal.searchModalShown = true;
        },

        onExternalDiagramPicked(doc) {
            this.importFunctionModal.searchModalShown = false;

            this.$store.state.apiClient.getScheme(doc.id).then(doc => {
                this.loadFunctionsAndClassesFromScheme(doc.scheme)
            })
            .catch(err => {
                console.error(err);
                this.importFunctionModal.errorMessage = 'Something went wrong, try again later';
            })
        },

        loadFunctionsAndClassesFromScheme(scheme) {
            this.importFunctionModal.functions = [];
            this.importFunctionModal.classes = [];
            this.importFunctionModal.totalSelected = 0;
            if (!scheme || !scheme.scripts) {
                return;
            }

            if (Array.isArray(scheme.scripts.functions)) {
                this.importFunctionModal.functions = scheme.scripts.functions.map(funcDef => {
                    return {
                        ...funcDef,
                        id: shortid.generate(),
                        selected: true
                    };
                });

                this.importFunctionModal.totalSelected += this.importFunctionModal.functions.length;
            }
            if (Array.isArray(scheme.scripts.classes)) {
                this.importFunctionModal.classes = scheme.scripts.classes.map(classDef => {
                    return {
                        ...classDef,
                        id: shortid.generate(),
                        selected: true
                    };
                });

                this.importFunctionModal.totalSelected += this.importFunctionModal.classes.length;
            }
        },

        onScriptFunctionEditorPropChange(name, value) {
            this.funcModal.props[name] = value;
            this.schemeContainer.scheme.scripts.functions[this.funcModal.funcIdx].props[name] = value;
            EditorEventBus.schemeChangeCommitted.$emit(this.editorId, `scripts.functions.${this.funcModal.funcIdx}.props.${name}`);
        },

        pasteFuncs() {
            getObjectFromClipboard('script-functions').then(funcs => {
                if (!Array.isArray(funcs)) {
                    return
                }
                funcs.forEach(func => {
                    func.id = shortid.generate();
                    this.schemeContainer.scheme.scripts.functions.push(func);
                });
                EditorEventBus.schemeChangeCommitted.$emit(this.editorId);
            });
        },

        copyAllFuncs(idx) {
            copyObjectToClipboard('script-functions', this.schemeContainer.scheme.scripts.functions).then(() => {
                StoreUtils.addInfoSystemMessage(this.$store, 'Copied all functions');
            });
        },

        copyFunc(idx) {
            const func = this.schemeContainer.scheme.scripts.functions[idx];
            copyObjectToClipboard('script-functions', [func]).then(() => {
                StoreUtils.addInfoSystemMessage(this.$store, `Copied "${func.name}" function`);
            });
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
            this.schemeContainer.scheme.scripts.functions[this.funcModal.funcIdx].args.splice(argIdx, 1);
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

        onFunctionArgNameChange(argIdx, name) {
            this.schemeContainer.scheme.scripts.functions[this.funcModal.funcIdx].args[argIdx].name = name;
            EditorEventBus.schemeChangeCommitted.$emit(this.editorId, `scripts.functions.${this.funcModal.funcIdx}.args.${argIdx}.name`);
            this.funcModal.updateDelayer.trigger();
        },

        onFuncArgAdded(argDef, funcIdx) {
            this.schemeContainer.scheme.scripts.functions[funcIdx].args.push(argDef);
            EditorEventBus.schemeChangeCommitted.$emit(this.editorId);
            this.funcModal.updateDelayer.trigger();
        },

        onFuncArgTypeChanged(argIdx, argType, argValue) {
            this.schemeContainer.scheme.scripts.functions[this.funcModal.funcIdx].args[argIdx].type = argType;
            this.schemeContainer.scheme.scripts.functions[this.funcModal.funcIdx].args[argIdx].value = argValue;
            EditorEventBus.schemeChangeCommitted.$emit(this.editorId, `scripts.functions.${this.funcModal.funcIdx}.args.${argIdx}.type`);
            this.funcModal.updateDelayer.trigger();
        },

        onFuncArgDefaultValueChange(argIdx, value) {
            this.schemeContainer.scheme.scripts.functions[this.funcModal.funcIdx].args[argIdx].value = value;
            EditorEventBus.schemeChangeCommitted.$emit(this.editorId, `scripts.functions.${this.funcModal.funcIdx}.args.${argIdx}.value`);
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
            this.funcModal.name = 'Unnamed function...';
            this.funcModal.isNameError = false;
            this.funcModal.description = '';
            this.funcModal.args = [];
            this.funcModal.script = '';
            this.funcModal.shown = true;
            this.funcModal.funcIdx = this.schemeContainer.scheme.scripts.functions.length;
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

            this.schemeContainer.scheme.scripts.functions.push(funcDef);
        },

        openFuncEditor(funcIdx) {
            const funcDef = this.schemeContainer.scheme.scripts.functions[funcIdx];
            this.funcModal.name = funcDef.name;
            this.funcModal.isNameError = false;
            this.funcModal.description = funcDef.description;
            this.funcModal.args = funcDef.args;
            this.funcModal.props = utils.clone(funcDef.props);
            this.funcModal.script = funcDef.source;
            this.funcModal.shown = true;
            this.funcModal.funcIdx = funcIdx;
        },

        onImportSchemeFileInputChanged(event) {
            this.loadSchemeFile(event.target.files[0]);
        },

        loadSchemeFile(file) {
            const reader = new FileReader();

            reader.onload = (event) => {
                this.importSchemeFileShown = false;
                try {
                    const scheme = JSON.parse(event.target.result);
                    this.loadFunctionsFromScheme(scheme);
                } catch(err) {
                    alert('Not able to import scheme. Malformed json');
                }
            };

            reader.readAsText(file);
        },

    },



    computed: {
        importButtonDisabled() {
            return this.importFunctionModal.totalSelected === 0;
        },
        mainScriptEditorHeight() {
            return window.innerHeight - 60;
        }
    }
}
</script>