<!-- This Source Code Form is subject to the terms of the Mozilla Public
     License, v. 2.0. If a copy of the MPL was not distributed with this
     file, You can obtain one at https://mozilla.org/MPL/2.0/. -->

<template lang="html">
    <div class="scheme-editor-component">
        <QuickHelperPanel
            :key="`quick-helper-panel-${mode}`"
            v-if="currentSchemeContainer"
            :editorId="editorId"
            :scheme-container="currentSchemeContainer"
            :mode="mode"
            :state="state"
            :textSelectionEnabled="textSelectionEnabled"
            :zoom="zoom"
            :edit-allowed="editAllowed"
            :menuOptions="menuOptions"
            :historyUndoable="historyState.undoable"
            :historyRedoable="historyState.redoable"
            :isRecording="isRecording"
            :isScreenGrabbing="isScreenGrabbing"
            :modeControlEnabled="modeControlEnabled"
            @shape-prop-changed="onItemShapePropChanged"
            @text-style-prop-change="onItemGenericTextSlotPropChanged"
            @clicked-zoom-to-selection="zoomToSelection()"
            @clicked-undo="historyUndo()"
            @clicked-redo="historyRedo()"
            @clicked-bring-to-front="bringSelectedItemsToFront()"
            @clicked-bring-to-back="bringSelectedItemsToBack()"
            @clicked-grab-screen="toggleGrabScreen()"
            @zoom-changed="onZoomChanged"
            @zoomed-to-items="zoomToItems"
            @mode-changed="emitModeChangeRequested"
            @text-selection-changed="onTextSelectionForViewChanged"
            @stop-drawing-requested="stopDrawing"
            @stop-connecting-requested="stopConnecting"
            @items-highlighted="onItemsHighlighted"
            @mobile-debugger-requested="toggleMobileDebugger"
            >

            <ul v-if="(mode === 'edit' && state === 'editPath')" class="button-group">
                <li v-if="curveEditing.selectedPoints.length > 0">
                    <span class="toggle-button" :class="{'dimmed': curveEditing.selectedPoints[0].t != 'L'}" title="Simple" @click="convertCurvePointToSimple()">
                        <img width="16px" :src="`${assetsPath}/images/helper-panel/path-point-simple.svg`"/>
                    </span>
                </li>
                <li v-if="curveEditing.selectedPoints.length > 0">
                    <span class="toggle-button" :class="{'dimmed': curveEditing.selectedPoints[0].t != 'B'}" title="Simple" @click="convertCurvePointToBezier()">
                        <img width="20px" :src="`${assetsPath}/images/helper-panel/path-point-bezier.svg`"/>
                    </span>
                </li>
                <li>
                    <span @click="onPathEditStopped" class="btn btn-small btn-secondary">Stop edit</span>
                </li>
            </ul>

            <ul class="button-group" v-if="saveControlEnabled && mode === 'edit' && state !== 'editPath' && state !== 'draw' && state !== 'connecting' && (modified || statusMessage.message)">
                <li v-if="modified">
                    <span v-if="!isSaving" class="btn btn-primary" @click="saveScheme()">Save</span>
                    <span v-else class="btn btn-primary" @click="saveScheme()"><i class="fas fa-spinner fa-spin"></i> Saving...</span>
                </li>
                <li v-if="statusMessage.message">
                    <div class="msg" :class="{'msg-error': statusMessage.isError, 'msg-info': !statusMessage.isError}">
                        {{statusMessage.message}}
                        <span class="msg-close" @click="clearStatusMessage"><i class="fas fa-times"/></span>
                    </div>
                </li>
            </ul>
            </QuickHelperPanel>

        <div class="scheme-editor-middle-section" ref="middleSection">
            <div class="scheme-error-message" v-if="!schemeContainer && schemeLoadErrorMessage">
                <h3>{{schemeLoadErrorMessage}}</h3>
            </div>

            <div class="scheme-container" v-if="schemeContainer">
                <SvgEditor
                    v-if="schemeContainer && mode === 'edit'"
                    :class="['state-' + state, 'sub-state-' + editorSubStateName]"
                    :editorId="editorId"
                    :key="`${schemeContainer.scheme.id}-edit-${editorRevision}`"
                    :schemeContainer="schemeContainer"
                    :patchIndex="patchIndex"
                    :mode="mode"
                    :zoom="zoom"
                    :highlightedItems="highlightedItems"
                    :zoomedItems="zoomedItems"
                    :zoomToItemsTrigger="zoomToItemsTrigger"
                    :stateLayerShown="state === 'draw' || state === 'createItem'"
                    :screenTransform="initialScreenTransform"
                    @mouse-wheel="mouseWheel"
                    @mouse-move="mouseMove"
                    @mouse-down="mouseDown"
                    @mouse-up="mouseUp"
                    @mouse-double-click="mouseDoubleClick"
                    @svg-size-updated="onSvgSizeUpdated"
                    @screen-transform-updated="onScreenTransformUpdated"
                    >
                    <g slot="scene-transform">
                        <MultiItemEditBox  v-if="schemeContainer.multiItemEditBox && state !== 'editPath' && state !== 'cropImage' && !inPlaceTextEditor.shown"
                            :key="`multi-item-edit-box-${editorRevision}-${schemeContainer.multiItemEditBox.id}`"
                            :editorId="editorId"
                            :cursor="{x: cursorX, y: cursorY}"
                            :apiClient="apiClient"
                            :edit-box="schemeContainer.multiItemEditBox"
                            :zoom="schemeContainer.screenTransform.scale"
                            :boundaryBoxColor="schemeContainer.scheme.style.boundaryBoxColor"
                            :controlPointsColor="schemeContainer.scheme.style.controlPointsColor"
                            @custom-control-clicked="onMultiItemEditBoxCustomControlClicked"
                            @template-rebuild-requested="onTemplateRebuildRequested"
                            />

                        <MultiItemEditBox  v-if="state === 'cropImage' && cropImage.editBox"
                            :key="`crop-image-edit-box-${editorRevision}`"
                            kind="crop-image"
                            :editorId="editorId"
                            :cursor="{x: cursorX, y: cursorY}"
                            :apiClient="apiClient"
                            :edit-box="cropImage.editBox"
                            :zoom="schemeContainer.screenTransform.scale"
                            :boundaryBoxColor="schemeContainer.scheme.style.boundaryBoxColor"
                            :controlPointsColor="schemeContainer.scheme.style.controlPointsColor"
                            @custom-control-clicked="onMultiItemEditBoxCustomControlClicked"/>

                        <g v-if="state === 'editPath' && curveEditing.item && curveEditing.item.meta">
                            <PathEditBox
                                :key="`item-curve-edit-box-${editorRevision}-${curveEditing.item.id}`"
                                :editorId="editorId"
                                :item="curveEditing.item"
                                :curvePaths="curveEditing.paths"
                                :pathPointsUpdateKey="pathPointsUpdateKey"
                                :zoom="schemeContainer.screenTransform.scale"
                                :boundary-box-color="schemeContainer.scheme.style.boundaryBoxColor"
                                :control-points-color="schemeContainer.scheme.style.controlPointsColor"/>
                        </g>
                    </g>

                    <div slot="overlay">
                        <div v-if="state === 'pickElement'" class="editor-top-hint-label">Click any element to pick it</div>

                        <FloatingHelperPanel v-if="floatingHelperPanel.shown && floatingHelperPanel.item"
                            :key="`floating-helper-panel-${editorRevision}-${floatingHelperPanel.item.id}`"
                            :editorId="editorId"
                            :x="floatingHelperPanel.x"
                            :y="floatingHelperPanel.y"
                            :item="floatingHelperPanel.item"
                            :schemeContainer="schemeContainer"
                            @edit-path-requested="onEditPathRequested"
                            @image-crop-requested="startCroppingImage"
                            />
                    </div>
                </SvgEditor>

                <SvgEditor
                    v-if="interactiveSchemeContainer && mode === 'view'"
                    :key="`${schemeContainer.scheme.id}-view-${editorRevision}`"
                    :editorId="editorId"
                    :schemeContainer="interactiveSchemeContainer"
                    :patchIndex="patchIndex"
                    :mode="mode"
                    :textSelectionEnabled="textSelectionEnabled"
                    :zoom="zoom"
                    :userEventBus="userEventBus"
                    :highlightedItems="highlightedItems"
                    :zoomedItems="zoomedItems"
                    :zoomToItemsTrigger="zoomToItemsTrigger"
                    :screenTransform="initialScreenTransform"
                    @mouse-wheel="mouseWheel"
                    @mouse-move="mouseMove"
                    @mouse-down="mouseDown"
                    @mouse-up="mouseUp"
                    @mouse-double-click="mouseDoubleClick"
                    @svg-size-updated="onSvgSizeUpdated"
                    @screen-transform-updated="onScreenTransformUpdated"
                    >

                    <div slot="overlay">
                        <div v-if="mode === 'view' && textSelectionEnabled" class="editor-top-hint-label">
                            You can select any text, but you cannot interact with items
                            <span class="btn btn-primary" @click="textSelectionEnabled = false">Cancel</span>
                        </div>
                    </div>
                </SvgEditor>

                <!-- Item Text Editor -->
                <InPlaceTextEditBox v-if="inPlaceTextEditor.shown"
                    :key="`in-place-text-edit-${inPlaceTextEditor.item.id}-${inPlaceTextEditor.slotName}`"
                    :editorId="editorId"
                    :item="inPlaceTextEditor.item"
                    :slotName="inPlaceTextEditor.slotName"
                    :area="inPlaceTextEditor.area"
                    :css-style="inPlaceTextEditor.style"
                    :text="inPlaceTextEditor.text"
                    :markup-disabled="inPlaceTextEditor.markupDisabled"
                    :creating-new-item="inPlaceTextEditor.creatingNewItem"
                    :scalingVector="inPlaceTextEditor.scalingVector"
                    :zoom="schemeContainer.screenTransform.scale"
                    :mouseDownId="mouseDownId"
                    @close="closeItemTextEditor"
                    @updated="onInPlaceTextEditorUpdate"
                    @item-renamed="onInPlaceTextEditorItemRenamed"
                    @item-area-changed="onInPlaceTextEditorItemAreaChanged"
                    @item-text-cleared="onInPlaceTextEditorItemTextCleared"
                    />

            </div>


            <div v-if="mode === 'edit' && ((selectedItem && selectedItem.shape === 'frame_player') || currentAnimatorFramePlayer)"
                class="bottom-panel"
                :style="{height: currentAnimatorFramePlayer ? `${bottomPanelHeight}px`: null}"
                >
                <div class="bottom-panel-dragger" @touchstart="onBottomPanelMouseDown" @mousedown="onBottomPanelMouseDown" v-if="currentAnimatorFramePlayer"></div>
                <div class="bottom-panel-body">
                    <div class="side-panel-filler-left" :style="{width: `${sidePanelLeftWidth}px`}"></div>
                    <div class="bottom-panel-content">
                        <FrameAnimatorPanel
                            v-if="currentAnimatorFramePlayer"
                            :key="currentAnimatorFramePlayer.id"
                            :editorId="editorId"
                            :schemeContainer="schemeContainer"
                            :framePlayer="currentAnimatorFramePlayer"
                            :light="false"
                            @close="closeAnimatorEditor"
                            @recording-state-updated="onFrameAnimatorRectordingStateUpdated"
                            />

                        <FrameAnimatorPanel
                            v-else-if="selectedItem"
                            :key="selectedItem.id"
                            :editorId="editorId"
                            :schemeContainer="schemeContainer"
                            :framePlayer="selectedItem"
                            :light="true"
                            @animation-editor-opened="onAnimatiorEditorOpened"
                            @recording-state-updated="onFrameAnimatorRectordingStateUpdated"
                            />
                    </div>
                    <div class="side-panel-filler-right" :style="{width: `${sidePanelRightWidth}px`}"></div>
                </div>
            </div>

            <div v-else-if="mode === 'edit' && selectedItem && selectedItem.shape === 'component'" class="bottom-panel">
                <div class="bottom-panel-body">
                    <div class="side-panel-filler-left" :style="{width: `${sidePanelLeftWidth}px`}"></div>
                    <div class="bottom-panel-content">
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
                            <a v-if="selectedItem.shapeProps.schemeId"
                                :href="`${docsPath}/${selectedItem.shapeProps.schemeId}`"
                                :target="docsLinkTarget"
                                title="Open diagram new tab">
                                <i class="fa-solid fa-up-right-from-square"></i>
                            </a>
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
                    <div class="side-panel-filler-right" :style="{width: `${sidePanelRightWidth}px`}"></div>
                </div>
            </div>

            <div v-else-if="(mode === 'edit' && state === 'editPath')" class="bottom-panel">
                <div class="bottom-panel-body">
                    <div class="side-panel-filler-left" :style="{width: `${sidePanelLeftWidth}px`}"></div>
                    <div class="bottom-panel-content">
                        <span v-if="curveEditing.selectedPoints.length !== 1" class="label">x: {{cursorX | prettifyAxisValue(zoom)}}</span>
                        <span v-if="curveEditing.selectedPoints.length !== 1" class="label">y: {{cursorY | prettifyAxisValue(zoom)}}</span>
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
                    <div class="side-panel-filler-right" :style="{width: `${sidePanelRightWidth}px`}"></div>
                </div>
            </div>

            <div class="side-panel side-panel-left" ref="sidePanelLeft" v-if="mode === 'edit' && schemeContainer" :style="{width: `${sidePanelLeftWidth}px`}">
                <span class="side-panel-expander" @touchstart="onLeftSidePanelExpanderMouseDown" @mousedown="onLeftSidePanelExpanderMouseDown">
                    <i v-if="sidePanelLeftWidth > 0" class="fas fa-angle-left"></i>
                    <i v-else class="fas fa-angle-right"></i>
                </span>
                <div class="side-panel-overflow" v-if="sidePanelLeftWidth > 0">
                    <div class="wrapper">
                        <CreateItemMenu
                            :key="`${editorId}-${schemeContainer.scheme.id}`"
                            :editorId="editorId"
                            :scheme-container="schemeContainer"
                            :projectArtEnabled="projectArtEnabled"
                            @item-picked-for-creation="switchStateCreateItem"
                            @path-edited="startPathEditing"
                            @drawing-requested="switchStateDrawing"
                            @state-drag-item-requested="cancelCurrentState"
                            @item-creation-dragged-to-editor="itemCreationDraggedToSvgEditor"
                        />
                    </div>
                </div>
            </div>

            <div class="side-panel side-panel-right" ref="sidePanelRight" v-if="schemeContainer" :style="{width: `${sidePanelRightWidth}px`}">
                <span class="side-panel-expander" @touchstart="onRightSidePanelExpanderMouseDown" @mousedown="onRightSidePanelExpanderMouseDown">
                    <i v-if="sidePanelRightWidth > 0" class="fas fa-angle-right"></i>
                    <i v-else class="fas fa-angle-left"></i>
                </span>
                <div class="side-panel-overflow" v-if="sidePanelRightWidth > 0">
                    <ul v-if="inPlaceTextEditor.shown" class="tabs text-nonselectable">
                        <li><span class="tab active">Text</span></li>
                    </ul>
                    <ul v-else-if="state === 'draw'" class="tabs text-nonselectable">
                        <li><span class="tab active">Draw</span></li>
                    </ul>
                    <ul v-else class="tabs">
                        <li v-for="tab in tabs">
                            <span class="tab"
                                :class="{active: currentTab === tab}"
                                @click="changeTab(tab)"
                                >{{tab}}</span>
                        </li>
                        <li v-for="tab in extraTabs">
                            <div class="tab"
                                :class="{active: currentTab === `extra:${tab.name}`}"
                                @click="changeTab(`extra:${tab.name}`)"
                                >
                                <i v-if="tab.icon" class="tab-icon" :class="tab.icon"></i>
                                <span v-else>{{tab.name}}</span>
                                <span v-if="tab.count">({{tab.count}})</span>
                            </div>
                        </li>
                        <li v-for="itemTextSlotTab in itemTextSlotsAvailable" v-if="mode === 'edit'">
                            <span class="tab"
                                :class="{active: currentTab === itemTextSlotTab.tabName}"
                                @click="changeTab(itemTextSlotTab.tabName)"
                                >&#167; {{itemTextSlotTab.slotName}}</span>
                        </li>
                        <li v-if="mode !== 'view' && schemeContainer.selectedItems.length === 1 && schemeContainer.selectedItems[0].args && schemeContainer.selectedItems[0].args.templateRef">
                            <span class="tab"
                                :class="{active: currentTab === 'template'}"
                                @click="changeTab('template')"
                                >Template</span>
                        </li>
                    </ul>

                    <span class="side-panel-close" @click="hideSidePanelRight()">Close</span>

                    <div class="tabs-body" v-if="state === 'draw'">
                        <div v-for="color in drawColorPallete" class="draw-color-pallete-option" :style="{background: color}" @click="onDrawColorPicked(color)"></div>
                    </div>
                    <div v-else class="tabs-body">
                        <div v-if="currentTab === 'Doc' && schemeContainer && !inPlaceTextEditor.shown">
                            <SchemeProperties v-if="mode === 'edit'"
                                :scheme-container="schemeContainer"
                                :editorId="editorId"
                                :schemeTagsEnabled="schemeTagsEnabled"
                                @clicked-advanced-behavior-editor="advancedBehaviorProperties.shown = true"
                                @export-all-shapes="openExportAllShapesModal"
                                @delete-diagram-requested="$emit('delete-diagram-requested')"/>

                            <scheme-details v-else :scheme="schemeContainer.scheme"></scheme-details>
                        </div>
                        <div v-if="currentTab === 'Item' && !inPlaceTextEditor.shown">
                            <div v-if="mode === 'edit'">
                                <panel name="Items">
                                    <ItemSelector
                                        :editorId="editorId"
                                        :scheme-container="schemeContainer"
                                        :min-height="200"
                                        :key="`${schemeRevision}-${schemeContainer.revision}`"
                                        @item-right-clicked="onItemRightClick"/>
                                </panel>

                                <ItemProperties v-if="schemeContainer.selectedItems.length > 0"
                                    :key="`${schemeRevision}-${schemeContainer.selectedItems[0].id}-${schemeContainer.selectedItems[0].shape}`"
                                    :editorId="editorId"
                                    :item="schemeContainer.selectedItems[0]"
                                    :revision="schemeRevision"
                                    :schemeContainer="schemeContainer"
                                    :userStylesEnabled="userStylesEnabled"
                                    @shape-prop-changed="onItemShapePropChanged"
                                    @item-field-changed="onItemFieldChanged"
                                    @item-style-applied="onItemStyleApplied"
                                    @shape-changed="onItemShapeChanged"
                                    @clicked-advanced-behavior-editor="advancedBehaviorProperties.shown = true"
                                />
                            </div>

                            <item-details v-if="sidePanelItemForViewMode && mode === 'view'" :item="sidePanelItemForViewMode"/>
                        </div>
                        <div v-if="mode !== 'view' && currentTab === 'template' && !inPlaceTextEditor.shown && schemeContainer.selectedItems.length === 1 && schemeContainer.selectedItems[0].args && schemeContainer.selectedItems[0].args.templateRef">
                            <TemplateProperties
                                :key="`${schemeRevision}-${schemeContainer.selectedItems[0].id}-${schemeContainer.selectedItems[0].shape}`"
                                :editorId="editorId"
                                :item="schemeContainer.selectedItems[0]"
                                :schemeContainer="schemeContainer"
                                :templateRef="schemeContainer.selectedItems[0].args.templateRef"
                                @updated="onTemplateItemRegenerated"
                            />
                        </div>

                        <div v-if="inPlaceTextEditor.shown && mode === 'edit'">
                            <TextSlotProperties
                                :editorId="editorId"
                                :item="inPlaceTextEditor.item"
                                :slot-name="inPlaceTextEditor.slotName"
                                @moved-to-slot="onTextSlotMoved(inPlaceTextEditor.item, inPlaceTextEditor.slotName, arguments[0]);"
                                @property-changed="onInPlaceEditTextPropertyChanged(inPlaceTextEditor.item, inPlaceTextEditor.slotName, arguments[0], arguments[1])"
                                />
                        </div>
                        <div>
                            <TextSlotProperties v-for="itemTextSlot in itemTextSlotsAvailable" v-if="mode === 'edit' && currentTab === itemTextSlot.tabName"
                                :key="`text-slot-${itemTextSlot.item.id}-${itemTextSlot.slotName}`"
                                :editorId="editorId"
                                :item="itemTextSlot.item"
                                :slot-name="itemTextSlot.slotName"
                                @moved-to-slot="onTextSlotMoved(itemTextSlot.item, itemTextSlot.slotName, arguments[0]);"
                                @property-changed="onTextPropertyChanged(itemTextSlot.slotName, arguments[0], arguments[1])"
                                />
                            <component
                                v-for="tab in extraTabs"
                                v-if="currentTab === `extra:${tab.name}`"
                                :key="`tab-${currentTab}`"
                                :is="tab.component"
                                :mode="mode"
                                @tab-event="$emit('custom-tab-event', $event)"
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <link-edit-popup v-if="addLinkPopup.shown"
            :edit="false" title="" url="" type=""
            @submit-link="onItemLinkSubmit"
            @close="addLinkPopup.shown = false"/>

        <item-tooltip v-if="itemTooltip.shown" :key="`item-tooltip-${itemTooltip.id}`" :item="itemTooltip.item" :x="itemTooltip.x" :y="itemTooltip.y" @close="itemTooltip.shown = false"/>

        <connector-destination-proposal v-if="connectorProposedDestination && connectorProposedDestination.shown"
            :x="connectorProposedDestination.mx"
            :y="connectorProposedDestination.my"
            :connector-item-id="connectorProposedDestination.connectorItemId"
            :scheme-container="schemeContainer"
            @item-selected="onConnectorDestinationItemSelected"
            @close="closeConnectorProposedDestination()"
        />

        <AdvancedBehaviorProperties v-if="advancedBehaviorProperties.shown" @close="advancedBehaviorProperties.shown = false"
            :editorId="editorId"
            :scheme-container="schemeContainer"
        />

        <shape-exporter-modal v-if="exportShapeModal.shown" :scheme="exportShapeModal.scheme" @close="exportShapeModal.shown = false"/>

        <modal title="hello" v-if="mobileDebuggerShown" @close="mobileDebuggerShown = false">
            <ul class="mobile-debugger-log">
                <li v-for="entry in mobileLogEntries" :class="[`log-level-${entry.level}`]">{{entry.text}}</li>
            </ul>
        </modal>

        <modal v-if="isLoading" :width="380" :show-header="false" :show-footer="false" :use-mask="false">
            <div class="scheme-loading-icon">
                <div v-if="loadingStep === 'load'">
                    <i class="fas fa-spinner fa-spin fa-1x"></i>
                    <span>Loading diagram...</span>
                </div>
                <div v-if="loadingStep === 'load-shapes'">
                    <i class="fas fa-spinner fa-spin fa-1x"></i>
                    <span>Loading shapes...</span>
                </div>
                <div v-if="loadingStep === 'img-preload'">
                    <i class="fas fa-spinner fa-spin fa-1x"></i>
                    <span>Preloading all images...  </span>
                    <span class="btn btn-secondary" @click="isLoading = false">Skip</span>
                </div>
            </div>
        </modal>

        <export-template-modal v-if="exportTemplateModal.shown"
            :item="exportTemplateModal.item"
            @close="exportTemplateModal.shown = false"/>

    </div>

