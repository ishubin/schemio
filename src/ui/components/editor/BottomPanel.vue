<template>
    <div class="bottom-panel"
        :style="{height: `${bottomPanelHeight}px`}"
    >
        <div class="bottom-panel-dragger" @touchstart="onBottomPanelMouseDown" @mousedown="onBottomPanelMouseDown"></div>
        <div class="bottom-panel-body">
            <div class="side-panel-filler-left" :style="{width: `${paddingLeft}px`}"></div>

            <div class="bottom-panel-content" v-if="selectedItem && selectedItem.shape === 'frame_player'">
                <FrameAnimatorPanel
                    v-if="currentAnimatorFramePlayer"
                    :key="currentAnimatorFramePlayer.id"
                    :editorId="editorId"
                    :schemeContainer="schemeContainer"
                    :framePlayerItemId="currentAnimatorFramePlayer.id"
                    :light="false"
                    @close="closeAnimatorEditor"
                    @recording-state-updated="onFrameAnimatorRectordingStateUpdated"
                    />
                <FrameAnimatorPanel
                    v-else
                    :key="selectedItem.id"
                    :editorId="editorId"
                    :schemeContainer="schemeContainer"
                    :framePlayerItemId="selectedItem.id"
                    :light="true"
                    @animation-editor-opened="onAnimatiorEditorOpened"
                    @recording-state-updated="onFrameAnimatorRectordingStateUpdated"
                    />
            </div>

            <div v-else-if="selectedItem && selectedItem.shape === 'component'" class="bottom-panel-content">
                <div class="toggle-group">
                    <span class="toggle-button" :class="{toggled: selectedItem.shapeProps.kind == 'external'}" @click="switchSelectedComponentKind('external')" title="Loads external diagram">
                        External
                    </span>
                    <span class="toggle-button" :class="{toggled: selectedItem.shapeProps.kind == 'embedded'}" @click="switchSelectedComponentKind('embedded')" title="Use items in the same document">
                        Embedded
                    </span>
                </div>
                <div v-if="selectedItem.shapeProps.kind == 'external'" class="diagram-controls">
                    <span class="label">External diagram: </span>
                    <DiagramPicker
                        :key="`selected-component-diagram-picker-${selectedItem.id}-${selectedItem.shapeProps.schemeId}`"
                        :diagramId="selectedItem.shapeProps.schemeId"
                        @diagram-selected="onDiagramPickedForSelectedComponent"/>
                </div>
                <div v-if="selectedItem.shapeProps.kind == 'embedded'" class="diagram-controls">
                    <span class="label">Reference Item: </span>
                    <ElementPicker :editorId="editorId"
                        :element="selectedItem.shapeProps.referenceItem"
                        :schemeContainer="schemeContainer"
                        :useSelf="false"
                        @selected="setSelectedComponentReferenceItem"
                        />
                </div>
            </div>

            <div v-else-if="state === 'editPath' && curveEditing" class="bottom-panel-content">
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
            </div>

            <div v-else class="bottom-panel-content">
                empty panel
            </div>

            <div class="side-panel-filler-right" :style="{width: `${paddingRight}px`}"></div>
        </div>
    </div>
</template>


<script>
import { dragAndDropBuilder } from '../../dragndrop';
import myMath from '../../myMath';
import { localPointOnItem } from '../../scheme/ItemMath';
import FrameAnimatorPanel from './animator/FrameAnimatorPanel.vue';
import DiagramPicker from './DiagramPicker.vue';
import EditorEventBus from './EditorEventBus.js';
import ElementPicker from './ElementPicker.vue';
import { convertCurvePointToRelative } from './items/shapes/StandardCurves';


function prettifyAxisValue(value, zoom) {
    value = parseFloat(value);
    if (zoom <= 100) {
        return value.toFixed(0);
    } else if (zoom < 500) {
        return value.toFixed(1);
    }
    return value.toFixed(2);
}


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

    components: { FrameAnimatorPanel, DiagramPicker, ElementPicker },

    data() {
        return {
            currentAnimatorFramePlayer: null,
            bottomPanelHeight: 300,
        };
    },

    methods: {
        onFrameAnimatorRectordingStateUpdated(isRecording) {
            this.$emit('frame-animator-recording-state-updated', isRecording);
        },

        closeAnimatorEditor() {
            this.currentAnimatorFramePlayer = null;
        },

        onAnimatiorEditorOpened(framePlayer) {
            this.currentAnimatorFramePlayer = framePlayer;
        },

        onBottomPanelMouseDown(originalEvent) {
            dragAndDropBuilder(originalEvent)
            .onDrag((event, pageX, pageY) => {
                this.bottomPanelHeight = myMath.clamp(window.innerHeight - pageY, 20, window.innerHeight - 100);
            })
            .build();
        },

        switchSelectedComponentKind(kind) {
            if (!this.selectedItem || this.selectedItem.shape !== 'component') {
                return;
            }
            this.selectedItem.shapeProps.kind = kind;
            EditorEventBus.item.changed.specific.$emit(this.editorId, this.selectedItem.id, 'shapeProps.kind');
            EditorEventBus.schemeChangeCommitted.$emit(this.editorId, `items.${this.selectedItem.id}.shapeProps.kind`);
            this.updateSelectedComponent();
        },

        onDiagramPickedForSelectedComponent(diagram) {
            if (!this.selectedItem || this.selectedItem.shape !== 'component') {
                return;
            }
            this.selectedItem.shapeProps.schemeId = diagram.id;
            EditorEventBus.schemeChangeCommitted.$emit(this.editorId, `item.${this.selectedItem.id}.shapeProps.schemeId`);
        },

        setSelectedComponentReferenceItem(element) {
            if (!this.selectedItem || this.selectedItem.shape !== 'component') {
                return;
            }
            this.selectedItem.shapeProps.referenceItem = element;
            EditorEventBus.item.changed.specific.$emit(this.editorId, this.selectedItem.id, 'shapeProps.referenceItem');
            EditorEventBus.schemeChangeCommitted.$emit(this.editorId, `items.${this.selectedItem.id}.shapeProps.referenceItem`);
            this.updateSelectedComponent();
        },

        updateSelectedComponent() {
            if (!this.selectedItem || this.selectedItem.shape !== 'component') {
                return;
            }
            if (this.selectedItem.shapeProps.kind !== 'embedded' && this.selectedItem._childItems) {
                this.selectedItem._childItems = [];
            }
            this.schemeContainer.reindexSpecifiedItems([this.selectedItem]);
            this.schemeContainer.reindexItems();
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
        }
    },
};
</script>