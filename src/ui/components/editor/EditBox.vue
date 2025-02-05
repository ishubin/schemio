<!-- This Source Code Form is subject to the terms of the Mozilla Public
     License, v. 2.0. If a copy of the MPL was not distributed with this
     file, You can obtain one at https://mozilla.org/MPL/2.0/. -->
<template>
    <g data-preview-ignore="true" :style="{opacity: mainOpacity}">
        <path v-if="!isItemConnector && isThin" :transform="svgEditBoxTransform"
            :d="`M 0 0 L ${editBox.area.w} 0  L ${editBox.area.w} ${editBox.area.h} L 0 ${editBox.area.h} Z`"
            data-type="edit-box"
            class="edit-box-outline"
            :stroke-width="5/safeZoom"
            fill="none"
            stroke="rgba(255,255,255,0.0)" />

        <path v-if="!isItemConnector" :transform="svgEditBoxTransform"
            :d="`M 0 0 L ${editBox.area.w} 0  L ${editBox.area.w} ${editBox.area.h} L 0 ${editBox.area.h} Z`"
            data-type="edit-box"
            :class="{'edit-box-outline': isThin}"
            :stroke-width="1/safeZoom"
            fill="none"
            :stroke="boundaryBoxColor"
            style="opacity: 0.8;"/>

        <path v-if="!isItemConnector" :transform="svgEditBoxTransform"
            :d="`M 0 0 L ${editBox.area.w} 0  L ${editBox.area.w} ${editBox.area.h} L 0 ${editBox.area.h} Z`"
            data-type="edit-box"
            :stroke-width="1/safeZoom"
            :fill="editBoxFill"
            stroke="none"
            style="opacity: 0.8;"
            @dragenter="onItemDragEnter"
            @dragover="onItemDragOver"
            @dragleave="onItemDragLeave"
            @drop="onItemDrop"
            />

        <g v-for="ruleGuide in editBox.ruleGuides">
            <line v-if="ruleGuide.t === 'line'"
                class="edit-box-rule-guide"
                :x1="ruleGuide.p1.x"
                :y1="ruleGuide.p1.y"
                :x2="ruleGuide.p2.x"
                :y2="ruleGuide.p2.y"
                :stroke="boundaryBoxColor"
                :stroke-width="3/safeZoom"
            />
            <g v-if="ruleGuide.t === 'label' && ruleGuide.limit > (guideLabelSymbolSize * ruleGuide.text.length + 4) / safeZoom" :transform="`translate(${ruleGuide.x}, ${ruleGuide.y}) scale(${1/safeZoom}, ${1/safeZoom}) translate(${-guideLabelSymbolSize * ruleGuide.text.length / 2 - 2}, -8)`">
                <rect
                    x="0"
                    y="0"
                    :width="guideLabelSymbolSize * ruleGuide.text.length + 4"
                    height="16"
                    :stroke="boundaryBoxColor"
                    fill="rgba(255,255,255,1.0)"
                    :stroke-width="1"
                />
                <foreignObject
                    x="0"
                    y="0"
                    :width="guideLabelSymbolSize * ruleGuide.text.length + 4"
                    height="16"
                    >
                    <div xmlns="http://www.w3.org/1999/xhtml"
                        style="color: white; display: table-cell; text-align: center; vertical-align: middle; font-family: 'Courier New', monospace;"
                        :style="{'font-size': `10px`, width: `${guideLabelSymbolSize * ruleGuide.text.length + 4}px`, height: `16px`, color: boundaryBoxColor}"
                        >
                        {{ ruleGuide.text }}
                    </div>
                </foreignObject>
            </g>
        </g>

        <!-- rendering item custom control points -->
        <g v-if="kind === 'regular'">
            <g v-if="editBox.items.length === 1 && editBox.items[0].shape === 'connector' && selectedConnectorPath"
               :transform="svgConnectorCompleteTransform"
               >
                <path :d="selectedConnectorPath"
                    :stroke-width="`${editBox.items[0].shapeProps.strokeSize + 3}px`"
                    :stroke="boundaryBoxColor"
                    style="stroke-linejoin: round;opacity: 0.6;"
                    data-preview-ignore="true"
                    :data-item-id="editBox.items[0].id"
                    fill="none"/>

                <path :d="selectedConnectorPath"
                    :stroke-width="`${editBox.items[0].shapeProps.strokeSize}px`"
                    :stroke="editBox.items[0].shapeProps.strokeColor"
                    style="stroke-linejoin: round;"
                    data-preview-ignore="true"
                    :data-item-id="editBox.items[0].id"
                    :stroke-dasharray="createStrokeDashArray(editBox.items[0].shapeProps.strokePattern, editBox.items[0].shapeProps.strokeSize)"
                    fill="none"/>
            </g>

            <g :transform="svgEditBoxTransform" v-if="editBox.connectorPoints.length > 0">
                <circle v-for="connectorPoint in editBox.connectorPoints"
                    :key="`item-control-point-${connectorPoint.itemId}-${connectorPoint.id}`"
                    class="item-control-point"
                    :data-control-point-item-id="connectorPoint.itemId"
                    :data-control-point-id="connectorPoint.pointIdx"
                    :cx="connectorPoint.x" :cy="connectorPoint.y"
                    fill="rgba(255,255,255,0.7)"
                    :stroke="boundaryBoxColor"
                    :stroke-size="1/safeZoom"
                    :r="controlPointSize/safeZoom"
                    />
            </g>

            <g :transform="svgEditBoxTransform" v-if="shouldShowControlPoints">
                <circle v-for="controlPoint in controlPoints"
                    :key="`item-control-point-${controlPoint.id}`"
                    class="item-control-point"
                    :data-control-point-item-id="editBox.items[0].id"
                    :data-control-point-id="controlPoint.id"
                    :cx="controlPoint.point.x" :cy="controlPoint.point.y"
                    :fill="controlPointsColor"
                    :r="controlPointSize/safeZoom"
                    />

                <g v-for="(control, idx) in customControls"
                    :transform="`translate(${editBox.area.w * control.xAxis.widthFactor + control.xAxis.direction * (control.position.x * control.xAxis.scaleFactor / safeZoom + control.position.x * (1 - control.xAxis.scaleFactor))}, ${editBox.area.h * control.yAxis.widthFactor + control.yAxis.direction * (control.position.y * control.yAxis.scaleFactor / safeZoom + control.position.y * (1 - control.yAxis.scaleFactor))})`"
                    >
                    <circle class="item-control-point"
                        :cx="0"
                        :cy="0"
                        :r="10/safeZoom"
                        :fill="controlPointsColor"
                        >
                    </circle>
                    <foreignObject :x="-10/safeZoom" :y="-10/safeZoom"  :width="20/safeZoom" :height="20/safeZoom">
                        <div xmlns="http://www.w3.org/1999/xhtml"
                            style="color: white; display: table-cell; text-align: center; vertical-align: middle"
                            :style="{'font-size': `${12/safeZoom}px`,width: `${Math.round(20/safeZoom)}px`, height: `${Math.round(20/safeZoom)}px`}"
                            >
                            <i :class="control.iconClass"></i>
                        </div>
                    </foreignObject>
                    <circle class="item-control-point"
                        :cx="0"
                        :cy="0"
                        :r="10/safeZoom"
                        fill="rgba(255, 255, 255, 0.0)"
                        :title="control.name"
                        data-type="edit-box-custom-control"
                        @click="onCustomControlClick(idx)"
                        >
                    </circle>
                </g>

                <g v-for="(control,idx) in templateControls">
                    <template v-if="control.type === 'button' || control.type === 'choice'">
                        <rect
                            class="item-control-point"
                            :x="control.x - control.xc * control.width/safeZoom"
                            :y="control.y - control.yc * control.height/safeZoom"
                            :width="control.width/safeZoom"
                            :height="control.height/safeZoom"
                            :fill="controlPointsColor"
                            :rx="10/safeZoom"
                            />
                        <foreignObject :x="control.x - control.xc * control.width/safeZoom" :y="control.y - control.yc * control.height/safeZoom"  :width="control.width/safeZoom" :height="control.height/safeZoom">
                            <div xmlns="http://www.w3.org/1999/xhtml"
                                style="color: white; display: table-cell; white-space: nowrap; text-align: center; vertical-align: middle"
                                :style="{'font-size': `${12/safeZoom}px`,width: `${Math.round(control.width/safeZoom)}px`, height: `${Math.round(control.height/safeZoom)}px`}"
                                >
                                {{ control.text }}
                            </div>
                        </foreignObject>
                        <rect
                            class="item-control-point"
                            :x="control.x - control.xc * control.width/safeZoom"
                            :y="control.y - control.yc * control.height/safeZoom"
                            :width="control.width/safeZoom"
                            :height="control.height/safeZoom"
                            fill="rgba(0,0,0,0)"
                            :rx="10/safeZoom"
                            data-type="edit-box-template-control"
                            @click="onTemplateControlClick(idx, $event)"
                            />
                    </template>
                    <template v-else-if="control.type === 'textfield'">
                        <rect
                            class="item-control-point"
                            :x="control.x - control.xc * control.width/safeZoom"
                            :y="control.y - control.yc * control.height/safeZoom"
                            :width="control.width/safeZoom"
                            :height="control.height/safeZoom"
                            :fill="controlPointsColor"
                            :rx="2/safeZoom"
                            />
                        <foreignObject :x="control.x - control.xc * control.width/safeZoom" :y="control.y - control.yc * control.height/safeZoom"  :width="control.width/safeZoom" :height="control.height/safeZoom">
                            <div xmlns="http://www.w3.org/1999/xhtml"
                                style="color: white; display: table-cell; white-space: nowrap; text-align: center; vertical-align: middle"
                                :style="{width: `${Math.round(control.width/safeZoom)}px`, height: `${Math.round(control.height/safeZoom)}px`}"
                                >
                                <input class="item-control-point-textfield"
                                    type="text"
                                    :value="control.text"
                                    :style="{'font-size': `${14/safeZoom}px`, 'padding-left': `${7/safeZoom}px`}"
                                    @blur="submitTemplateControlText(idx, $event.target.value)"
                                    @keydown.enter="submitTemplateControlText(idx, $event.target.value)"
                                    />
                            </div>
                        </foreignObject>
                    </template>
                </g>
            </g>
        </g>

        <g v-if="!isItemConnector" :transform="svgEditBoxTransform">
            <ellipse v-if="kind === 'regular' && !isAutoLayoutEnabled && !isLocked && !isAMovableTemplatedItem && editBox.rotationEnabled" class="boundary-box-dragger"
                data-type="edit-box-rotational-dragger"
                :fill="boundaryBoxColor"
                :cx="editBox.area.w / 2"
                :cy="-60/safeZoom"
                :rx="controlPointSize/safeZoom"
                :ry="controlPointSize/safeZoom"
            />

            <transition name="edit-box-controls" v-if="!isAutoLayoutEnabled && !isLocked && !isAMovableTemplatedItem && editBox.connectorStarterEnabled && editBox.items.length === 1 && kind === 'regular' && connectionStarterDisplayed">
                <g>
                    <path class="boundary-box-connector-starter"
                        :transform="`translate(${editBox.area.w/2 + 3/safeZoom}  ${editBox.area.h + 30/safeZoom}) scale(${1/safeZoom}) rotate(90)`"
                        :data-connector-starter-item-id="editBox.items[0].id"
                        :fill="boundaryBoxColor"
                        d="M 0 0  L 10 0  L 10 -3  L 20 3  L 10 9  L 10 6  L 0 6 Z"/>

                    <path class="boundary-box-connector-starter"
                        :transform="`translate(${editBox.area.w/2 - 3/safeZoom}  ${-30/safeZoom}) scale(${1/safeZoom}) rotate(270)`"
                        :data-connector-starter-item-id="editBox.items[0].id"
                        :fill="boundaryBoxColor"
                        d="M 0 0  L 10 0  L 10 -3  L 20 3  L 10 9  L 10 6  L 0 6 Z"/>

                    <path class="boundary-box-connector-starter"
                        :transform="`translate(${editBox.area.w + 30/safeZoom}  ${editBox.area.h/2 - 3/safeZoom}) scale(${1/safeZoom})`"
                        :data-connector-starter-item-id="editBox.items[0].id"
                        :fill="boundaryBoxColor"
                        d="M 0 0  L 10 0  L 10 -3  L 20 3  L 10 9  L 10 6  L 0 6 Z"/>

                    <path class="boundary-box-connector-starter"
                        :transform="`translate(${-30/safeZoom}  ${editBox.area.h/2 + 3/safeZoom}) scale(${1/safeZoom}) rotate(180)`"
                        :data-connector-starter-item-id="editBox.items[0].id"
                        :fill="boundaryBoxColor"
                        d="M 0 0  L 10 0  L 10 -3  L 20 3  L 10 9  L 10 6  L 0 6 Z"/>
                </g>
            </transition>

            <g v-if="kind === 'regular' && !isAutoLayoutEnabled && !isLocked && !isAMovableTemplatedItem">
                <rect class="boundary-box-dragger"
                    data-type="edit-box-resize-dragger"
                    data-dragger-edges="top,left"
                    :fill="boundaryBoxColor"
                    :x="-(draggerSize*2 + 10) / safeZoom"
                    :y="-(draggerSize*2 + 10)/ safeZoom"
                    :width="draggerSize * 2 / safeZoom"
                    :height="draggerSize * 2 / safeZoom"
                />

                <rect class="boundary-box-dragger"
                    data-type="edit-box-resize-dragger"
                    data-dragger-edges="top"
                    :fill="boundaryBoxColor"
                    :x="editBox.area.w / 2 - draggerSize / safeZoom"
                    :y="-(draggerSize*2 + 10)/ safeZoom"
                    :width="draggerSize * 2 / safeZoom"
                    :height="draggerSize * 2 / safeZoom"
                />

                <rect class="boundary-box-dragger"
                    data-type="edit-box-resize-dragger"
                    data-dragger-edges="top,right"
                    :fill="boundaryBoxColor"
                    :x="editBox.area.w + 10 / safeZoom"
                    :y="-(draggerSize*2 + 10)/ safeZoom"
                    :width="draggerSize * 2 / safeZoom"
                    :height="draggerSize * 2 / safeZoom"
                />

                <rect class="boundary-box-dragger"
                    data-type="edit-box-resize-dragger"
                    data-dragger-edges="left"
                    :fill="boundaryBoxColor"
                    :x="-(draggerSize*2 + 10) / safeZoom"
                    :y="editBox.area.h / 2 - draggerSize / safeZoom"
                    :width="draggerSize * 2 / safeZoom"
                    :height="draggerSize * 2 / safeZoom"
                />

                <rect class="boundary-box-dragger"
                    data-type="edit-box-resize-dragger"
                    data-dragger-edges="right"
                    :fill="boundaryBoxColor"
                    :x="editBox.area.w + 10 / safeZoom"
                    :y="editBox.area.h / 2 - draggerSize / safeZoom"
                    :width="draggerSize * 2 / safeZoom"
                    :height="draggerSize * 2 / safeZoom"
                />

                <rect class="boundary-box-dragger"
                    data-type="edit-box-resize-dragger"
                    data-dragger-edges="bottom,left"
                    :fill="boundaryBoxColor"
                    :x="-(draggerSize*2 + 10) / safeZoom"
                    :y="editBox.area.h + 10 / safeZoom"
                    :width="draggerSize * 2 / safeZoom"
                    :height="draggerSize * 2 / safeZoom"
                />

                <rect class="boundary-box-dragger"
                    data-type="edit-box-resize-dragger"
                    data-dragger-edges="bottom"
                    :fill="boundaryBoxColor"
                    :x="editBox.area.w / 2 - draggerSize / safeZoom"
                    :y="editBox.area.h + 10 / safeZoom"
                    :width="draggerSize * 2 / safeZoom"
                    :height="draggerSize * 2 / safeZoom"
                />

                <rect class="boundary-box-dragger"
                    data-type="edit-box-resize-dragger"
                    data-dragger-edges="bottom,right"
                    :fill="boundaryBoxColor"
                    :x="editBox.area.w + 10 / safeZoom"
                    :y="editBox.area.h + 10 / safeZoom"
                    :width="draggerSize * 2 / safeZoom"
                    :height="draggerSize * 2 / safeZoom"
                />
                <g class="boundary-box-pivot-dragger" v-if="showPivot">
                    <line
                        :x1="editBox.area.w * editBox.pivotPoint.x"
                        :y1="editBox.area.h * editBox.pivotPoint.y - 10/safeZoom"
                        :x2="editBox.area.w * editBox.pivotPoint.x"
                        :y2="editBox.area.h * editBox.pivotPoint.y + 10/safeZoom"
                        :stroke="boundaryBoxColor"
                        :stroke-width="1/safeZoom"
                    />
                    <line
                        :x1="editBox.area.w * editBox.pivotPoint.x - 10/safeZoom"
                        :y1="editBox.area.h * editBox.pivotPoint.y"
                        :x2="editBox.area.w * editBox.pivotPoint.x + 10/safeZoom"
                        :y2="editBox.area.h * editBox.pivotPoint.y"
                        :stroke="boundaryBoxColor"
                        :stroke-width="1/safeZoom"
                    />

                    <circle
                        data-type="edit-box-pivot-dragger"
                        fill="rgba(255,255,255,0.0)"
                        :stroke="boundaryBoxColor"
                        :stroke-width="1/safeZoom"
                        :cx="editBox.area.w * editBox.pivotPoint.x"
                        :cy="editBox.area.h * editBox.pivotPoint.y"
                        :r="10/safeZoom"
                    />
                </g>
            </g>
            <g v-if="kind === 'regular'">
                <g class="boundary-box-context-menu-button">
                    <rect
                        data-type="edit-box-context-menu-button"
                        :fill="boundaryBoxColor"
                        :x="editBox.area.w + 6 * 5 / safeZoom"
                        :y="-10 * 5 / safeZoom"
                        :width="5 * 4 / safeZoom"
                        :height="5 * 4 / safeZoom"
                        :rx="2 / safeZoom"
                    />
                    <rect
                        data-type="edit-box-context-menu-button"
                        fill="#ffffff"
                        :x="editBox.area.w + 6 * 5 / safeZoom + 3.5 / safeZoom"
                        :y="-10 * 5 / safeZoom + 4/safeZoom"
                        :width="5 * 2.5 / safeZoom"
                        :height="2 / safeZoom"
                        :rx="1 / safeZoom"
                    />
                    <rect
                        data-type="edit-box-context-menu-button"
                        fill="#ffffff"
                        :x="editBox.area.w + 6 * 5 / safeZoom + 3.5 / safeZoom"
                        :y="-10 * 5 / safeZoom + 9/safeZoom"
                        :width="5 * 2.5 / safeZoom"
                        :height="2 / safeZoom"
                        :rx="1 / safeZoom"
                    />
                    <rect
                        data-type="edit-box-context-menu-button"
                        fill="#ffffff"
                        :x="editBox.area.w + 6 * 5 / safeZoom + 3.5 / safeZoom"
                        :y="-10 * 5 / safeZoom + 14/safeZoom"
                        :width="5 * 2.5 / safeZoom"
                        :height="2 / safeZoom"
                        :rx="1 / safeZoom"
                    />
                    <rect
                        data-type="edit-box-context-menu-button"
                        fill="rgba(255,255,255,0.0)"
                        :x="editBox.area.w + 6 * 5 / safeZoom"
                        :y="-10 * 5 / safeZoom"
                        :width="5 * 4 / safeZoom"
                        :height="5 * 4 / safeZoom"
                        :rx="2 / safeZoom"
                    />
                </g>

            </g>
            <g v-else-if="kind === 'crop-image'">
                <g :transform="`translate(${10/safeZoom}, ${-20/safeZoom}) scale(${1/safeZoom})`">
                    <foreignObject :x="0" :y="0" width="100" height="20">
                        <div>
                            <span class="link" data-type="edit-box-reset-image-crop-link">Reset</span>
                        </div>
                    </foreignObject>
                </g>
                <path :transform="`translate(${editBox.area.w/2}, 0) rotate(0)`" :d="`M ${-cdsB} ${-cds} L ${cdsB} ${-cds}  L ${cdsB} ${cds} L ${-cdsB} ${cds} Z`"
                    class="boundary-box-dragger"
                    data-type="edit-box-resize-dragger"
                    data-dragger-edges="top"
                    :fill="boundaryBoxColor"
                    stroke="rgba(255,255,255,1.0)"
                    :stroke-width="`${1/safeZoom}px`"
                />
                <path :transform="`translate(${editBox.area.w}, ${editBox.area.h/2}) rotate(90)`" :d="`M ${-cdsB} ${-cds} L ${cdsB} ${-cds}  L ${cdsB} ${cds} L ${-cdsB} ${cds} Z`"
                    class="boundary-box-dragger"
                    data-type="edit-box-resize-dragger"
                    data-dragger-edges="right"
                    :fill="boundaryBoxColor"
                    stroke="rgba(255,255,255,1.0)"
                    :stroke-width="`${1/safeZoom}px`"
                />
                <path :transform="`translate(${editBox.area.w/2}, ${editBox.area.h}) rotate(0)`" :d="`M ${-cdsB} ${-cds} L ${cdsB} ${-cds}  L ${cdsB} ${cds} L ${-cdsB} ${cds} Z`"
                    class="boundary-box-dragger"
                    data-type="edit-box-resize-dragger"
                    data-dragger-edges="bottom"
                    :fill="boundaryBoxColor"
                    stroke="rgba(255,255,255,1.0)"
                    :stroke-width="`${1/safeZoom}px`"
                />
                <path :transform="`translate(0, ${editBox.area.h/2}) rotate(90)`" :d="`M ${-cdsB} ${-cds} L ${cdsB} ${-cds}  L ${cdsB} ${cds} L ${-cdsB} ${cds} Z`"
                    class="boundary-box-dragger"
                    data-type="edit-box-resize-dragger"
                    data-dragger-edges="left"
                    :fill="boundaryBoxColor"
                    stroke="rgba(255,255,255,1.0)"
                    :stroke-width="`${1/safeZoom}px`"
                />
                <path :d="`M ${-cds} ${-cds} L ${cdsB} ${-cds} L ${cdsB} ${cds} L ${cds} ${cds} L ${cds} ${cdsB} L ${-cds} ${cdsB} Z`"
                    class="boundary-box-dragger"
                    data-type="edit-box-resize-dragger"
                    data-dragger-edges="top,left"
                    :fill="boundaryBoxColor"
                    stroke="rgba(255,255,255,1.0)"
                    :stroke-width="`${1/safeZoom}px`"
                />
                <path :transform="`translate(${editBox.area.w}, 0) rotate(90)`" :d="`M ${-cds} ${-cds} L ${cdsB} ${-cds} L ${cdsB} ${cds} L ${cds} ${cds} L ${cds} ${cdsB} L ${-cds} ${cdsB} Z`"
                    class="boundary-box-dragger"
                    data-type="edit-box-resize-dragger"
                    data-dragger-edges="top,right"
                    :fill="boundaryBoxColor"
                    stroke="rgba(255,255,255,1.0)"
                    :stroke-width="`${1/safeZoom}px`"
                />
                <path :transform="`translate(${editBox.area.w}, ${editBox.area.h}) rotate(180)`" :d="`M ${-cds} ${-cds} L ${cdsB} ${-cds} L ${cdsB} ${cds} L ${cds} ${cds} L ${cds} ${cdsB} L ${-cds} ${cdsB} Z`"
                    class="boundary-box-dragger"
                    data-type="edit-box-resize-dragger"
                    data-dragger-edges="bottom,right"
                    :fill="boundaryBoxColor"
                    stroke="rgba(255,255,255,1.0)"
                    :stroke-width="`${1/safeZoom}px`"
                />
                <path :transform="`translate(0, ${editBox.area.h}) rotate(-90)`" :d="`M ${-cds} ${-cds} L ${cdsB} ${-cds} L ${cdsB} ${cds} L ${cds} ${cds} L ${cds} ${cdsB} L ${-cds} ${cdsB} Z`"
                    class="boundary-box-dragger"
                    data-type="edit-box-resize-dragger"
                    data-dragger-edges="bottom,left"
                    :fill="boundaryBoxColor"
                    stroke="rgba(255,255,255,1.0)"
                    :stroke-width="`${1/safeZoom}px`"
                />
            </g>

        </g>

    </g>