</template>

<script>
import shortid from 'shortid';
import utils from '../utils.js';
import {dragAndDropBuilder} from '../dragndrop.js';
import myMath from '../myMath';
import { Keys, registerKeyPressHandler, deregisterKeyPressHandler } from '../events';

import {applyStyleFromAnotherItem, defaultItem, defaultTextSlotProps } from '../scheme/Item';
import {enrichItemWithDefaults, cleanupShapeProps} from '../scheme/ItemFixer';
import { generateTextStyle } from './editor/text/ItemText';
import Dropdown from './Dropdown.vue';
import SvgEditor from './editor/SvgEditor.vue';
import MultiItemEditBox from './editor/MultiItemEditBox.vue';
import PathEditBox from './editor/PathEditBox.vue';
import InPlaceTextEditBox from './editor/InPlaceTextEditBox.vue';
import EditorEventBus from './editor/EditorEventBus.js';
import SchemeContainer, { localPointOnItem, worldPointOnItem, worldScalingVectorOnItem, getBoundingBoxOfItems } from '../scheme/SchemeContainer.js';
import { rebaseScheme } from '../scheme/SchemeRebase.js';
import ItemProperties from './editor/properties/ItemProperties.vue';
import TemplateProperties from './editor/properties/TemplateProperties.vue';
import AdvancedBehaviorProperties from './editor/properties/AdvancedBehaviorProperties.vue';
import TextSlotProperties from './editor/properties/TextSlotProperties.vue';
import ItemDetails from './editor/ItemDetails.vue';
import SchemeProperties from './editor/SchemeProperties.vue';
import SchemeDetails from './editor/SchemeDetails.vue';
import CreateItemMenu   from './editor/CreateItemMenu.vue';
import ElementPicker from './editor/ElementPicker.vue';
import DiagramPicker from './editor/DiagramPicker.vue';
import LinkEditPopup from './editor/LinkEditPopup.vue';
import ItemTooltip from './editor/ItemTooltip.vue';
import ConnectorDestinationProposal from './editor/ConnectorDestinationProposal.vue';
import { snapshotSvg } from '../svgPreview.js';
import Shape from './editor/items/shapes/Shape.js';
import {createAnimationRegistry} from '../animations/AnimationRegistry';
import Panel from './editor/Panel.vue';
import ItemSelector from './editor/ItemSelector.vue';
import {createSettingStorageFromLocalStorage} from '../LimitedSettingsStorage';
import ShapeExporterModal from './editor/ShapeExporterModal.vue';
import Modal from './Modal.vue';
import FrameAnimatorPanel from './editor/animator/FrameAnimatorPanel.vue';
import recentPropsChanges from '../history/recentPropsChanges';
import {forEach, map} from '../collections';
import {copyToClipboard, getTextFromClipboard} from '../clipboard';
import QuickHelperPanel from './editor/QuickHelperPanel.vue';
import FloatingHelperPanel from './editor/FloatingHelperPanel.vue';
import StoreUtils from '../store/StoreUtils.js';
import StrokePattern from './editor/items/StrokePattern';
import StateCreateItem from './editor/states/StateCreateItem.js';
import StateInteract from './editor/states/StateInteract.js';
import StateDragItem from './editor/states/StateDragItem.js';
import StateDraw from './editor/states/StateDraw.js';
import StateEditPath from './editor/states/StateEditPath.js';
import { mergeAllItemPaths } from './editor/states/StateEditPath.js';
import StateConnecting from './editor/states/StateConnecting.js';
import StatePickElement from './editor/states/StatePickElement.js';
import StateCropImage from './editor/states/StateCropImage.js';
import UserEventBus from '../userevents/UserEventBus.js';
import ExportTemplateModal from './editor/ExportTemplateModal.vue';
import {applyItemStyle} from './editor/properties/ItemStyles';
import { collectAndLoadAllMissingShapes } from './editor/items/shapes/ExtraShapes.js';
import { convertCurvePointToItemScale, convertCurvePointToRelative } from './editor/items/shapes/StandardCurves';
import {MobileDebugger} from '../logger';
import {traverseItems} from '../scheme/Item';

