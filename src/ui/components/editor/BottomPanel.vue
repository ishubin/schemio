<template>
    <div class="bottom-panel" :class="{collapsed: collapsed}"
        :style="{height: `${collapsed ? collapseHeight : bottomPanelHeight}px`}"
    >
        <div class="side-panel-filler-left" :style="{width: `${paddingLeft+4}px`}"></div>
        <div class="bottom-panel-body">
            <div v-if="collapsed" class="bottom-panel-content bottom-panel-status-bar">
                <template v-if="state === 'editPath' && curveEditing">
                    <span v-if="curveEditing.selectedPoints.length !== 1" class="label">x: {{ prettifyAxisValue(cursorX, zoom) }}</span>
                    <span v-if="curveEditing.selectedPoints.length !== 1" class="label">y: {{ prettifyAxisValue(cursorY, zoom) }}</span>
                        <template v-if="curveEditing.selectedPoints.length === 1">
                            <span class="label">x: </span>
                            <input type="text" class="textfield"
                                :value="prettifyAxisValue(curveEditing.selectedPoints[0].x, zoom)"
                                @blur="onCurveEditingPointInput($event.target.value, 'x')"
                                @keydown.enter="onCurveEditingPointInput($event.target.value, 'x')"
                                />

                            <span class="label">y: </span>
                            <input type="text" class="textfield"
                                :value="prettifyAxisValue(curveEditing.selectedPoints[0].y, zoom)"
                                @blur="onCurveEditingPointInput($event.target.value, 'y')"
                                @keydown.enter="onCurveEditingPointInput($event.target.value, 'y')"
                                />

                            <span v-if="curveEditing.selectedPoints[0].t === 'A'" class="label">arc height:</span>
                            <input v-if="curveEditing.selectedPoints[0].t === 'A'" type="text" class="textfield" :value="prettifyAxisValue(curveEditing.selectedPoints[0].h, zoom)" @input="onCurveEditingArcHeightInput($event.target.value)"/>
                        </template>
                </template>
                <div v-else class="bottom-panel-status-bar-menu">
                    <template v-for="tab in tabs">
                        <template v-if="!tab.disabled">
                            <span class="icon" @click="selectTabFromCollapsed(tab)" :title="tab.name">
                                <i v-if="tab.iconClass" :class="tab.iconClass"></i>
                            </span>
                        </template>
                    </template>
                </div>
            </div>
            <div v-else class="bottom-panel-content">
                <ul class="tabs">
                    <li v-for="tab in tabs">
                        <div class="tab" :class="{active: tab.name === currentTab, disabled: tab.disabled}" @click="selectTab(tab)">
                            <i v-if="tab.iconClass" :class="tab.iconClass"></i>
                            <span class="tab-label">{{tab.name}}</span>
                        </div>
                    </li>
                </ul>
                <div class="tabs-body"></div>

                <template v-if="currentTab === 'Console'">
                    <EditorScriptPanel
                        :editorId="editorId"
                        :schemeContainer="schemeContainer"
                        />
                </template>

                <template v-if="currentTab === 'Editor Code'">
                    <div class="row vertical">
                        <div class="row centered gap">
                            <Tooltip>Global code library that runs before every Console script and Editor Script shape. Define reusable variables and helper functions here.</Tooltip>
                            <div class="hint hint-small col-1">
                                This code loads for every console command and Editor Script shape.
                            </div>
                        </div>
                        <div class="col-1" style="height: 100%; min-height: 0;">
                            <div class="editor-script-scrollable-pane">
                                <ScriptEditor
                                    key="editor-code"
                                    :schemeContainer="schemeContainer"
                                    :value="schemeContainer.scheme.scripts.editor.source"
                                    :autoHeight="true"
                                    :autoFocus="true"
                                    @changed="onEditorScriptChange"
                                />
                            </div>
                        </div>
                    </div>
                </template>

                <template v-if="currentTab === 'Main Script'">
                    <div class="row vertical">
                        <div class="row centered gap">
                            <Tooltip>Initialization script executed when the diagram loads in view mode. Functions declared here are available globally to all diagram scripts.</Tooltip>
                            <div class="hint hint-small col-1">
                                This code is executed in "view" mode during scene initialization
                            </div>
                        </div>
                        <div class="col-1" style="height: 100%; min-height: 0;">
                            <div class="editor-script-scrollable-pane">
                                <ScriptEditor
                                    key="main-script"
                                    :schemeContainer="schemeContainer"
                                    :value="schemeContainer.scheme.scripts.main.source"
                                    :autoHeight="true"
                                    :autoFocus="true"
                                    @changed="onMainScriptChange"
                                />
                            </div>
                        </div>
                    </div>
                </template>

                <div class="bottom-scrollable-panel" v-if="currentTab === 'Animation'">
                    <FrameAnimatorPanel
                        :editorId="editorId"
                        :schemeContainer="schemeContainer"
                        @recording-state-updated="onFrameAnimatorRectordingStateUpdated"
                        />
                </div>

                <div class="bottom-scrollable-panel" v-if="currentTab === 'Functions'">
                    <CustomFunctionsEditor
                        :editorId="editorId"
                        :schemeContainer="schemeContainer"
                        :functions="schemeContainer.scheme.scripts.functions"
                        />
                </div>

                <template v-if="currentTab === 'Classes'">
                    <ItemClassesPanel :editorId="editorId" :schemeContainer="schemeContainer"/>
                </template>

                <template v-if="currentTab === 'Path'">
                    <template v-if="state === 'editPath' && curveEditing">
                        <span v-if="curveEditing.selectedPoints.length !== 1" class="label">x: {{ prettifyAxisValue(cursorX, zoom) }}</span>
                        <span v-if="curveEditing.selectedPoints.length !== 1" class="label">y: {{ prettifyAxisValue(cursorY, zoom) }}</span>
                        <div v-if="curveEditing.selectedPoints.length === 1" class="first-selected-point">
                            <span class="label">x: </span>
                            <input type="text" class="textfield"
                                :value="prettifyAxisValue(curveEditing.selectedPoints[0].x, zoom)"
                                @blur="onCurveEditingPointInput($event.target.value, 'x')"
                                @keydown.enter="onCurveEditingPointInput($event.target.value, 'x')"
                                />

                            <span class="label">y: </span>
                            <input type="text" class="textfield"
                                :value="prettifyAxisValue(curveEditing.selectedPoints[0].y, zoom)"
                                @blur="onCurveEditingPointInput($event.target.value, 'y')"
                                @keydown.enter="onCurveEditingPointInput($event.target.value, 'y')"
                                />

                            <span v-if="curveEditing.selectedPoints[0].t === 'A'" class="label">arc height:</span>
                            <input v-if="curveEditing.selectedPoints[0].t === 'A'" type="text" class="textfield" :value="prettifyAxisValue(curveEditing.selectedPoints[0].h, zoom)" @input="onCurveEditingArcHeightInput($event.target.value)"/>
                        </div>
                    </template>
                </template>
            </div>

            <div class="bottom-panel-dragger" @touchstart="onBottomPanelMouseDown" @mousedown="onBottomPanelMouseDown"></div>

            <div class="bottom-panel-expand-button">
                <i v-if="collapsed" class="fa-regular fa-square-caret-up" @click="expandBottomPanel"></i>
                <i v-else class="fa-regular fa-square-caret-down" @click="collapseBottomPanel"></i>
            </div>
        </div>

        <div class="side-panel-filler-right" :style="{width: `${paddingRight+4}px`}"></div>
    </div>