</template>

<script>
import Shape from './items/shapes/Shape';
import StoreUtils from '../../store/StoreUtils';
import StrokePattern from './items/StrokePattern';
import myMath from '../../myMath';
import { itemCompleteTransform, worldPointOnItem } from '../../scheme/ItemMath';
import EditorEventBus from './EditorEventBus';
import utils from '../../utils';
import { jsonDiff } from '../../json-differ';


/**
 *
 * @param {EditBox} editBox
 */
function isItemConnector(editBox) {
    return (editBox.items.length === 1 && editBox.itemIds.size === 1 && editBox.items[0].shape === 'connector')
        || (editBox.items.length === 0 && editBox.connectorPoints.length === 1);
}

function createCustomControlAxis(place) {
    if (place === 'right' || place === 'bottom') {
        return {
            widthFactor: 1,
            direction: 1,
            scaleFactor: 1
        };
    } else if (place === 'left' || place === 'top') {
        return {
            widthFactor: 0,
            direction: -1,
            scaleFactor: 1
        };
    }
    return {
        widthFactor: 0,
        direction: 1,
        scaleFactor: 0
    };
}

export default {
    props: {
        useFill: {type: Boolean, default: true},
        apiClient: {type: Object, required: true},
        editorId: {type: String, required: true},
        schemeContainer: {type: Object, required: true},
        cursor: {type: Object},

        /** @type {EditBox} */
        editBox: {type: Object, required: true},

        zoom: {type: Number},
        boundaryBoxColor: {type: String},
        controlPointsColor: {type: String},

        // can be regular or crop-image
        kind: {type: String, default: 'regular'},
    },

    beforeMount() {
        // reseting selected connector if it was set previously
        StoreUtils.setSelectedConnector(this.$store, null);
        if (this.editBox.templateRef && this.editBox.templateItemRoot) {
            this.fetchTemplate(this.editBox.templateRef);
        }


        if (this.editBox.items.length === 1) {
            const item = this.editBox.items[0];
            const shape = Shape.find(item.shape);

            this.configureCustomControls(item, shape ? shape.editorProps : {});

            if (item.shape === 'connector' && this.editBox.itemIds.size === 1) {
                StoreUtils.setSelectedConnector(this.$store, item);
            }

            StoreUtils.setItemControlPoints(this.$store, item);
        } else {
            StoreUtils.clearItemControlPoints(this.$store);
        }
    },

    mounted() {
        this.onCursorChange(this.cursor);
        EditorEventBus.colorControlToggled.$on(this.editorId, this.onColorControlToggled);
    },

    beforeDestroy() {
        this.clearConnectionStarterTimeout();
        EditorEventBus.colorControlToggled.$off(this.editorId, this.onColorControlToggled);
    },

    data() {
        return {
            draggerSize: window.innerWidth > 900 ? 5 : 8,
            controlPointSize: window.innerWidth > 900 ? 6 : 10,
            connectionStarterDisplayed: false,
            connectionStarterTimerId: null,

            template: null,
            customControls: [],
            templateControls: [],
            colorControlToggled: false,
            draggingFileOver: false,
        };
    },

    methods: {
        onItemDragEnter(event) {
            if (!this.$store.state.apiClient || !this.$store.state.apiClient.uploadFile || !this.editBox.items || this.editBox.items.length === 0) {
                return;
            }
            if (event.dataTransfer) {
                this.draggingFileOver = true;
            }
        },

        onItemDragOver(event) {
            if (!this.$store.state.apiClient || !this.$store.state.apiClient.uploadFile || !this.editBox.items || this.editBox.items.length === 0) {
                return;
            }
            if (event.dataTransfer) {
                this.draggingFileOver = true;
            }
        },

        onItemDragLeave(event) {
            this.draggingFileOver = false;
        },

        onItemDrop(event) {
            this.draggingFileOver = false;
            event.preventDefault();
            if (!this.$store.state.apiClient || !this.$store.state.apiClient.uploadFile || !this.editBox.items || this.editBox.items.length === 0) {
                return;
            }

            let fileItems = [...event.dataTransfer.items].filter(item => item.kind === 'file');

            if (fileItems.length === 0) {
                return;
            }


            fileItems.map(item => item.getAsFile())
            .map(file => {
                const title = file.name;
                StoreUtils.addInfoSystemMessage(this.$store, `Uploading file "${title}"...`, `file-uploading-${title}`, 'fas fa-spinner fa-spin fa-1x');
                return this.$store.state.apiClient.uploadFile(file)
                .then(url => {
                    this.editBox.items.forEach(item => {
                        if (item.shape === 'link') {
                            item.shapeProps.url = url;
                            item.shapeProps.icon = 'file';
                            StoreUtils.addInfoSystemMessage(this.$store, `Updated link url to ${url}`, `item-link-url-changed-${this.editBox.id}`)
                            EditorEventBus.item.changed.specific.$emit(this.editorId, item.id);
                        } else {
                            if (!Array.isArray(item.links)) {
                                item.links = [];
                            }
                            item.links.push({
                                title, url, type: 'file'
                            });
                            StoreUtils.addInfoSystemMessage(this.$store, `Attached file "${title}" to item`, `item-link-url-changed-${this.editBox.id}-${title}`)
                            EditorEventBus.item.changed.specific.$emit(this.editorId, item.id, 'links');
                        }
                    });
                    EditorEventBus.schemeChangeCommitted.$emit(this.editorId);
                })
                .catch(err => {
                    console.error(err);
                    if (err.response && err.response.data && err.response.data.message) {
                        StoreUtils.addErrorSystemMessage(this.$store, err.response.data.message, `item-upload-error-${title}`);
                    } else {
                        StoreUtils.addErrorSystemMessage(this.$store, 'Something went wrong, could not upload file', `item-upload-error-${title}`);
                    }
                    return null;
                });
            });
        },

        fetchTemplate(templateRef) {
            this.schemeContainer.getTemplate(templateRef).then(compiledTemplate => {
                this.template = compiledTemplate;
                this.buildTemplateControls();
            });
        },

        createStrokeDashArray(pattern, strokeSize) {
            return StrokePattern.createDashArray(pattern, strokeSize);
        },

        clearConnectionStarterTimeout() {
            if (this.connectionStarterTimerId) {
                clearTimeout(this.connectionStarterTimerId);
            }
        },

        hideConnectionStarter() {
            this.clearConnectionStarterTimeout();
            this.connectionStarterTimerId = setTimeout(() => {
                this.connectionStarterDisplayed = false;
                this.connectionStarterTimerId = null;
            }, 500);
        },

        onCursorChange(p) {
            const localPoint = myMath.localPointInArea(p.x, p.y, this.editBox.area, null);
            if (localPoint.x >= 0 && localPoint.x <= this.editBox.area.w
                && localPoint.y >= 0 && localPoint.y <= this.editBox.area.h
            ) {
                this.connectionStarterDisplayed = true;
                this.clearConnectionStarterTimeout();
            } else {
                this.hideConnectionStarter();
            }
        },

        configureCustomControls(item, editorProps) {
            if (!editorProps || !editorProps.editBoxControls) {
                return;
            }

            editorProps.editBoxControls(this.editorId, item).forEach(control => {
                this.customControls.push({
                    ...control,
                    xAxis: createCustomControlAxis(control.hPlace),
                    yAxis: createCustomControlAxis(control.vPlace),
                });
            });
        },

        onCustomControlClick(idx) {
            this.customControls[idx].click();
            this.$emit('custom-control-clicked', this.editBox.items[0]);
        },

        buildTemplateControls() {
            if (!this.template || this.editBox.items.length !== 1 || !this.editBox.templateItemRoot) {
                return;
            }
            const rootItem = this.editBox.templateItemRoot;
            const templateArgs = rootItem.args && rootItem.args.templateArgs ? rootItem.args.templateArgs : {};


            const allSelectedTemplatedIds = new Set();
            this.editBox.items.forEach(item => {
                if (item.meta.templateRootId === rootItem.id && item.args.templatedId) {
                    allSelectedTemplatedIds.add(item.args.templatedId);
                }
            });
            this.templateControls = this.template.buildControls(templateArgs, rootItem.area.w, rootItem.area.h).filter(control => {
                return !control.selectedItemId || allSelectedTemplatedIds.has(control.selectedItemId);
            });

            this.templateControls.forEach(control => {
                const wp = worldPointOnItem(control.x, control.y, this.editBox.templateItemRoot);
                const lp = myMath.localPointInArea(wp.x, wp.y, this.editBox.area);
                const placement = control.placement && control.placement.length > 1 ? control.placement : 'TL';
                // setting up placement corrections so that the control is correctly positioned
                // possible placements are : TL, TR, BL, BR. (top-left, top-right, bottom-left, bottom-right)
                control.xc = placement.charAt(1) === 'R' ? 1 : 0;
                control.yc = placement.charAt(0) === 'B' ? 1 : 0;
                control.x = lp.x;
                control.y = lp.y;
            });
            this.$forceUpdate();
        },


        submitTemplateControlText(idx, text) {
            const item = this.editBox.templateItemRoot;
            const originArgs = utils.clone(item.args.templateArgs);
            const updatedArgs = this.templateControls[idx].input(item, text);

            const diff = jsonDiff(originArgs, updatedArgs);
            if (diff.changes.length > 0) {
                EditorEventBus.schemeChangeCommitted.$emit(this.editorId);
            }

            if (item.args && item.args.templateArgs) {
                for (let key in item.args.templateArgs) {
                    if (updatedArgs.hasOwnProperty(key)) {
                        item.args.templateArgs[key] = updatedArgs[key];
                    }
                }
            }
            this.$emit('template-rebuild-requested', this.editBox.templateItemRoot.id, this.template, item.args.templateArgs);
            this.$emit('template-properties-updated-requested');
        },

        expandTemplateControlChoiceOptions(control, event) {
            const item = this.editBox.templateItemRoot;
            let options = control.options;
            if (control.optionsProvider) {
                options = control.optionsProvider(item);
            }
            this.$emit('choice-control-clicked', {
                options: options,
                editBoxId: this.editBox.id,
                event,

                callback: (selectedOption) => {
                    const originArgs = utils.clone(item.args.templateArgs);
                    const updatedArgs = control.click(item, selectedOption);
                    item.area.w = updatedArgs.width;
                    item.area.h = updatedArgs.height;

                    const diff = jsonDiff(originArgs, updatedArgs);
                    if (diff.changes.length > 0) {
                        EditorEventBus.schemeChangeCommitted.$emit(this.editorId);
                    }

                    if (item.args && item.args.templateArgs) {
                        for (let key in item.args.templateArgs) {
                            if (updatedArgs.hasOwnProperty(key)) {
                                item.args.templateArgs[key] = updatedArgs[key];
                            }
                        }
                    }
                    this.$emit('template-rebuild-requested', this.editBox.templateItemRoot.id, this.template, item.args.templateArgs);
                    this.$emit('template-properties-updated-requested');
                },
            });
        },

        onTemplateControlClick(idx, event) {
            const control = this.templateControls[idx];
            if (control.type === 'choice') {
                this.expandTemplateControlChoiceOptions(control, event);
                return;
            }
            const item = this.editBox.templateItemRoot;
            const originArgs = utils.clone(item.args.templateArgs);
            const updatedArgs = control.click(item);
            item.area.w = updatedArgs.width;
            item.area.h = updatedArgs.height;

            const diff = jsonDiff(originArgs, updatedArgs);
            if (diff.changes.length > 0) {
                EditorEventBus.schemeChangeCommitted.$emit(this.editorId);
            }

            if (item.args && item.args.templateArgs) {
                for (let key in item.args.templateArgs) {
                    if (updatedArgs.hasOwnProperty(key)) {
                        item.args.templateArgs[key] = updatedArgs[key];
                    }
                }
            }
            this.$emit('template-rebuild-requested', this.editBox.templateItemRoot.id, this.template, item.args.templateArgs);
            this.$emit('template-properties-updated-requested');
        },

        onColorControlToggled(expanded) {
            // using a timeout to prevent any race conditions when this even is being triggered by multiple color pickers
            // This can happen when user clicks from one toggled color picker to another and it first handles the expand event from new color picker
            // and after it collapse event from old color picker
            setTimeout(() => {
                const totalDisplayedPickers = ['.stroke-control-color-container', '.color-picker-tooltip']
                    .map(selector => document.querySelectorAll(selector).length)
                    .reduce((partialSum, a) => partialSum + a, 0);
                this.colorControlToggled = totalDisplayedPickers > 0;

            }, 100);
        }
    },

    watch: {
        cursor(p) {
            this.onCursorChange(p);
        }
    },

    computed: {
        guideLabelSymbolSize() {
            return 9;
        },
        editBoxFill() {
            if (this.draggingFileOver) {
                return 'rgba(140, 255, 140, 0.6)';
            }
            if (this.useFill) {
                return 'rgba(255,255,255,0.0)';
            }
            return 'none';
        },

        svgConnectorCompleteTransform() {
            if (!this.$store.getters.selectedConnector) {
                return '';
            }
            const m = itemCompleteTransform(this.$store.getters.selectedConnector);
            return `matrix(${m[0][0]},${m[1][0]},${m[0][1]},${m[1][1]},${m[0][2]},${m[1][2]})`
        },


        svgEditBoxTransform() {
            const m = myMath.standardTransformWithArea(myMath.identityMatrix(), this.editBox.area);
            return `matrix(${m[0][0]},${m[1][0]},${m[0][1]},${m[1][1]},${m[0][2]},${m[1][2]})`
        },

        safeZoom() {
            if (this.zoom > 0.001) {
                return this.zoom;
            }
            return 1.0;
        },

        //crop dragger size
        cds() {
            if (this.zoom > 0.001) {
                return 0.7 * this.draggerSize / this.zoom;
            }
            return 0.7 * this.draggerSize;
        },

        //crop dragger size big (how wide it should be)
        cdsB() {
            if (this.zoom > 0.001) {
                return 3 * this.draggerSize / this.zoom;
            }
            return 3 * this.draggerSize;
        },

        controlPoints() {
            return this.$store.getters.itemControlPointsList;
        },

        isItemConnector() {
            return isItemConnector(this.editBox);
        },

        shouldShowControlPoints() {
            return this.editBox.items.length === 1;
        },

        selectedConnectorPath() {
            return this.$store.getters.selectedConnectorPath;
        },

        showPivot() {
            return this.$store.getters.showPivot;
        },

        isThin() {
            const safeZoom = this.zoom > 0.001 ? this.zoom : 1.0;
            return this.editBox.area.w/safeZoom < 3 || this.editBox.area.h/safeZoom < 3;
        },

        isAutoLayoutEnabled() {
            let allAutoLayout = true;

            this.editBox.items.forEach(item => {
                allAutoLayout = allAutoLayout & (item.autoLayout && item.autoLayout.on);
            });
            return allAutoLayout;
        },

        isAMovableTemplatedItem() {
            if (this.editBox.items.length === 1) {
                const item = this.editBox.items[0];
                return item.meta && item.meta.templated && item.args && item.args.tplArea == 'movable';
            }
            return false;
        },

        isLocked() {
            if (this.editBox.connectorPoints && this.editBox.connectorPoints.length > 0) {
                return false;
            }

            let locked = true;

            this.editBox.items.forEach(item => {
                locked = locked & item.locked;
            });
            return locked;
        },

        mainOpacity() {
            if (this.colorControlToggled) {
                return 0;
            } else {
                return this.useFill ? 1 : 0.5;
            }
        }
    }
}
</script>