const IS_NOT_SOFT = false;
const ITEM_MODIFICATION_CONTEXT_DEFAULT = {
    id: '',
    moved: true,
    rotated: false,
    resized: false
};

function prettifyAxisValue(value, zoom) {
    value = parseFloat(value);
    if (zoom <= 100) {
        return value.toFixed(0);
    } else if (zoom < 500) {
        return value.toFixed(1);
    }
    return value.toFixed(2);
}

function createCurvePointConverter(item) {
    return (point)  => {
        const convertedPoint = utils.clone(point);
        const p = worldPointOnItem(point.x, point.y, item);

        convertedPoint.x = p.x;
        convertedPoint.y = p.y;

        if (point.t === 'B') {
            const p1 = worldPointOnItem(point.x + point.x1, point.y + point.y1, item);
            convertedPoint.x1 = p1.x - p.x;
            convertedPoint.y1 = p1.y - p.y;
        }
        if (point.t === 'B') {
            const p2 = worldPointOnItem(point.x + point.x2, point.y + point.y2, item);
            convertedPoint.x2 = p2.x - p.x;
            convertedPoint.y2 = p2.y - p.y;
        }
        return convertedPoint;
    }
}

function enrichCurvePoint(point) {
    if (point.t === 'B') {
        let length = Math.sqrt(point.x1*point.x1 + point.y1*point.y1);
        let vx1 = 1, vy1 = 0;
        if (length > 0.000001) {
            vx1 = point.x1 / length;
            vy1 = point.y1 / length;
        }
        length = Math.sqrt(point.x2*point.x2 + point.y2*point.y2);
        let vx2 = 1, vy2 = 0;
        if (length > 0.000001) {
            vx2 = point.x2 / length;
            vy2 = point.y2 / length;
        }
        point.vx1 = vx1;
        point.vy1 = vy1;
        point.vx2 = vx2;
        point.vy2 = vy2;
    }
}


function validatePointIds(pathId, pointId, curveEditing) {
    return pathId >= 0 && pathId < curveEditing.paths.length
        && pointId >= 0 && pointId < curveEditing.paths[pathId].points.length;
}

function imgPreload(imageUrl) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = resolve;
        img.onerror = reject;
        img.src = imageUrl;
    });
}

function findAllImages(items) {
    const images = [];
    forEach(items, item => {
        const shape = Shape.find(item.shape);
        if (shape) {
            if (shape.argType('fill') === 'advanced-color') {
                if (item.shapeProps.fill.type === 'image' && item.shapeProps.fill.image) {
                    images.push(item.shapeProps.fill.image);
                }
            }
        }
    });
    return images;
}

function timeoutPromise(timeInMillis) {
    return new Promise((resolve) => {
        setTimeout(resolve, timeInMillis);
    });
}

const schemeSettingsStorage = createSettingStorageFromLocalStorage('scheme-settings', 40);


const drawColorPallete = [
    "rgba(0, 0, 0, 1)",
    "rgba(76, 76, 76, 1)",
    "rgba(128, 128, 128, 1)",
    "rgba(170, 170, 170, 1)",
    "rgba(255, 255, 255, 1)",
    "rgba(254, 0, 0, 1)",
    "rgba(254, 154, 0, 1)",
    "rgba(255, 220, 0, 1)",
    "rgba(82, 237, 0, 1)",
    "rgba(0, 255, 215, 1)",
    "rgba(0, 236, 254, 1)",
    "rgba(0, 9, 254, 1)",
    "rgba(200, 0, 254, 1)",
    "rgba(254, 93, 93, 1)",
    "rgba(252, 176, 58, 1)",
    "rgba(249, 225, 78, 1)",
    "rgba(141, 241, 88, 1)",
    "rgba(93, 246, 222, 1)",
    "rgba(118, 241, 251, 1)",
    "rgba(137, 141, 242, 1)",
    "rgba(228, 156, 247, 1)",
];