</template>


<script>
import { dragAndDropBuilder } from '../../dragndrop';
import { createSettingStorageFromLocalStorage } from '../../LimitedSettingsStorage.js';
import myMath from '../../myMath';
import { localPointOnItem } from '../../scheme/ItemMath';
import EditorScriptPanel from '../EditorScriptPanel.vue';
import FrameAnimatorPanel from './animator/FrameAnimatorPanel.vue';
import DiagramPicker from './DiagramPicker.vue';
import EditorEventBus from './EditorEventBus.js';
import ElementPicker from './ElementPicker.vue';
import { convertCurvePointToRelative } from './items/shapes/StandardCurves';
import ScriptEditor from './ScriptEditor.vue';
import ItemClassesPanel from './ItemClassesPanel.vue';
import CustomFunctionsEditor from './CustomFunctionsEditor.vue';
import Tooltip from '../Tooltip.vue';

const BOTTOM_PANEL_COLLAPSED = 'bottom-panel-collapsed';
const BOTTOM_PANEL_HEIGHT = 'bottom-panel-height';
const CURRENT_TAB = '';
const editorPanelStorage = createSettingStorageFromLocalStorage('editor-panels', 40);
const defaultExpandPanelHeight = 200;

function prettifyAxisValue(value, zoom) {
    value = parseFloat(value);
    if (zoom <= 100) {
        return value.toFixed(0);
    } else if (zoom < 500) {
        return value.toFixed(1);
    }
    return value.toFixed(2);
}