export default {
    components: {
        SvgEditor, ItemProperties, ItemDetails, SchemeProperties,
        SchemeDetails, CreateItemMenu, QuickHelperPanel, FloatingHelperPanel,
        LinkEditPopup, InPlaceTextEditBox, TemplateProperties,
        ItemTooltip, Panel, ItemSelector, TextSlotProperties, Dropdown,
        ConnectorDestinationProposal, AdvancedBehaviorProperties,
        Modal, ShapeExporterModal, FrameAnimatorPanel, PathEditBox,
        MultiItemEditBox, ElementPicker, DiagramPicker, ExportTemplateModal
    },

    props: {
        editorId         : {type: String, required: true},
        mode             : {type: String, default: 'view'},
        scheme           : {type: Object, required: true},
        patchIndex       : {type: Object, default: null},
        editAllowed      : {type: Boolean, default: false},
        isSaving         : { type: Boolean, required: true},

        // means that it should handle all keyboard and mouse events as it is focused and not hidden
        active           : {type: Boolean, default: true},
        modified         : {type: Boolean, default: false},
        userStylesEnabled: {type: Boolean, default: false},
        projectArtEnabled: {type: Boolean, default: true},
        schemeTagsEnabled: { type: Boolean, default: true},
        menuOptions      : {type: Array, default: []},
        historyUndoable  : { type: Boolean, required: true},
        historyRedoable  : { type: Boolean, required: true},

        // allows to switch between edit and view modes from quick helper panel
        modeControlEnabled  : { type: Boolean, default: true},
        saveControlEnabled  : { type: Boolean, default: true},

        //Used to signify that SchemeContainer needs to be recreated and item selection needs to be restored
        schemeReloadKey: {type: String, default: null},
        extraTabs      : {type: Array, default: () => []},
    },

    created() {
        this.animationRegistry = createAnimationRegistry(this.editorId);
        const onCancel = () => {
            this.cancelCurrentState();
            this.historyState.undoable = this.historyUndoable;
            this.historyState.redoable = this.historyRedoable;
        }
        const onItemChanged = (itemId, propertyPath) => EditorEventBus.item.changed.specific.$emit(this.editorId, itemId, propertyPath);
        const onSchemeChangeCommitted = (affinityId) => EditorEventBus.schemeChangeCommitted.$emit(this.editorId, affinityId);
        const onScreenTransformUpdated = (screenTransform) => this.onScreenTransformUpdated(screenTransform);
        const onItemsHighlighted = (highlightedItems) => this.highlightedItems = highlightedItems;
        const onSubStateMigrated = () => {};

        this.states = {
            interact: new StateInteract(this.editorId, this.$store, this.userEventBus, {
                onCancel,
                onItemClicked: (item) => this.onInteractItemClicked(item),
                onVoidClicked: () => this.onInteractVoidClicked(),
                onItemTooltipRequested: (item, mx, my) => this.onItemTooltipTriggered(item, mx, my),
                onItemSidePanelRequested: (item) => this.onItemSidePanelTriggered(item),
                onItemLinksShowRequested: (item) => EditorEventBus.item.linksShowRequested.any.$emit(this.editorId, item),
                onItemChanged,
                onItemsHighlighted,
                onSubStateMigrated,
                onScreenTransformUpdated
            }),
            createItem: new StateCreateItem(this.editorId, this.$store, {
                onCancel,
                onSchemeChangeCommitted,
                onItemChanged,
                onItemsHighlighted,
                onSubStateMigrated,
                onScreenTransformUpdated
            }),
            editPath: new StateEditPath(this.editorId, this.$store, {
                onCancel,
                onSchemeChangeCommitted,
                onHistoryStateChange: (undoable, redoable) => {
                    this.historyState.undoable = undoable;
                    this.historyState.redoable = redoable;
                },
                onCursorUpdated: (x, y) => {
                    this.cursorX = x;
                    this.cursorY = y;
                },
                onPathPointsUpdated: () => { this.pathPointsUpdateKey++; },
                onContextMenuRequested: (mx, my, menuOptions) => this.onContextMenuRequested(mx, my, menuOptions),
                onItemChanged,
                onItemsHighlighted,
                onSubStateMigrated,
                onScreenTransformUpdated,
                updateAllCurveEditPoints: (item) => this.setCurveEditItem(item),
                updateCurveEditPoint: (item, pathId, pointId, point) => this.updateCurveEditPoint(item, pathId, pointId, point),
                resetCurveEditPointSelection: () => this.resetCurveEditPointSelection(),
                selectCurveEditPoint: (pathId, pointId, inclusive) => this.selectCurveEditPoint(pathId, pointId, inclusive),
                getCurveEditPaths: () => this.curveEditing.paths,
            }),
            connecting: new StateConnecting(this.editorId, this.$store, {
                onCancel,
                onSchemeChangeCommitted,
                onItemChanged,
                onItemsHighlighted,
                onSubStateMigrated,
                onScreenTransformUpdated
            }),
            dragItem: new StateDragItem(this.editorId, this.$store, {
                onCancel: () => {
                    onCancel();
                    this.isScreenGrabbing = false;
                },
                onSchemeChangeCommitted,
                onStartConnecting: (item, point) => this.startConnecting(item, point),
                onVoidRightClicked: (mx, my) => this.onVoidRightClicked(mx, my),
                onVoidDoubleClicked: (x, y, mx, my) => EditorEventBus.void.doubleClicked.$emit(this.editorId, x, y, mx, my),
                onEditPathRequested: (item) => this.onEditPathRequested(item),
                onItemDeselected: (item) => EditorEventBus.item.deselected.specific.$emit(this.editorId, item.id),
                onItemTextSlotEditTriggered: (item, slotName, area, markupDisabled, creatingNewItem) => {
                    EditorEventBus.textSlot.triggered.specific.$emit(this.editorId, item, slotName, area, markupDisabled, creatingNewItem);
                },
                onItemRightClick: (item, mx, my) => this.onItemRightClick(item, mx, my),
                onItemChanged,
                onItemsHighlighted,
                onSubStateMigrated: () => {this.updateFloatingHelperPanel()},
                onScreenTransformUpdated
            }),
            pickElement: new StatePickElement(this.editorId, this.$store, {
                onCancel,
                onItemChanged,
                onItemsHighlighted,
                onSubStateMigrated,
                onScreenTransformUpdated
            }),
            cropImage: new StateCropImage(this.editorId, this.$store, {
                onCancel,
                onSchemeChangeCommitted,
                onItemChanged,
                onItemsHighlighted,
                onSubStateMigrated,
                onScreenTransformUpdated
            }),
            draw: new StateDraw(this.editorId, this.$store, {
                onCancel,
                onSchemeChangeCommitted,
                onItemChanged,
                onItemsHighlighted,
                onSubStateMigrated,
                onScreenTransformUpdated
            }),
        };
    },

    beforeMount() {
        EditorEventBus.schemeChangeCommitted.$on(this.editorId, this.commitHistory);
        EditorEventBus.item.clicked.any.$on(this.editorId, this.onAnyItemClicked);
        EditorEventBus.item.changed.any.$on(this.editorId, this.onAnyItemChanged);
        EditorEventBus.item.selected.any.$on(this.editorId, this.onItemSelectionUpdated);
        EditorEventBus.item.deselected.any.$on(this.editorId, this.onItemSelectionUpdated);
        EditorEventBus.void.clicked.$on(this.editorId, this.onVoidClicked);
        EditorEventBus.textSlot.triggered.any.$on(this.editorId, this.onItemTextSlotEditTriggered);
        EditorEventBus.elementPick.requested.$on(this.editorId, this.switchStatePickElement);
        EditorEventBus.elementPick.canceled.$on(this.editorId, this.onElementPickCanceled);
        EditorEventBus.screenTransformUpdated.$on(this.editorId, this.onScreenTransformUpdated);
        EditorEventBus.editorResized.$on(this.editorId, this.onWindowResize);
        EditorEventBus.schemeRebased.$on(this.editorId, this.rebaseScheme);
        registerKeyPressHandler(this.keyPressHandler);
    },

    beforeDestroy() {
        EditorEventBus.schemeChangeCommitted.$off(this.editorId, this.commitHistory);
        EditorEventBus.item.clicked.any.$off(this.editorId, this.onAnyItemClicked);
        EditorEventBus.item.changed.any.$off(this.editorId, this.onAnyItemChanged);
        EditorEventBus.item.selected.any.$off(this.editorId, this.onItemSelectionUpdated);
        EditorEventBus.item.deselected.any.$off(this.editorId, this.onItemSelectionUpdated);
        EditorEventBus.void.clicked.$off(this.editorId, this.onVoidClicked);
        EditorEventBus.textSlot.triggered.any.$off(this.editorId, this.onItemTextSlotEditTriggered);
        EditorEventBus.elementPick.requested.$off(this.editorId, this.switchStatePickElement);
        EditorEventBus.elementPick.canceled.$off(this.editorId, this.onElementPickCanceled);
        EditorEventBus.screenTransformUpdated.$off(this.editorId, this.onScreenTransformUpdated);
        EditorEventBus.editorResized.$off(this.editorId, this.onWindowResize);
        EditorEventBus.schemeRebased.$off(this.editorId, this.rebaseScheme);
        deregisterKeyPressHandler(this.keyPressHandler);

        this.animationRegistry.destroy();
        window.addEventListener('resize', this.onWindowResize);
        this.stopStateLoop();
    },

    mounted() {
        this.init();
        this.onWindowResize();
        window.addEventListener('resize', this.onWindowResize);
        this.startStateLoop();
    },

    data() {
        return {
            // this is used to trigger full reload of SvgEditor component
            // it is needed only when scheme is imported from file and if history is undone/redone
            editorRevision: 0,

            cursorX: 0,
            cursorY: 0,

            state: 'interact',
            userEventBus: new UserEventBus(this.editorId),

            // used for triggering update of some ui components on undo/redo due to scheme reload
            schemeRevision: new Date().getTime(),

            isLoading: false,
            loadingStep: 'load', // can be "load", "img-preload"
            schemeLoadErrorMessage: null,

            initialScreenTransform: null,

            highlightedItems: {
                itemIds: [],
                showPins: false
            },

            zoomedItems: null,
            zoomToItemsTrigger: "",

            cropImage: {
                editBox: null,
                item: null
            },

            historyState: {
                undoable: this.historyUndoable,
                redoable: this.historyRedoable,
            },

            // used for triggering update of path points in PathEditBox component
            pathPointsUpdateKey: 0,

            inPlaceTextEditor: {
                item: null,
                slotName: '',
                markupDisabled: false,
                shown: false,
                area: {x: 0, y: 0, w: 100, h: 100},
                text: '',
                creatingNewItem: false,
                scalingVector: {x: 1, y: 1},
                style: {},
            },

            // used to propate the update to vue component
            // signifying that use has clicked something in svg plot
            // This is used so that user can stop editting text slot of an item
            mouseDownId: 0,

            // a reference to an item that was clicked in view mode
            // this is used when the side panel for item is being requested
            sidePanelItemForViewMode: null,
            sidePanelRightWidth: 400,
            sidePanelRightWidthLastUsed: 400,
            sidePanelLeftWidth: 220,
            sidePanelLeftWidthLastUsed: 220,
            schemeContainer: null,
            interactiveSchemeContainer: null,

            zoom: 100,
            textSelectionEnabled: false,

            addLinkPopup: {
                item: null,
                shown: false
            },

            currentTab: 'Doc',
            tabs: [ 'Doc', 'Item'],

            offsetSaveTimerId: null,

            itemTooltip: {
                id: null,
                item: null,
                shown: false,
                x: 0,
                y: 0
            },

            // When an item is selected - we want to display additional tabs for it
            itemTextSlotsAvailable: [],

            exportShapeModal: {
                shown: false,
                scheme: null
            },

            advancedBehaviorProperties: {
                shown: false
            },

            drawColorPallete,

            selectedItem: null,

            floatingHelperPanel: {
                shown: false,
                item: null,
                x: 0,
                y: 0
            },

            bottomPanelHeight: 300,

            // flag that is set when record button is pressed in frame animator panel
            isRecording: false,

            currentAnimatorFramePlayer: null,

            curveEditing: {
                // item whose curve is currently edited
                item: null,
                paths: [],
                selectedPoints: []
            },

            mobileDebuggerShown: false,

            mobileLogEntries: [],
            isScreenGrabbing: false,

            isStateLooping: false,

            exportTemplateModal: {
                item: null,
                shown: false,
            }
        }
    },
    methods: {
        toggleMobileDebugger() {
            this.mobileLogEntries = MobileDebugger.getLogEntries();
            this.mobileDebuggerShown = true;
        },
        init() {
            this.initSchemeContainer(this.scheme);
        },

        getInitialScreenTransform() {
            let screenTransform = { x: 0, y: 0, scale: 1.0 };

            if (this.scheme && this.scheme.id) {
                const schemeSettings = schemeSettingsStorage.get(this.scheme.id);
                if (schemeSettings && schemeSettings.screenPosition) {
                    const zoom = parseFloat(schemeSettings.screenPosition.zoom);
                    screenTransform = {
                        x: schemeSettings.screenPosition.offsetX,
                        y: schemeSettings.screenPosition.offsetY,
                        scale: parseFloat(zoom) / 100.0,
                    };
                }
            }

            return screenTransform;
        },

        initSchemeContainer(scheme) {
            this.schemeLoadErrorMessage = null;
            this.loadingStep = 'load-shapes';
            this.isLoading = true;
            collectAndLoadAllMissingShapes(scheme.items, this.$store)
            .catch(err => {
                console.error(err);
                StoreUtils.addErrorSystemMessage(this.$store, 'Failed to load shapes');
            })
            .then(() => {
                this.isLoading = false;
                this.schemeContainer = new SchemeContainer(scheme, this.editorId, {
                    onSchemeChangeCommitted: (affinityId) => EditorEventBus.schemeChangeCommitted.$emit(this.editorId, affinityId),
                });

                forEach(this.states, state => {
                    state.setSchemeContainer(this.schemeContainer);
                    state.reset();
                });

                const initialScreenTransform = this.getInitialScreenTransform();

                if (this.mode === 'view') {
                    this.switchToViewMode(initialScreenTransform);
                } else {
                    this.switchToEditMode(initialScreenTransform);
                }

                // Text tab is only rendered when in place text edit is triggered
                // therefore it does not make sense to set it as current on scheme load
                if (this.scheme && this.scheme.id) {
                    const schemeSettings = schemeSettingsStorage.get(this.scheme.id);
                    if (schemeSettings && schemeSettings.currentTab !== 'Text') {
                        this.currentTab = schemeSettings.currentTab;
                    }

                    if (this.mode == 'view') {
                        this.currentTab = 'Doc';
                    }
                }

                return this.schemeContainer;
            })
            .then(schemeContainer => {
                this.loadingStep = 'img-preload';
                const images = findAllImages(schemeContainer.getItems());
                return Promise.race([
                    Promise.all(map(images, imgPreload)),
                    timeoutPromise(10000)
                ]);
            })
            .then(() => {
                this.isLoading = false;
            })
            .catch(err => {
                console.error(err);
            });
        },

        onTextSelectionForViewChanged(textSelectionEnabled) {
            this.textSelectionEnabled = textSelectionEnabled;
        },

        cancelCurrentState() {
            if (this.mode === 'edit') {
                this.state = 'dragItem';
            } else {
                this.state = 'interact';
            }
            this.states[this.state].reset();
        },

        resetItemHighlight() {
            this.highlightedItems = { itemIds: [], showPins: false };
        },

        switchStateDragItem() {
            this.resetItemHighlight();
            this.states.dragItem.schemeContainer = this.schemeContainer;
            this.states[this.state].cancel();
            this.state = 'dragItem';
            this.states.dragItem.reset();
        },


        switchStateInteract() {
            this.resetItemHighlight();
            this.states.interact.schemeContainer = this.interactiveSchemeContainer;
            this.states[this.state].cancel();
            this.state = 'interact';
            this.states[this.state].reset();
            this.updateFloatingHelperPanel();
        },

        switchStatePickElement(elementPickCallback) {
            this.resetItemHighlight();
            this.states.pickElement.reset();
            this.states.pickElement.schemeContainer = this.schemeContainer;
            this.states.pickElement.setElementPickCallback(elementPickCallback);
            this.state = 'pickElement';
            this.updateFloatingHelperPanel();
        },


        switchStateCreateItem(item, template, templateRef, templateArgs) {
            this.resetItemHighlight();
            this.states[this.state].cancel();
            if (item.shape === 'path') {
                item.shapeProps.points = [];
                this.setCurveEditItem(item);
                this.state = 'editPath';
                this.onEditPathRequested(item);
            } else if (item.shape === 'connector') {
                item.shapeProps.points = [];
                this.state = 'connecting';
                this.states['connecting'].setItem(item);
            } else {
                this.state = 'createItem';
            }
            this.states[this.state].schemeContainer = this.schemeContainer;
            this.states[this.state].reset();
            this.states[this.state].setItem(item, template, templateRef, templateArgs);
            this.updateFloatingHelperPanel();
        },

        startPathEditing(item) {
            this.resetItemHighlight();
            this.states[this.state].cancel();

            item.shapeProps.points = [];
            this.setCurveEditItem(item);
            // making sure every new curve starts non-closed
            if (item.shape === 'path') {
                item.shapeProps.closed = false;
            }
            this.state = 'editPath';
            this.onEditPathRequested(item);

            this.states[this.state].schemeContainer = this.schemeContainer;
            this.states[this.state].reset();
            this.states[this.state].setItem(item);
            this.updateFloatingHelperPanel();
        },

        switchStateDrawing() {
            this.resetItemHighlight();

            this.states[this.state].cancel();
            this.state = 'draw';
            this.states.draw.schemeContainer = this.schemeContainer;
            this.states.draw.reset();
            this.updateFloatingHelperPanel();
        },

        stopDrawing() {
            if (this.state === 'draw') {
                this.states.draw.cancel();
            }
            this.updateFloatingHelperPanel();
        },

        stopConnecting() {
            if (this.state === 'connecting') {
                this.states.connecting.cancel();
            }
            this.updateFloatingHelperPanel();
        },

        startConnecting(sourceItem, worldPoint) {
            this.resetItemHighlight();
            this.states[this.state].cancel();
            let localPoint = null;
            if (worldPoint) {
                localPoint = this.schemeContainer.localPointOnItem(worldPoint.x, worldPoint.y, sourceItem);
            }
            this.states.connecting.schemeContainer = this.schemeContainer;
            this.states.connecting.reset();
            const connector = this.states.connecting.initConnectingFromSourceItem(sourceItem, localPoint);
            connector.shapeProps.smoothing = this.$store.state.defaultConnectorSmoothing;
            this.state = 'connecting';
            this.updateFloatingHelperPanel();
        },

        onDrawColorPicked(color) {
            if (this.state === 'draw') {
                this.states.draw.pickColor(color);
            }
        },

        onEditPathRequested(item) {
            this.resetItemHighlight();
            this.states[this.state].cancel();
            this.state = 'editPath';
            this.states.editPath.reset();
            this.states.editPath.setItem(item);
            this.setCurveEditItem(item);
            this.updateFloatingHelperPanel();
        },

        onPathEditStopped() {
            if (this.state === 'editPath') {
                this.states.editPath.cancel();
            }
        },

        startCroppingImage(item) {
            this.resetItemHighlight();
            this.states[this.state].cancel();
            this.state = 'cropImage';

            this.states[this.state].schemeContainer = this.schemeContainer;
            this.states.cropImage.reset();
            this.cropImage.editBox = this.schemeContainer.generateMultiItemEditBox([item]);
            this.cropImage.item = item;
            this.states.cropImage.setImageEditBox(this.cropImage.editBox);
            this.states.cropImage.setImageItem(item);
            this.updateFloatingHelperPanel();
        },

        onElementPickCanceled() {
            if (this.state === 'pickElement') {
                this.states.pickElement.cancel();
            }
        },

        onItemTextSlotEditTriggered(item, slotName, area, markupDisabled, creatingNewItem) {
            // it is expected that text slot is always available with all fields as it is supposed to be enriched based on the return of getTextSlots function
            if (!item.textSlots[slotName]) {
                item.textSlots[slotName] = utils.clone(defaultTextSlotProps);
            }
            const itemTextSlot = item.textSlots[slotName];
            const p0 = worldPointOnItem(area.x, area.y, item);
            const p1 = worldPointOnItem(area.x + area.w, area.y, item);
            const p2 = worldPointOnItem(area.x + area.w, area.y + area.h, item);
            const p3 = worldPointOnItem(area.x, area.y + area.h, item);
            const center = myMath.averagePoint(p0, p1, p2, p3);

            const worldWidth = myMath.distanceBetweenPoints(p0.x, p0.y, p1.x, p1.y);
            const worldHeight = myMath.distanceBetweenPoints(p0.x, p0.y, p3.x, p3.y);

            const scalingVector = worldScalingVectorOnItem(item);
            const x = center.x - worldWidth / 2;
            const y = center.y - worldHeight / 2;

            this.inPlaceTextEditor.slotName = slotName;
            this.inPlaceTextEditor.item = item;
            this.inPlaceTextEditor.text = itemTextSlot.text;
            this.inPlaceTextEditor.markupDisabled = markupDisabled;
            this.inPlaceTextEditor.style = generateTextStyle(itemTextSlot);
            this.inPlaceTextEditor.creatingNewItem = creatingNewItem;

            // the following correction was calculated empirically and to be honest was done poorly
            // I have no idea why it is needed, but for some reason in place text editor has
            // an offset proportional to the scaling effect of the item
            // Hopefully in future I can fix this differently
            const scaleCorrectionX = 1 / Math.max(0.0000001, scalingVector.x);
            const scaleCorrectionY = 1 / Math.max(0.0000001, scalingVector.y);

            this.inPlaceTextEditor.area.x = this._x(x) - scaleCorrectionX;
            this.inPlaceTextEditor.area.y = this._y(y) - scaleCorrectionY;
            this.inPlaceTextEditor.area.w = this._z(worldWidth);
            this.inPlaceTextEditor.area.h = this._z(worldHeight);
            this.inPlaceTextEditor.shown = true;
            this.inPlaceTextEditor.scalingVector = scalingVector;
            this.updateFloatingHelperPanel();
        },

        onInPlaceTextEditorUpdate(text) {
            if (this.inPlaceTextEditor.shown) {
                this.inPlaceTextEditor.item.textSlots[this.inPlaceTextEditor.slotName].text = text;
            }
        },

        onInPlaceTextEditorItemAreaChanged(item, width, height) {
            if (item.shape === 'none') {
                item.area.w = width;
                item.area.h = height;
                this.schemeContainer.updateMultiItemEditBox();
            }
        },

        onInPlaceTextEditorItemRenamed(item, name) {
            item.name = name;
        },

        onInPlaceTextEditorItemTextCleared(item) {
            if (!item.shape === 'none') {
                return;
            }
            if (item.childItems && item.childItems.length > 0) {
                return;
            }
            this.schemeContainer.deleteItem(item);
        },

        closeItemTextEditor() {
            if (this.inPlaceTextEditor.item) {
                EditorEventBus.textSlot.canceled.specific.$emit(this.editorId, this.inPlaceTextEditor.item, this.inPlaceTextEditor.slotName);
                EditorEventBus.schemeChangeCommitted.$emit(this.editorId, `item.${this.inPlaceTextEditor.item.id}.textSlots.${this.inPlaceTextEditor.slotName}.text`);
                EditorEventBus.item.changed.specific.$emit(this.editorId, this.inPlaceTextEditor.item.id, `textSlots.${this.inPlaceTextEditor.slotName}.text`);
                this.schemeContainer.reindexItems();
            }
            this.inPlaceTextEditor.shown = false;
            this.inPlaceTextEditor.markupDisabled = false;
        },

        updateInPlaceTextEditorStyle() {
            const textSlot = this.inPlaceTextEditor.item.textSlots[this.inPlaceTextEditor.slotName];
            this.inPlaceTextEditor.style = generateTextStyle(textSlot);
        },

        onAnyItemChanged(itemId) {
            if (this.inPlaceTextEditor.item && this.inPlaceTextEditor.item.id === itemId) {
                this.updateInPlaceTextEditorStyle();
            }
        },

        emitModeChangeRequested(mode) {
            this.$emit('mode-change-requested', mode);
        },

        saveScheme() {
            const area = getBoundingBoxOfItems(this.schemeContainer.getItems());
            snapshotSvg(`#svg-plot-${this.editorId} [data-type="scene-transform"]`, area).then(svgPreview => {
                this.$emit('scheme-save-requested', this.schemeContainer.scheme, svgPreview);
            })
            .catch(err => {
                this.$emit('scheme-save-requested', this.schemeContainer.scheme);
            });
        },

        // Zooms to selected items in edit mode
        // - if no items were selected it zooms into all items
        // - if in view mode - then it will always zoom into all items
        zoomToSelection() {
            if (this.mode === 'edit') {
                if (this.schemeContainer.selectedItems.length > 0) {
                    this.zoomToItems(this.schemeContainer.selectedItems);
                } else {
                    this.zoomToItems(this.schemeContainer.getItems());
                }
            } else if (this.mode === 'view') {
                this.zoomToItems(this.interactiveSchemeContainer.getItems());
            }
        },

        zoomToItems(items) {
            this.zoomedItems = items;
            this.zoomToItemsTrigger = shortid.generate();
        },

        onClickedAddItemLink(item) {
            this.addLinkPopup.item = item;
            this.addLinkPopup.shown = true;
        },

        onClickedStartConnecting(sourceItem, x, y) {
            const point = { x: 0, y: 0 };
            point.x = x;
            point.y = y;
            this.startConnecting(sourceItem, point);
        },

        onItemLinkSubmit(link) {
            this.addLinkPopup.item.links.push({
                id: shortid.generate(),
                title: link.title,
                url: link.url,
                type: link.type,
            });
            EditorEventBus.schemeChangeCommitted.$emit(this.editorId);
        },

        startCreatingExternalComponentForItem(item) {
            this.startCreatingChildSchemeForItem(item, true);
        },

        startCreatingChildSchemeForItem(item, isExternalComponent) {
            this.$emit('new-diagram-requested-for-item', item, isExternalComponent);
        },

        onUpdateOffset(x, y) {
            this.initOffsetSave();
        },

        onZoomChanged(newZoom) {
            this.states[this.state].changeZoomTo(newZoom/100);
            this.zoom = newZoom;
            this.initOffsetSave();
        },

        initOffsetSave() {
            if (this.offsetSaveTimerId) {
                clearTimeout(this.offsetSaveTimerId);
            }

            this.offsetSaveTimerId = setTimeout(()=> {
                this.offsetSaveTimerId = null;
                this.saveSchemeSettings();
            }, 200);
        },

        saveSchemeSettings() {
            let schemeContainer = this.schemeContainer;
            if (this.mode === 'view') {
                schemeContainer = this.interactiveSchemeContainer;
            }
            schemeSettingsStorage.save(schemeContainer.scheme.id, {
                currentTab: this.currentTab,
                screenPosition: {
                    offsetX: schemeContainer.screenTransform.x,
                    offsetY: schemeContainer.screenTransform.y,
                    zoom: this.zoom
                }
            });
        },

        onAnyItemClicked(item) {
            this.sidePanelItemForViewMode = null;
            this.hideSidePanelRight();
        },

        onVoidClicked() {
            if (this.mode === 'view') {
                this.hideSidePanelRight();
                this.sidePanelItemForViewMode = null;
            }
        },

        keyPressHandler(isDown, key, keyOptions) {
            if (!this.active) {
                return;
            }

            if (isDown) {
                this.onKeyPressed(key, keyOptions);
            } else {
                this.onKeyUp(key, keyOptions);
            }
        },

        onKeyPressed(key, keyOptions) {
            if (this.mode === 'edit') {
                if (this.state === 'dragItem') {
                    if (key === Keys.CTRL_C) {
                        this.copySelectedItems();
                    } else if (key === Keys.CTRL_X) {
                        this.copySelectedItems();
                        this.deleteSelectedItems();
                    } else if (key === Keys.CTRL_V) {
                        this.pasteItemsFromClipboard();
                    } else if (Keys.CTRL_S === key) {
                        this.saveScheme();
                    } else if (Keys.CTRL_Z === key) {
                        this.historyUndo();
                    } else if (Keys.CTRL_SHIFT_Z === key) {
                        this.historyRedo();
                    } else if (Keys.CTRL_A === key) {
                        this.schemeContainer.selectAllItems();
                    } else if (Keys.DELETE === key) {
                        this.deleteSelectedItems();
                    }
                } else if (this.state === 'editPath') {
                    if (Keys.DELETE === key) {
                        this.states.editPath.deleteSelectedPoints();
                    }
                }
            }
            if (key === Keys.ESCAPE) {
                this.states[this.state].cancel();
            } else {
                this.states[this.state].keyPressed(key, keyOptions);
            }
        },

        onKeyUp(key, keyOptions) {
            if (key !== Keys.ESCAPE && key != Keys.DELETE) {
                this.states[this.state].keyUp(key, keyOptions);
            }
        },


        copySelectedItems() {
            const copyBuffer = this.schemeContainer.copySelectedItems();
            copyToClipboard(copyBuffer);
        },

        copySelectedItemStyle() {
            const selectedItems = this.schemeContainer.getSelectedItems();
            if (selectedItems.length > 0) {
                StoreUtils.copyItemStyle(this.$store, selectedItems[0]);
            }
        },

        createComponentFromItem(refItem) {
            const worldPoint = worldPointOnItem(0, refItem.area.h * 1.2, refItem);

            const item = {
                area: {
                    x: worldPoint.x,
                    y: worldPoint.y,
                    w: refItem.area.w,
                    h: refItem.area.h,
                },
                name: `Component[${refItem.name}]`,
                shape: 'component',
                shapeProps: {
                    kind: 'embedded',
                    referenceItem: '#' + refItem.id,
                    autoZoom: false,
                    showButton: false
                }
            };
            enrichItemWithDefaults(item);

            this.schemeContainer.addItem(item);
        },

        applyCopiedItemStyle() {
            if (this.$store.state.copiedStyleItem) {
                forEach(this.schemeContainer.getSelectedItems(), item => {
                    applyStyleFromAnotherItem(this.$store.state.copiedStyleItem, item);
                    EditorEventBus.item.changed.specific.$emit(this.editorId, item.id);
                });
                EditorEventBus.schemeChangeCommitted.$emit(this.editorId);
            }
        },

        pasteItemsFromClipboard() {
            getTextFromClipboard().then(text => {
                if (text) {
                    const items = this.schemeContainer.decodeItemsFromText(text);
                    if (items) {
                        this.isLoading = true;
                        this.loadingStep = 'load-shapes';
                        collectAndLoadAllMissingShapes(items, this.$store)
                        .catch(err => {
                            console.error(err);
                            StoreUtils.addErrorSystemMessage(this.$store, 'Failed to load shapes');
                        })
                        .then(() => {
                            this.isLoading = false;
                            const centerX = (this.schemeContainer.screenSettings.width/2 - this.schemeContainer.screenTransform.x) / this.schemeContainer.screenTransform.scale;
                            const centerY = (this.schemeContainer.screenSettings.height/2 - this.schemeContainer.screenTransform.y) / this.schemeContainer.screenTransform.scale;
                            this.schemeContainer.pasteItems(items, centerX, centerY);
                            EditorEventBus.schemeChangeCommitted.$emit(this.editorId);
                        });
                    }
                }
            })
        },

        onInteractVoidClicked() {
            this.itemTooltip.shown = false;
            EditorEventBus.void.clicked.$emit(this.editorId);
        },
        onInteractItemClicked(item) {
            this.itemTooltip.shown = false;
            EditorEventBus.item.clicked.any.$emit(this.editorId, item);
        },
        onItemTooltipTriggered(item, mouseX, mouseY) {
            this.itemTooltip.item = item;
            this.itemTooltip.id = item.id;
            this.itemTooltip.x = mouseX;

            const rect = this.$refs.middleSection.getBoundingClientRect();
            this.itemTooltip.y = Math.max(rect.top, mouseY);
            this.itemTooltip.shown = true;
        },

        onItemSidePanelTriggered(item) {
            this.sidePanelItemForViewMode = item;
            this.showSidePanelRight();
            this.currentTab = 'Item';
        },

        commitHistory(affinityId) {
            this.$emit('history-committed', this.schemeContainer.scheme, affinityId);
        },

        historyEditAllowed() {
            return this.state === 'dragItem';
        },

        historyUndo() {
            if (this.state === 'editPath') {
                this.states.editPath.undo();
            } else if (this.historyEditAllowed()) {
                this.$emit('undo-history-requested');
            }
        },

        historyRedo() {
            if (this.state === 'editPath') {
                this.states.editPath.redo();
            } else if (this.historyEditAllowed()) {
                this.$emit('redo-history-requested');
            }
        },

        reloadSchemeContainer() {
            this.schemeContainer.scheme = this.scheme;
            this.schemeContainer.reindexItems();

            if (this.mode === 'view') {
                this.switchToViewMode();
            }
            this.editorRevision++;
            this.updateRevision();
            this.restoreItemSelection();
            this.restoreCurveEditing();
        },

        restoreCurveEditing() {
            if (this.state === 'editPath') {
                if (!this.curveEditing.item) {
                    return;
                }
                const existingItem = this.schemeContainer.findItemById(this.curveEditing.item.id);
                if (existingItem) {
                    this.setCurveEditItem(existingItem);
                    this.onEditPathRequested(existingItem);
                } else {
                    this.setCurveEditItem(null);
                    this.onPathEditStopped();
                }
            } else {
                this.setCurveEditItem(null);
            }
        },

        restoreItemSelection() {
            const selectedItemIds = map(this.schemeContainer.selectedItems, item => item.id);
            this.schemeContainer.deselectAllItems();

            forEach(selectedItemIds, itemId => {
                const item = this.schemeContainer.findItemById(itemId);
                if (item) {
                    this.schemeContainer.selectItem(item, true);
                }
            });
        },

        updateRevision() {
            this.schemeRevision = new Date().getTime();
        },

        bringSelectedItemsToFront() {
            this.schemeContainer.bringSelectedItemsToFront();
            this.schemeContainer.reindexItems();
            this.commitHistory();
            this.updateRevision();
        },

        bringSelectedItemsToBack() {
            this.schemeContainer.bringSelectedItemsToBack();
            this.schemeContainer.reindexItems();
            this.commitHistory();
            this.updateRevision();
        },

        toggleGrabScreen() {
            if (this.state === 'dragItem') {
                this.isScreenGrabbing = !this.isScreenGrabbing;
                this.states[this.state].toggleGrabScreen(this.isScreenGrabbing);
            }
        },

        onScreenTransformUpdated(screenTransform) {
            if (screenTransform) {
                this.zoom = Math.round(screenTransform.scale * 10000) / 100;
            }
            this.initOffsetSave();
            if (this.mode === 'edit') {
                this.updateFloatingHelperPanel();
            }
        },



        /**
         * Triggered when any item got selected or deselected
         */
        onItemSelectionUpdated() {
            if (this.schemeContainer.selectedItems.length > 0) {
                this.$emit('items-selected');
                this.currentTab = 'Item';
                const item = this.schemeContainer.selectedItems[0];
                const shape = Shape.find(item.shape);
                if (!shape) {
                    return;
                }
                const textSlots = shape.getTextSlots(item);

                if (this.schemeContainer.selectedItems.length === 1) {
                    this.selectedItem = this.schemeContainer.selectedItems[0];
                } else {
                    this.selectedItem = null;
                }

                if (textSlots && textSlots.length > 0 && !(shape.editorProps && shape.editorProps.textSlotTabsDisabled)) {
                    this.itemTextSlotsAvailable = map(textSlots, textSlot => {
                        return {
                            tabName: `Text: ${textSlot.name}`,
                            slotName: textSlot.name,
                            item
                        };
                    });
                } else {
                    this.itemTextSlotsAvailable.length = 0;
                }
            } else {
                this.$emit('items-deselected');
                this.selectedItem = null;
                this.itemTextSlotsAvailable.length = 0;
            }

            this.updateFloatingHelperPanel();
        },

        onTextSlotMoved(item, slotName, anotherSlotName) {
            if (anotherSlotName === slotName) {
                return;
            }
            item.textSlots[anotherSlotName] = utils.clone(item.textSlots[slotName]);
            item.textSlots[slotName].text = '';
            EditorEventBus.item.changed.specific.$emit(this.editorId, item.id, `textSlots.${anotherSlotName}`);
            if (!this.inPlaceTextEditor.item) {
                this.currentTab = `Text: ${anotherSlotName}`;
            }

            EditorEventBus.textSlot.moved.$emit(this.editorId, item, slotName, anotherSlotName);
        },

        // triggered from ItemProperties or QuickHelperPanel components
        onItemShapePropChanged(name, type, value) {
            let itemIds = '';

            let reindexingNeeded = false;

            forEach(this.schemeContainer.selectedItems, item => {
                const shape = Shape.find(item.shape);
                if (shape) {
                    const propDescriptor = Shape.getShapePropDescriptor(shape, name);
                    if (propDescriptor && propDescriptor.type === type) {
                        this.schemeContainer.setPropertyForItem(item, item => {
                            item.shapeProps[name] = utils.clone(value);
                            EditorEventBus.item.changed.specific.$emit(this.editorId, item.id, `shapeProps.${name}`);
                        });

                        item.meta.revision += 1;
                        itemIds += item.id;
                        recentPropsChanges.registerItemShapeProp(item.shape, name, value);
                    }

                    if (item.shape === 'component') {
                        if (item.shapeProps.kind !== 'embedded' && item._childItems) {
                            item._childItems = [];
                            EditorEventBus.item.changed.specific.$emit(this.editorId, item.id);
                        }

                        if (name === 'kind' || name === 'referenceItem' || name === 'placement') {
                            this.schemeContainer.reindexSpecifiedItems([item]);
                            reindexingNeeded = true;
                        }
                    }
                }

                if (item.shape === 'connector' && name === 'smoothing') {
                    reindexingNeeded = true;
                }
            });

            if (this.schemeContainer.selectedItems.length === 1) {
                const item = this.schemeContainer.selectedItems[0];
                if (item.shape === 'connector') {
                    // updating selected connector highlight path
                    StoreUtils.setSelectedConnectorPath(this.$store, Shape.find(item.shape).computeOutline(item));
                }
            }
            EditorEventBus.schemeChangeCommitted.$emit(this.editorId, `item.${itemIds}.shapeProps.${name}`);
            if (reindexingNeeded) {
                this.schemeContainer.reindexItems();
            }
        },

        onItemFieldChanged(name, value) {
            let itemIds = '';
            forEach(this.schemeContainer.selectedItems, item => {
                this.schemeContainer.setPropertyForItem(item, item => {
                    item[name] = utils.clone(value);
                    EditorEventBus.item.changed.specific.$emit(this.editorId, item.id, name);
                });
                itemIds += item.id;
            });

            if (name === 'tags') {
                this.schemeContainer.reindexTags();
            }
            EditorEventBus.schemeChangeCommitted.$emit(this.editorId, `item.${itemIds}.${name}`);
        },

        onItemShapeChanged(shapeName) {
            let itemIds = '';
            forEach(this.schemeContainer.selectedItems, item => {
                this.schemeContainer.setPropertyForItem(item, item => {
                    item.shape = shapeName;
                    cleanupShapeProps(item);
                    enrichItemWithDefaults(item);
                    EditorEventBus.item.changed.specific.$emit(this.editorId, item.id, 'shape');
                });
                itemIds += item.id;
            });
            EditorEventBus.schemeChangeCommitted.$emit(this.editorId, `item.${itemIds}.shape`);
        },

        onItemStyleApplied(style) {
            let itemIds = '';
            forEach(this.schemeContainer.selectedItems, item => {
                if (applyItemStyle(item, style)) {
                    EditorEventBus.item.changed.specific.$emit(this.editorId, item.id);
                    itemIds += item.id;
                }
            });
            EditorEventBus.schemeChangeCommitted.$emit(this.editorId, `item.${itemIds}.${name}`);
        },

        onInPlaceEditTextPropertyChanged(item, textSlotName, propertyName, value) {
            if (item.textSlots && item.textSlots.hasOwnProperty(textSlotName)) {
                item.textSlots[textSlotName][propertyName] = utils.clone(value);
                recentPropsChanges.registerItemTextProp(item.shape, textSlotName, propertyName, value);
            }
            EditorEventBus.item.changed.specific.$emit(this.editorId, item.id);
            EditorEventBus.schemeChangeCommitted.$emit(this.editorId, `item.${item.id}.textSlots.${textSlotName}.${propertyName}`);
        },

        // this is triggered from quick helper panel
        onItemGenericTextSlotPropChanged(propertyName, value) {
            let itemIds = '';
            forEach(this.schemeContainer.selectedItems, item => {
                if (item.textSlots) {
                    forEach(item.textSlots, (textSlot, textSlotName) => {
                        item.textSlots[textSlotName][propertyName] = utils.clone(value);
                        recentPropsChanges.registerItemTextProp(item.shape, textSlotName, propertyName, value);
                    });
                }
                EditorEventBus.item.changed.specific.$emit(this.editorId, item.id, `textSlots.*.${propertyName}`);
                itemIds += item.id;
            });
            EditorEventBus.schemeChangeCommitted.$emit(this.editorId, `item.${itemIds}.textSlots.*.${propertyName}`);

        },

        // this is triggerd from specific text slot in side panel
        onTextPropertyChanged(textSlotName, propertyName, value) {
            let itemIds = '';
            forEach(this.schemeContainer.selectedItems, item => {
                if (item.textSlots && item.textSlots.hasOwnProperty(textSlotName)) {
                    item.textSlots[textSlotName][propertyName] = utils.clone(value);
                    recentPropsChanges.registerItemTextProp(item.shape, textSlotName, propertyName, value);
                }
                EditorEventBus.item.changed.specific.$emit(this.editorId, item.id, `textSlots.${textSlotName}.${propertyName}`);
                itemIds += item.id;
            });
            EditorEventBus.schemeChangeCommitted.$emit(this.editorId, `item.${itemIds}.textSlots.${textSlotName}.${propertyName}`);
        },

        onTemplateRebuildRequested(item, template, args) {
            const templateRef = item.args.templateRef;
            const updatedItem = this.schemeContainer.regenerateTemplatedItem(item, template, templateRef, args);
            this.onTemplateItemRegenerated(item.id, updatedItem);
        },

        onTemplateItemRegenerated(originItemId, item) {
            this.schemeContainer.deselectAllItems();

            const originItem = this.schemeContainer.findItemById(originItemId);
            if (!originItem) {
                return;
            }

            traverseItems([item], enrichItemWithDefaults);

            // doing this in order to regenerate all item ids and fix their references
            const [clonnedItem] = this.schemeContainer.cloneItems([item]);

            originItem.id = clonnedItem.id;
            originItem.args = clonnedItem.args;
            originItem.shapeProps = clonnedItem.shapeProps;
            originItem.childItems = clonnedItem.childItems;
            originItem.links = clonnedItem.links;
            originItem.textSlots = clonnedItem.textSlots;
            originItem.tags = clonnedItem.tags;
            originItem.behavior = clonnedItem.behavior;
            originItem.effects = clonnedItem.effects;

            const idsMapping = new Map();
            idsMapping.set(originItemId, clonnedItem.id);
            this.schemeContainer.fixItemsReferences(this.scheme.items, idsMapping);
            this.schemeContainer.reindexItems();

            EditorEventBus.schemeChangeCommitted.$emit(this.editorId);

            this.schemeContainer.selectItem(originItem, false);

            this.currentTab = 'template';
        },

        convertCurvePointToSimple() {
            if (this.state === 'editPath') {
                this.states[this.state].convertSelectedPointsToSimple();
            }
        },

        convertCurvePointToBezier() {
            if (this.state === 'editPath') {
                this.states[this.state].convertSelectedPointsToBezier();
            }
        },

        closeConnectorProposedDestination() {
            StoreUtils.disableProposeConnectorDestinationItems(this.$store);
        },

        /**
         * Invoked when user selects an item from ConnectorDestinationProposal panel during creation of a connector
         */
        onConnectorDestinationItemSelected(item) {
            if (this.state === 'connecting') {
                this.states[this.state].submitConnectorDestinationItem(item);
            }
        },

        clearStatusMessage() {
            this.$store.dispatch('clearStatusMessage');
        },

        switchToViewMode(screenTransform) {
            this.animationRegistry.stopAllAnimations();
            this.interactiveSchemeContainer = new SchemeContainer(utils.clone(this.schemeContainer.scheme), this.editorId, {
                onSchemeChangeCommitted: (affinityId) => EditorEventBus.schemeChangeCommitted.$emit(this.editorId, affinityId),
            });
            if (screenTransform) {
                this.interactiveSchemeContainer.screenTransform = screenTransform;
            } else {
                this.interactiveSchemeContainer.screenTransform = utils.clone(this.schemeContainer.screenTransform);
            }

            const boundingBox = getBoundingBoxOfItems(this.schemeContainer.filterNonHUDItems(this.schemeContainer.getItems()));

            this.interactiveSchemeContainer.screenSettings.boundingBox = boundingBox;
            this.animationRegistry.enableAnimations();
            this.switchStateInteract();
        },

        switchToEditMode(screenTransform) {
            this.itemTooltip.shown = false;
            if (screenTransform) {
                this.schemeContainer.screenTransform = screenTransform;
            } else if (this.interactiveSchemeContainer) {
                this.schemeContainer.screenTransform = utils.clone(this.interactiveSchemeContainer.screenTransform);
            }
            this.interactiveSchemeContainer = null;
            this.animationRegistry.stopAllAnimations();
            this.switchStateDragItem();
            if (this.sidePanelRightWidth === 0) {
                this.sidePanelRightWidth = myMath.clamp(this.sidePanelRightWidthLastUsed, 0, Math.floor(window.innerWidth/2 - 20));
            }
        },

        onDrawColorPicked(color) {
            if (this.state === 'draw') {
                this.states.draw.pickColor(color);
            }
        },

        onSvgSizeUpdated({width, height}) {
            if (this.interactiveSchemeContainer) {
                this.interactiveSchemeContainer.screenSettings.width = width;
                this.interactiveSchemeContainer.screenSettings.height = height;
            }
        },

        onAnimatiorEditorOpened(framePlayer) {
            this.currentAnimatorFramePlayer = framePlayer;
        },

        closeAnimatorEditor() {
            this.currentAnimatorFramePlayer = null;
        },

        onItemRightClick(item, mouseX, mouseY) {
            const x = this.x_(mouseX);
            const y = this.y_(mouseY);

            const selectedOnlyOne = this.schemeContainer.multiItemEditBox && this.schemeContainer.multiItemEditBox.items.length === 1 || !this.schemeContainer.multiItemEditBox;

            let contextMenuOptions = [{
                name: 'Bring to Front',
                clicked: () => {this.bringSelectedItemsToFront();}
            }, {
                name: 'Bring to Back',
                clicked: () => {this.bringSelectedItemsToBack();}
            }, {
                name: 'Add link',
                iconClass: 'fas fa-link',
                clicked: () => {this.onClickedAddItemLink(item);}
            }];

            if (!this.offline && selectedOnlyOne) {
                if (item.shape === 'component' && item.shapeProps.kind === 'external') {
                    contextMenuOptions.push({
                        name: 'Create external diagram for this component...',
                        iconClass: 'far fa-file',
                        clicked: () => {this.startCreatingExternalComponentForItem(item); }
                    });
                } else {
                    contextMenuOptions.push({
                        name: 'Create diagram for this element...',
                        iconClass: 'far fa-file',
                        clicked: () => {this.startCreatingChildSchemeForItem(item); }
                    });
                }
            }

            contextMenuOptions = contextMenuOptions.concat([{
                name: 'Copy',
                iconsClass: 'fas fa-copy',
                clicked: () => {this.copySelectedItems(item);}
            }, {
                name: 'Copy item style',
                clicked: () => {this.copySelectedItemStyle(item);}
            }]);

            if (this.$store.state.copiedStyleItem) {
                contextMenuOptions.push({
                    name: 'Apply copied item style',
                    clicked: () => {this.applyCopiedItemStyle(item);}
                });
            }

            if (selectedOnlyOne) {
                const shape = Shape.find(item.shape);

                if (shape.editorProps && shape.editorProps.contextMenu) {
                    const point = localPointOnItem(x, y, item);
                    contextMenuOptions = contextMenuOptions.concat(this.convertEditorPropsContextMenuOptions(item, shape.editorProps.contextMenu(point.x, point.y, item)));
                }
                contextMenuOptions.push({
                    name: 'Create component from this item',
                    clicked: () => {this.createComponentFromItem(item);}
                });
                if (item.shape === 'image') {
                    contextMenuOptions.push({
                        name: 'Crop image',
                        iconClass: 'fas fa-crop',
                        clicked: () => this.startCroppingImage(item)
                    });
                }
            } else {
                let allCurves = true;
                for (let i = 0; i < this.schemeContainer.multiItemEditBox.items.length && allCurves; i++) {
                    allCurves = this.schemeContainer.multiItemEditBox.items[i].shape === 'path';
                }
                if (allCurves) {
                    contextMenuOptions.push({
                        name: 'Merge paths',
                        clicked: () => this.mergePaths(this.schemeContainer.multiItemEditBox.items)
                    })
                }
            }

            contextMenuOptions = contextMenuOptions.concat([{
                name: 'Delete',
                iconClass: 'fas fa-trash',
                clicked: () => {this.deleteSelectedItems();}
            }, {
                name: 'Surround items',
                clicked: () => { this.surroundSelectedItems(); }
            }, {
                name: 'Export',
                subOptions: [{
                    name: 'Export as SVG ...',
                    iconClass: 'fas fa-file-export',
                    clicked: () => { this.exportSelectedItemsAsSVG(); }
                }, {
                    name: 'Export as PNG ...',
                    iconClass: 'fas fa-file-export',
                    clicked: () => { this.exportSelectedItemsAsPNG(); }
                }].concat(selectedOnlyOne ? [{
                    name: 'Export as template ...',
                    iconClass: 'fa-solid fa-object-group',
                    clicked: () => { this.exportSelectedItemsAsTemplate(item); }
                }]: [])
            }]);



            let items = [item];
            if (this.schemeContainer.multiItemEditBox) {
                items = this.schemeContainer.multiItemEditBox.items;
            }
            const alignSubOptions = [{
                name: 'Horizontally in parent',
                clicked: () => this.schemeContainer.alignItemsHorizontallyInParent(items)
            }, {
                name: 'Vertically in parent',
                clicked: () => this.schemeContainer.alignItemsVerticallyInParent(items)
            }, {
                name: 'Centered in parent',
                clicked: () => this.schemeContainer.alignItemsCenteredInParent(items)
            }];

            if (items.length > 1) {
                alignSubOptions.push({
                    name: 'All items horizontally',
                    clicked: () => this.schemeContainer.alignItemsHorizontally(items)
                });
                alignSubOptions.push({
                    name: 'All items vertically',
                    clicked: () => this.schemeContainer.alignItemsVertically(items)
                });
            }

            contextMenuOptions.push({
                name: 'Align',
                subOptions: alignSubOptions
            });


            if (selectedOnlyOne) {
                contextMenuOptions.push({
                    name: 'Events',
                    subOptions: [{
                        name: 'Init',
                        clicked: () => { this.addItemBehaviorEvent(item, 'init'); }
                    }, {
                        name: 'Clicked',
                        clicked: () => { this.addItemBehaviorEvent(item, 'clicked'); }
                    }, {
                        name: 'Mouse In',
                        clicked: () => { this.addItemBehaviorEvent(item, 'mousein'); }
                    }, {
                        name: 'Mouse Out',
                        clicked: () => { this.addItemBehaviorEvent(item, 'mouseout'); }
                    }]
                });
            }

            if (item.shape === 'path') {
                contextMenuOptions.push({
                    name: 'Edit Path',
                    clicked: () => { this.onEditPathRequested(item); }
                });
            }

            this.$emit('context-menu-requested', mouseX, mouseY, contextMenuOptions);
        },

        convertEditorPropsContextMenuOptions(item, options) {
            options.forEach(option => {
                if (option.clicked) {
                    option.clicked = this.createEditorPropsMenuWrapperFunction(item, option.clicked);
                }

                if (option.subOptions) {
                    this.convertEditorPropsContextMenuOptions(item, option.subOptions);
                }
            })
            return options;
        },

        createEditorPropsMenuWrapperFunction(item, clickHandler) {
            return () => {
                if (clickHandler()) {
                    EditorEventBus.item.changed.specific.$emit(this.editorId, item.id);
                    EditorEventBus.schemeChangeCommitted.$emit(this.editorId);
                    this.schemeContainer.updateMultiItemEditBox();
                }
            };
        },

        onVoidRightClicked(mouseX, mouseY) {
            if (this.mode === 'edit') {
                this.onContextMenuRequested(mouseX, mouseY, [{
                    name: 'Paste',
                    clicked: () => {this.pasteItemsFromClipboard();}
                }]);
            }
        },

        onContextMenuRequested(mouseX, mouseY, menuOptions) {
            const svgRect = document.getElementById(`svg-plot-${this.editorId}`).getBoundingClientRect();
            this.$emit('context-menu-requested', mouseX + svgRect.left + 5, mouseY + svgRect.top + 5, menuOptions);
        },

        addItemBehaviorEvent(item, eventName) {
            const existingEvent = find(item.behavior.events, e => e.event === eventName);

            if (!existingEvent) {
                item.behavior.events.push({
                    id: shortid.generate(),
                    event: eventName,
                    actions: [ ]
                });
            }
            EditorEventBus.behaviorPanel.requested.$emit(this.editorId);
        },

        mergePaths(allItems) {
            const mainItem = allItems[0];
            allItems.shift();
            mergeAllItemPaths(mainItem, allItems);
            this.schemeContainer.readjustItem(mainItem.id, IS_NOT_SOFT, ITEM_MODIFICATION_CONTEXT_DEFAULT);
            this.schemeContainer.deleteItems(allItems);
            this.schemeContainer.selectItem(mainItem);
            EditorEventBus.schemeChangeCommitted.$emit(this.editorId);
        },

        /**
         * Used to generate a surrounding rect arround selected items.
         * It also remounts the selected item to the new rect
         */
        surroundSelectedItems() {
            const box = this.schemeContainer.multiItemEditBox;
            if (box !== null && box.items.length > 0) {
                const padding = this.$store.state.itemSurround.padding;
                const rect = utils.clone(defaultItem);
                rect.name = 'Group';
                rect.area = {
                    x: box.area.x - padding,
                    y: box.area.y - padding,
                    w: box.area.w + padding * 2,
                    h: box.area.h + padding * 2,
                    r: box.area.r,
                };
                rect.shape = 'rect';
                rect.shapeProps = {
                    strokePattern: StrokePattern.DASHED,
                    strokeSize: 2,
                    fill: {type: 'none'},
                };
                rect.textSlots = {
                    body: {
                        halign: 'left',
                        valign: 'top',
                        text: '<i>Group...</i>'
                    }
                };
                this.schemeContainer.addItem(rect);
                this.schemeContainer.remountItemBeforeOtherItem(rect.id, box.items[0].id);

                const remountedItemIds = {};

                forEach(box.items, item => {
                    let remountAllowed = true;
                    // making sure we don't have to remount item if it's ancestor was already remounted
                    if (item.meta && item.meta.ancestorIds) {
                        for (let i = 0; i < item.meta.ancestorIds.length && remountAllowed; i++) {
                            if (remountedItemIds[item.meta.ancestorIds[i]]) {
                                remountAllowed = false;
                            }
                        }
                    }
                    if (remountAllowed) {
                        if (rect.childItems && rect.childItems.length > 0) {
                            // trying to preserve original order of items
                            this.schemeContainer.remountItemAfterOtherItem(item.id, rect.childItems[rect.childItems.length - 1].id);
                        } else {
                            this.schemeContainer.remountItemInsideOtherItem(item.id, rect.id);
                        }

                        remountedItemIds[item.id] = 1;
                    }
                });
                this.schemeContainer.selectItem(rect);
                EditorEventBus.itemSurround.created.$emit(this.editorId, rect, box.area, padding);
            }
        },

        exportSelectedItemsAsTemplate(item) {
            this.exportTemplateModal.item = item;
            this.exportTemplateModal.shown = true;
        },

        exportSelectedItemsAsSVG() {
            this.exportSelectedItemsAsPicture('svg');
        },

        exportSelectedItemsAsPNG() {
            this.exportSelectedItemsAsPicture('png');
        },

        exportSelectedItemsAsPicture(kind) {
            const items = this.collectSelectedItems();
            if (items.length === 0) {
                return;
            }
            this.$emit('export-picture-requested', items, kind)
        },

        collectSelectedItems() {
            if (!this.schemeContainer.multiItemEditBox) {
                return [];
            }
            const box = this.schemeContainer.multiItemEditBox;
            if (box.items.length === 0) {
                return [];
            }
            // picking all root selected items
            // we don't want to double export selected items if their ancestors were already picked for export
            const items = [];
            const pickedItemIds = {};
            forEach(box.items, item => {
                let shouldExport = true;
                for (let i = 0; i < item.meta.ancestorIds.length && shouldExport; i++) {
                    if (pickedItemIds[item.meta.ancestorIds[i]]) {
                        shouldExport = false;
                    }
                }
                if (shouldExport) {
                    items.push(item);
                    pickedItemIds[item.id] = 1;
                }
            });
            return items;
        },


        deleteSelectedItems() {
            this.schemeContainer.deleteSelectedItems();
            EditorEventBus.schemeChangeCommitted.$emit(this.editorId);
        },

        itemCreationDraggedToSvgEditor(item, pageX, pageY, template, templateRef) {
            const coords = this.mouseCoordsFromPageCoords(pageX, pageY);
            const p = this.toLocalPoint(coords.x, coords.y);
            item.area.x = p.x;
            item.area.y = p.y;

            if (!template) {
                item.area.w = item.area.w / Math.max(0.0000001, this.schemeContainer.screenTransform.scale);
                item.area.h = item.area.h / Math.max(0.0000001, this.schemeContainer.screenTransform.scale);
            }

            const worldWidth = item.area.w;
            const worldHeight = item.area.h;

            this.schemeContainer.addItem(item);

            if (this.$store.state.autoRemount) {
                const proposedItemForMounting = this.schemeContainer.findItemSuitableForParent(item, x => x.id !== item.id);
                if (proposedItemForMounting) {
                    this.schemeContainer.remountItemInsideOtherItemAtTheBottom(item.id, proposedItemForMounting.id);
                }
            }

            const sv = worldScalingVectorOnItem(item);

            item.area.w = worldWidth / Math.max(0.0000001, sv.x);
            item.area.h = worldHeight / Math.max(0.0000001, sv.y);

            this.schemeContainer.selectItem(item);
            EditorEventBus.schemeChangeCommitted.$emit(this.editorId);

            if (template && item.args && item.args.templateRef) {
                this.currentTab = 'template';
            }
        },

        toLocalPoint(mouseX, mouseY) {
            return {
                x: (mouseX - this.schemeContainer.screenTransform.x) / this.schemeContainer.screenTransform.scale,
                y: (mouseY - this.schemeContainer.screenTransform.y) / this.schemeContainer.screenTransform.scale
            };
        },

        mouseWheel(x, y, mx, my, event) {
            if (this.active) {
                this.states[this.state].mouseWheel(x, y, mx, my, event);
            }
        },

        mouseDown(worldX, worldY, screenX, screenY, object, event) {
            this.mouseDownId++;

            if (this.active) {
                this.states[this.state].mouseDown(worldX, worldY, screenX, screenY, object, event);
            }
        },
        mouseUp(worldX, worldY, screenX, screenY, object, event) {
            if (this.active) {
                this.states[this.state].mouseUp(worldX, worldY, screenX, screenY, object, event);
            }
        },
        mouseMove(worldX, worldY, screenX, screenY, object, event) {
            if (this.active) {
                this.states[this.state].mouseMove(worldX, worldY, screenX, screenY, object, event);
                if (this.state === 'dragItem') {
                    this.cursorX = worldX;
                    this.cursorY = worldY;
                }
            }
        },
        mouseDoubleClick(worldX, worldY, screenX, screenY, object, event) {
            if (this.active) {
                this.states[this.state].mouseDoubleClick(worldX, worldY, screenX, screenY, object, event);
            }
        },

        mouseCoordsFromPageCoords(pageX, pageY) {
            var rect = document.getElementById(`svg-plot-${this.editorId}`).getBoundingClientRect(),
                offsetX = pageX - rect.left,
                offsetY  = pageY - rect.top;

            return {
                x: Math.round(offsetX),
                y: Math.round(offsetY)
            }
        },

        updateFloatingHelperPanel() {
            if (!this.schemeContainer) {
                return;
            }
            if (this.state !== 'dragItem'
                || !this.states.dragItem.shouldAllowFloatingHelperPanel()
                || this.schemeContainer.selectedItems.length !== 1
                || this.inPlaceTextEditor.shown) {
                this.resetFloatingHelperPanel();
                return;
            }

            const item = this.schemeContainer.selectedItems[0];

            const worldPoints = [
                worldPointOnItem(0, 0, item),
                worldPointOnItem(item.area.w, 0, item),
                worldPointOnItem(item.area.w, item.area.h, item),
                worldPointOnItem(0,item.area.h, item),
            ];
            const min = {x: worldPoints[0].x, y: worldPoints[0].y};
            const max = {x: worldPoints[0].x, y: worldPoints[0].y};
            worldPoints.forEach(p => {
                min.x = Math.min(min.x, p.x);
                min.y = Math.min(min.y, p.y);
                max.x = Math.max(max.x, p.x);
                max.y = Math.max(max.y, p.y);
            });

            const topMargin = 115;
            const bottomMargin = 60;
            const panelExpectedHeight = 40;

            const minScreen = {x: this._x(min.x), y: this._y(min.y) - topMargin};
            const maxScreen = {x: this._x(max.x), y: this._y(max.y) + bottomMargin};
            const midX = (minScreen.x + maxScreen.x)/2;

            const svgRect = document.getElementById(`svg-plot-${this.editorId}`).getBoundingClientRect();

            if (midX < 0 || midX > svgRect.width) {
                this.resetFloatingHelperPanel();
                return;
            }

            let screenY = minScreen.y;
            if (screenY < 5) {
                screenY = maxScreen.y;
            }
            if (screenY < 5 || screenY > svgRect.height - panelExpectedHeight) {
                this.resetFloatingHelperPanel();
                return;
            }

            this.floatingHelperPanel.x = midX;
            this.floatingHelperPanel.y = screenY;
            this.floatingHelperPanel.item = item;
            this.floatingHelperPanel.shown = true;
        },

        resetFloatingHelperPanel() {
            if (this.floatingHelperPanel.shown) {
                this.floatingHelperPanel.shown = false;
                this.floatingHelperPanel.item = null;
            }
        },

        onBottomPanelMouseDown(originalEvent) {
            dragAndDropBuilder(originalEvent)
            .onDrag((event, pageX, pageY) => {
                this.bottomPanelHeight = myMath.clamp(window.innerHeight - pageY, 100, window.innerHeight - 100);
            })
            .build();
        },

        openExportAllShapesModal() {
            this.exportShapeModal.scheme = this.schemeContainer.scheme;
            this.exportShapeModal.shown = true;
        },

        hideSidePanelRight() {
            this.sidePanelRightWidth = 0;
        },

        showSidePanelRight() {
            this.sidePanelRightWidth = this.sidePanelRightWidthLastUsed;
        },

        onRightSidePanelExpanderMouseDown(originalEvent) {
            this.onSidePanelExpanderMouseDown(originalEvent, this.$refs.sidePanelRight, 1, {
                onValue: value => {
                    this.sidePanelRightWidth = myMath.clamp(value, 0, Math.floor(window.innerWidth/2 - 20));
                    if (this.sidePanelRightWidth > 0) {
                        this.sidePanelRightWidthLastUsed = this.sidePanelRightWidth;
                    }
                },
                onToggle: () => {
                    if (this.sidePanelRightWidth > 0) {
                        this.sidePanelRightWidth = 0;
                    } else {
                        this.sidePanelRightWidth = myMath.clamp(this.sidePanelRightWidthLastUsed, 0, Math.floor(window.innerWidth/2 - 20));
                    }
                },
            });
        },

        onLeftSidePanelExpanderMouseDown(originalEvent) {
            this.onSidePanelExpanderMouseDown(originalEvent, this.$refs.sidePanelLeft, -1, {
                onValue: value => {
                    this.sidePanelLeftWidth = myMath.clamp(value, 0, Math.floor(window.innerWidth/2 - 20));
                    if (this.sidePanelLeftWidth > 0) {
                        this.sidePanelLeftWidthLastUsed = this.sidePanelLeftWidth;
                    }
                },
                onToggle: () => {
                    if (this.sidePanelLeftWidth > 0) {
                        this.sidePanelLeftWidth = 0;
                    } else {
                        this.sidePanelLeftWidth = myMath.clamp(this.sidePanelLeftWidthLastUsed, 0, Math.floor(window.innerWidth/2 - 20));
                    }
                },
            });
        },

        onSidePanelExpanderMouseDown(originalEvent, element, direction, callbacks) {
            const minWidth = 80;
            const originalWidth = element.getBoundingClientRect().width;

            dragAndDropBuilder(originalEvent)
            .onDrag((event, pageX, pageY, originalPageX, originalPageY) => {
                const dx = pageX - originalPageX;

                const newWidth = myMath.clamp(originalWidth - dx * direction, 0, window.innerWidth/2.5);
                if (newWidth < minWidth) {
                    callbacks.onValue(0);
                } else {
                    callbacks.onValue(newWidth);
                }
            })
            .onSimpleClick(() => {
                callbacks.onToggle();
            })
            .build();
        },

        onItemsHighlighted(highlightedItems) {
            this.highlightedItems = highlightedItems;
        },

        onFrameAnimatorRectordingStateUpdated(isRecording) {
            this.isRecording = isRecording;
            if (isRecording) {
                this.states.dragItem.enableRecording();
            } else {
                this.states.dragItem.disableRecording();
            }
        },

        switchSelectedComponentKind(kind) {
            if (!this.selectedItem || this.selectedItem.shape !== 'component') {
                return;
            }
            this.selectedItem.shapeProps.kind = kind;
            EditorEventBus.item.changed.specific.$emit(this.editorId, this.selectedItem.id, 'shapeProps.kind');
            EditorEventBus.schemeChangeCommitted.$emit(this.editorId, `items.${this.selectedItem.id}.shapeProps.kind`);
            this.updateSelectedComponent();
            this.$forceUpdate();
        },

        setSelectedComponentReferenceItem(element) {
            if (!this.selectedItem || this.selectedItem.shape !== 'component') {
                return;
            }
            this.selectedItem.shapeProps.referenceItem = element;
            EditorEventBus.item.changed.specific.$emit(this.editorId, this.selectedItem.id, 'shapeProps.referenceItem');
            EditorEventBus.schemeChangeCommitted.$emit(this.editorId, `items.${this.selectedItem.id}.shapeProps.referenceItem`);
            this.updateSelectedComponent();
            this.$forceUpdate();
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

        setCurveEditItem(item) {
            this.curveEditing.item = item;
            this.curveEditing.paths.length = 0;
            const paths = [];
            if (item) {
                item.shapeProps.paths.forEach((path, pathId) => {
                    const points = [];
                    path.points.forEach((point, pointId) => {
                        const p = convertCurvePointToItemScale(point, item.area.w, item.area.h);
                        p.id = pointId;
                        p.selected = false;
                        enrichCurvePoint(p);
                        points.push(p);
                    });
                    paths.push({ id: pathId, points });
                });
                const pointConverter = createCurvePointConverter(item);
                paths.forEach((path, pathId) => {
                    this.curveEditing.paths[pathId] = {id: path.id, points: path.points.map(pointConverter)};
                });
            }
        },
        updateCurveEditPoint(item, pathId, pointId, point) {
            if (!validatePointIds(pathId, pointId, this.curveEditing)) {
                return;
            }

            const pointConverter = createCurvePointConverter(item);
            const convertedPoint = pointConverter(convertCurvePointToItemScale(point, item.area.w, item.area.h));

            forEach(convertedPoint, (value, field) => {
                this.curveEditing.paths[pathId].points[pointId][field] = value;
                enrichCurvePoint(this.curveEditing.paths[pathId].points[pointId]);
            });
            // this is dirty hack, but we only need to update selected points
            // in case a single one is selected, as it gets displayed in the bottom panel
            if (this.curveEditing.selectedPoints.length === 1
                && this.curveEditing.selectedPoints[0].pathId === pathId
                && this.curveEditing.selectedPoints[0].pointId === pointId) {
                this.curveEditing.selectedPoints[0] = {
                    ...convertedPoint,
                    pathId, pointId
                };
            }
            this.$forceUpdate();
        },
        resetCurveEditPointSelection() {
            this.curveEditing.selectedPoints = [];
            this.curveEditing.paths.forEach(path => {
                path.points.forEach(point => {
                    point.selected = false;
                });
            });
            this.pathPointsUpdateKey++;
        },
        selectCurveEditPoint(pathId, pointId, inclusive) {
            if (!validatePointIds(pathId, pointId, this.curveEditing)) {
                return;
            }
            if (inclusive) {
                this.curveEditing.paths[pathId].points[pointId].selected = true;
            } else {
                this.curveEditing.paths.forEach((path, _pathIndex) => {
                    path.points.forEach((point, _pointIndex) => {
                        point.selected = _pathIndex === pathId && _pointIndex === pointId;
                    });
                });
            }
            this.updateSelectedCurveEditPoints();
        },
        updateSelectedCurveEditPoints() {
            const selectedPoints = [];
            this.curveEditing.paths.forEach((path, pathId) => {
                path.points.forEach((point, pointId) => {
                    if (point.selected) {
                        selectedPoints.push({ ...point, pathId, pointId });
                    }
                });
            });
            this.curveEditing.selectedPoints = selectedPoints;
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

        prettifyAxisValue(value, zoom) {
            return prettifyAxisValue(value, zoom);
        },

        onDiagramPickedForSelectedComponent(diagram) {
            if (!this.selectedItem || this.selectedItem.shape !== 'component') {
                return;
            }
            this.selectedItem.shapeProps.schemeId = diagram.id;
            this.$forceUpdate();
        },

        onMultiItemEditBoxCustomControlClicked(item) {
            this.schemeContainer.reindexSpecifiedItems([item]);
            this.schemeContainer.reindexItems();
            this.schemeContainer.updateMultiItemEditBox();
        },

        onWindowResize() {
            const minExpectedGap = 20;
            if (this.sidePanelRightWidth + minExpectedGap > window.innerWidth / 2) {
                this.sidePanelRightWidth = Math.floor(window.innerWidth / 2 - minExpectedGap )
            }
            if (this.sidePanelLeftWidth + minExpectedGap > window.innerWidth / 2) {
                this.sidePanelLeftWidth = Math.floor(window.innerWidth / 2 - minExpectedGap )
            }
        },

        startStateLoop() {
            this.isStateLooping = true;
            this.stateLoop(0);
        },

        stateLoop(deltaTime) {
            const oldTime = performance.now();
            this.states[this.state].loop(deltaTime);
            if (this.isStateLooping) {
                window.requestAnimationFrame(() => {
                    this.stateLoop(performance.now() - oldTime);
                });
            }
        },

        stopStateLoop() {
            this.isStateLooping = false;
        },

        rebaseScheme(latestScheme) {
            rebaseScheme(this.schemeContainer.scheme, latestScheme);
            this.schemeContainer.reindexItems();
            this.schemeContainer.reselectItems();
            if (this.state === 'editPath') {
                this.restoreCurveEditing();
            }
            this.editorRevision++;
            this.updateRevision();
        },

        changeTab(tab) {
            this.currentTab = tab;
            this.saveSchemeSettings();
        },

        //calculates from world to screen
        _x(x) { return x * this.schemeContainer.screenTransform.scale + this.schemeContainer.screenTransform.x },
        _y(y) { return y * this.schemeContainer.screenTransform.scale + this.schemeContainer.screenTransform.y },
        _z(v) { return v * this.schemeContainer.screenTransform.scale; },

        //calculates from screen to world
        x_(x) { return (x - this.schemeContainer.screenTransform.x) / this.schemeContainer.screenTransform.scale },
        y_(y) { return (y - this.schemeContainer.screenTransform.y) / this.schemeContainer.screenTransform.scale },
        z_(v) { return v / this.schemeContainer.screenTransform.scale; },

    },

    filters: {
        prettifyAxisValue(value, zoom) {
            return prettifyAxisValue(value, zoom);
        }
    },

    watch: {
        mode(value) {
            if (value === 'view') {
                this.switchToViewMode();
            } else {
                this.switchToEditMode();
            }
        },

        state(newState) {
            this.$emit('editor-state-changed', newState);
        },

        schemeReloadKey(newValue) {
            this.reloadSchemeContainer();
        },

        historyUndoable(undoable) {
            this.historyState.undoable = undoable;
        },

        historyRedoable(redoable) {
            this.historyState.redoable = redoable;
        },
    },

    computed: {
        currentSchemeContainer() {
            if (this.mode === 'view') {
                return this.interactiveSchemeContainer;
            } else {
                return this.schemeContainer;
            }
        },

        connectorProposedDestination() {
            return this.$store.getters.connectorProposedDestination;
        },

        statusMessage() {
            return this.$store.getters.statusMessage;
        },

        apiClient() {
            return this.$store.getters.apiClient;
        },

        editorSubStateName() {
            return this.$store.getters.editorSubStateName;
        },

        assetsPath() {
            return this.$store.getters.assetsPath;
        },

        docsPath() {
            return this.$store.getters.docsPath;
        },

        docsLinkTarget() {
            return this.$store.getters.docsLinkTarget;
        },

        selectedItemTemplateArgs() {
            if (this.schemeContainer.selectedItems.length !== 1) {
                return null;
            }

            const item = this.schemeContainer.selectedItems[0];
            if (!item.args || !item.args.templateArgs) {
                return null;
            }
            return item.args.templateArgs;
        },
    }
}
</script>

<style lang="css">
</style>