const allTabs = [{
    name: 'Console', iconClass: 'fa-solid fa-terminal',
    }, {
    name: 'Animation', iconClass: 'fas fa-film',
    }, {
    name: 'Editor Code', iconClass: 'fa-solid fa-code',
    }, {
    name: 'Main Script', iconClass: 'fa-solid fa-laptop-code',
    }, {
    name: 'Functions', iconClass: 'fa-solid fa-florin-sign',
    }, {
    name: 'Classes', iconClass: 'fa-solid fa-book',
    }, {
    name: 'Path', iconClass: 'fa-solid fa-bezier-curve', disabled: true
}];

const pathTabIdx = allTabs.length - 1;

export default {
    props: {
        editorId       : {type: String, required: true},
        state          : {type: String, required: true},
        selectedItem   : {type: Object, default: null},
        schemeContainer: {type: Object, required: true},
        paddingLeft    : {type: Number, default: 0},
        paddingRight   : {type: Number, default: 0},
        zoom           : {type: Number, required: true},
        cursorX        : {type: Number, required: true},
        cursorY        : {type: Number, required: true},
        curveEditing   : {type: Object}
    },

    components: {
        FrameAnimatorPanel, DiagramPicker, ElementPicker, EditorScriptPanel,
        ScriptEditor, ItemClassesPanel, CustomFunctionsEditor, Tooltip
    },

    data() {
        let currentTab = editorPanelStorage.get(CURRENT_TAB, 'Console');
        // Path tab may only be selected when the state changes to path editing
        if (currentTab === 'Path' || allTabs.findIndex(tab => tab.name === currentTab) < 0 ) {
            currentTab = allTabs[0].name;
        }
        return {
            tabs: allTabs,
            currentTab: currentTab,
            collapsed: editorPanelStorage.get(BOTTOM_PANEL_COLLAPSED, true),
            bottomPanelHeight: Math.min(window.innerHeight /2,  editorPanelStorage.get(BOTTOM_PANEL_HEIGHT, defaultExpandPanelHeight)),
            collapseHeight: 20,
        };
    },

    methods: {
        onEditorScriptChange(script) {
            this.schemeContainer.scheme.scripts.editor.source = script;
            EditorEventBus.schemeChangeCommitted.$emit(this.editorId, 'scripts.editor.source');
        },

        onMainScriptChange(script) {
            this.schemeContainer.scheme.scripts.main.source = script;
            EditorEventBus.schemeChangeCommitted.$emit(this.editorId, 'scripts.main.source');
        },

        collapseBottomPanel() {
            this.collapsed = true;
        },
        expandBottomPanel() {
            this.bottomPanelHeight = Math.min(window.innerHeight/2, defaultExpandPanelHeight);
            this.collapsed = false;
        },
        selectTab(tab) {
            if (tab.disabled) {
                return;
            }
            this.currentTab = tab.name;
        },
        selectTabFromCollapsed(tab) {
            this.expandBottomPanel();
            this.selectTab(tab);
        },

        onFrameAnimatorRectordingStateUpdated(isRecording) {
            this.$emit('frame-animator-recording-state-updated', isRecording);
        },

        prettifyAxisValue(value, zoom) {
            return prettifyAxisValue(value, zoom);
        },

        onCurveEditingPointInput(text, axis) {
            const value = parseFloat(text);
            if (isNaN(value) || this.curveEditing.selectedPoints.length !== 1 || !this.curveEditing.item) {
                return;
            }

            const {pathId, pointId} = this.curveEditing.selectedPoints[0];
            const point = this.curveEditing.item.shapeProps.paths[pathId].points[pointId];

            let {x, y} = this.curveEditing.selectedPoints[0];
            const worldPoint = {x, y};
            worldPoint[axis] = value;

            const localPoint = localPointOnItem(worldPoint.x, worldPoint.y, this.curveEditing.item);
            const convertedPoint = convertCurvePointToRelative(localPoint, this.curveEditing.item.area.w, this.curveEditing.item.area.h);

            point.x = convertedPoint.x;
            point.y = convertedPoint.y;
            EditorEventBus.item.changed.specific.$emit(this.editorId, this.curveEditing.item.id, `shapeProps.paths`);
            EditorEventBus.schemeChangeCommitted.$emit(this.editorId, `item.${this.curveEditing.item.id}.shapeProps.paths.points`);
            this.updateCurveEditPoint(this.curveEditing.item, pathId, pointId, point);
        },

        onCurveEditingArcHeightInput(text) {
            const value = parseFloat(text);
            if (isNaN(value)
                || this.curveEditing.selectedPoints.length !== 1
                || this.curveEditing.selectedPoints[0].t !== 'A'
                || !this.curveEditing.item) {
                return;
            }
            const {pathId, pointId} = this.curveEditing.selectedPoints[0];
            const point = this.curveEditing.item.shapeProps.paths[pathId].points[pointId];
            point.h = value;

            EditorEventBus.item.changed.specific.$emit(this.editorId, this.curveEditing.item.id, `shapeProps.paths`);
            EditorEventBus.schemeChangeCommitted.$emit(this.editorId, `item.${this.curveEditing.item.id}.shapeProps.paths.points`);
            this.updateCurveEditPoint(this.curveEditing.item, pathId, pointId, point);
        },

        updateCurveEditPoint(item, pathId, pointId, point) {
            this.$emit('update-curve-edit-point', item, pathId, pointId, point);
        },

        initPanelDragging(originalEvent) {
            return dragAndDropBuilder(originalEvent)
            .onDrag((event, pageX, pageY) => {
                this.bottomPanelHeight = myMath.clamp(window.innerHeight - pageY, 0, window.innerHeight - 100);
                if (this.bottomPanelHeight <= this.collapseHeight) {
                    this.collapsed = true;
                    this.bottompanelheight = 0;
                } else {
                    this.collapsed = false;
                }
            });
        },

        onBottomPanelMouseDown(originalEvent) {
            this.initPanelDragging(originalEvent).build();
        },

        switchToPathTab() {
            this.tabs[pathTabIdx].disabled = false;
            this.currentTab = this.tabs[pathTabIdx].name;
        },

        switchOffPathTab() {
            this.tabs[pathTabIdx].disabled = true;
            this.currentTab = this.tabs[0].name;
        }
    },

    watch: {
        collapsed(value) {
            editorPanelStorage.save(BOTTOM_PANEL_COLLAPSED, value);
        },

        bottomPanelHeight(value) {
            editorPanelStorage.save(BOTTOM_PANEL_HEIGHT, value);
        },

        state(state) {
            if (state === 'editPath') {
                this.switchToPathTab();
            } else {
                this.switchOffPathTab();
            }
        },

        currentTab(tabName) {
            editorPanelStorage.save(CURRENT_TAB, tabName);
        },
    }
};
</script>