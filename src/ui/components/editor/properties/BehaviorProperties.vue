<!-- This Source Code Form is subject to the terms of the Mozilla Public
     License, v. 2.0. If a copy of the MPL was not distributed with this
     file, You can obtain one at https://mozilla.org/MPL/2.0/. -->
<template>
    <div :class="{'actions-being-dragged': dragging.eventIndex >= 0}">
        <panel v-if="!extended" uid="behavior-tags" name="General">
            <vue-tags-input v-model="itemTag"
                :tags="itemTags"
                :autocomplete-items="filteredItemTagsSuggestions"
                @tags-changed="onItemTagsChange"
                ></vue-tags-input>

            <table class="properties-table">
                <tbody>
                    <tr>
                        <td class="label" width="50%">Dragging</td>
                        <td class="value" width="50%">
                            <dropdown
                                :options="draggingOptions"
                                @selected="onItemDraggingChange"
                            >
                                {{ item.behavior.dragging | toPrettyDraggingOptionName }}
                            </dropdown>
                        </td>
                    </tr>
                    <tr v-if="item.behavior.dragging === 'dragndrop'">
                        <td class="label" width="50%">Drop to</td>
                        <td class="value" width="50%">
                            <ElementPicker
                                :editorId="editorId"
                                :element="item.behavior.dropTo"
                                :scheme-container="schemeContainer"
                                :useSelf="false"
                                :allowNone="true"
                                :inline="true"
                                :borderless="false"
                                :disabled="item.behavior.dragging !== 'dragndrop'"
                                @selected="onItemDraggingDropToSelected"
                                />
                        </td>
                    </tr>
                    <tr v-if="item.behavior.dragging === 'path'">
                        <td class="label" width="50%">Drag path</td>
                        <td class="value" width="50%">
                            <ElementPicker
                                :editorId="editorId"
                                :element="item.behavior.dragPath"
                                :scheme-container="schemeContainer"
                                :useSelf="false"
                                :allowNone="true"
                                :inline="true"
                                :borderless="false"
                                :disabled="item.behavior.dragging !== 'path'"
                                @selected="onItemDraggingPathSelected"
                                />
                        </td>
                    </tr>
                    <tr v-if="item.behavior.dragging === 'path'">
                        <td class="label" width="50%">Align to path while dragging</td>
                        <td class="value" width="50%">
                            <input class="checkbox" type="checkbox" :checked="item.behavior.dragPathAlign" @input="onItemDragAlignChange($event.target.checked)"/>
                        </td>
                    </tr>
                    <tr v-if="item.behavior.dragging === 'path'">
                        <td class="label" width="50%">Drag rotation</td>
                        <td class="value" width="50%">
                            <NumberTextfield :value="item.behavior.dragPathRotation" @changed="onItemDragRotationChange"/>
                        </td>
                    </tr>
                </tbody>
            </table>
        </panel>

        <div class="hint" v-if="item.behavior.events.length === 0">There are no events defined for this item yet. Start by adding an event</div>

        <div class="behavior-container" :class="{extended: extended}" v-for="(event, eventIndex) in item.behavior.events">
            <div class="behavior-event behavior-action-droppable"
                :data-event-index="eventIndex"
                >
                <div class="behavior-menu">
                    <span class="link icon-collapse" @click="toggleBehaviorCollapse(eventIndex)">
                        <i class="fas" :class="[eventMetas[eventIndex] && eventMetas[eventIndex].collapsed?'fa-caret-right':'fa-caret-down']"/>
                    </span>
                </div>

                <dropdown
                    :options="eventOptions"
                    :auto-focus-search="isStandardEvent(event.event)"
                    @selected="onBehaviorEventSelected(eventIndex, arguments[0])"
                    :inline="true"
                    :borderless="true"
                    >
                    <span class="icon-event"><i class="fas fa-bell"></i></span>
                    <span v-if="isStandardEvent(event.event)">{{event.event | toPrettyEventName}}</span>
                    <input v-else :id="`custom-event-textfield-${item.id}-${eventIndex}`" class="custom-event-textfield" type="text" :value="event.event" @input="event.event = arguments[0].target.value"/>
                </dropdown>
            </div>


            <div v-if="! (eventMetas[eventIndex] && eventMetas[eventIndex].collapsed)">
                <div class="hint hint-small" v-if="event.actions.length === 0">This event has no actions yet...</div>

                <div class="behavior-action-container behavior-drop-highlight" v-if="dragging.readyToDrop && dragging.dropTo.eventIndex === eventIndex && dragging.dropTo.actionIndex === 0 && (!event.actions || event.actions.length === 0)"
                    v-html="dragging.action">
                </div>
                <div v-for="(action, actionIndex) in event.actions"
                    class="behavior-action-droppable"
                    :data-event-index="eventIndex"
                    :data-action-index="actionIndex"
                    >
                    <div class="behavior-action-container behavior-drop-highlight" v-if="dragging.readyToDrop && dragging.dropTo.eventIndex === eventIndex && dragging.dropTo.actionIndex === actionIndex"
                        v-html="dragging.action">
                    </div>
                    <div class="behavior-action-container"
                        :id="`behavior-action-container-${item.id}-${eventIndex}-${actionIndex}`"
                        :class="{'disabled': !action.on, 'dragged': dragging.readyToDrop && eventIndex === dragging.eventIndex && actionIndex === dragging.actionIndex}"
                        >
                        <div class="icon-container">
                            <span class="link icon-delete" @click="removeAction(eventIndex, actionIndex)"><i class="fas fa-times"/></span>
                            <span class="link icon-move" @mousedown="onActionDraggerMouseDown($event, eventIndex, actionIndex)"><i class="fas fa-arrows-alt"/></span>
                            <span class="link icon-check" @click="toggleActionOnOff(eventIndex, actionIndex)">
                                <i v-if="action.on" class="fa-regular fa-square-check"></i>
                                <i v-else class="fa-regular fa-square"></i>
                            </span>
                        </div>
                        <div class="action-item">
                            <ElementPicker
                                :editorId="editorId"
                                :element="action.element"
                                :scheme-container="schemeContainer"
                                :self-item="item"
                                :inline="true"
                                :borderless="true"
                                @selected="onActionElementSelected(eventIndex, actionIndex, arguments[0])"
                                />
                        </div>
                        <div class="behavior-goto-element" title="Double click to jump to element" @dblclick="jumpToElement(action.element)">: </div>
                        <div class="action-method">
                            <dropdown
                                :key="action.element.item"
                                :options="createMethodSuggestionsForElement(action.element)"
                                @selected="onActionMethodSelected(eventIndex, actionIndex, arguments[0])"
                                :inline="true"
                                :borderless="true"
                                >
                                <span v-if="action.method === 'set'"><i class="fas fa-cog"></i> {{action.args.field | toPrettyPropertyName(action.element, item, schemeContainer)}}</span>
                                <span class="behavior-function" v-if="action.method !== 'set' && action.method !== 'sendEvent'">{{action.method | toPrettyMethod(action.element) }} </span>
                                <span class="behavior-function" v-if="action.method === 'sendEvent'"><i class="icon fas fa-play"></i> {{action.args.event}} </span>
                            </dropdown>
                        </div>
                        <span v-if="action.method !== 'set' && action.method !== 'sendEvent' && action.args && Object.keys(action.args).length > 0"
                            class="action-method-arguments-expand"
                            @click="showFunctionArgumentsEditor(action, eventIndex, actionIndex)"
                            title="Edit function arguments"
                            >{{action | toPrettyActionArgs(schemeContainer) }}</span>

                        <span v-if="action.method === 'set'" class="function-brackets"> = </span>

                        <SetArgumentEditor v-if="action.method === 'set'"
                            :key="`${action.id}-${action.args.field}`"
                            :editorId="editorId"
                            :argument-description="getArgumentDescriptionForElement(action.element, action.args.field)"
                            :argument-value="action.args.value"
                            :args="action.args"
                            @property-changed="onArgumentPropertyChangeForSet(eventIndex, actionIndex, arguments[0], arguments[1])"
                            />
                    </div>
                </div>

                <div class="behavior-action-container behavior-drop-highlight" v-if="dragging.readyToDrop && dragging.dropTo.eventIndex === eventIndex && dragging.dropTo.actionIndex > 0 && dragging.dropTo.actionIndex >= event.actions.length"
                    v-html="dragging.action">
                </div>

                <div class="behavior-event-operations">
                    <span class="btn btn-small btn-secondary" @click="addActionToEvent(eventIndex)">+ Action</span>
                    <span class="btn btn-small btn-secondary" @click="duplicateBehavior(eventIndex)">Duplicate</span>
                    <span class="btn btn-small btn-secondary" @click="copyEvent(eventIndex)">Copy Event</span>
                    <span class="btn btn-small btn-secondary" v-if="eventIndex > 0" @click="moveEventInOrder(eventIndex, eventIndex - 1)" title="Move event up"><i class="fas fa-caret-up"></i></span>
                    <span class="btn btn-small btn-secondary" v-if="eventIndex < item.behavior.events.length - 1" @click="moveEventInOrder(eventIndex, eventIndex + 1)" title="Move event down"><i class="fas fa-caret-down"></i></span>
                    <span class="btn btn-small btn-danger" @click="removeBehaviorEvent(eventIndex)">Delete</span>
                </div>
            </div>
        </div>

        <span class="btn btn-secondary" @click="addBehaviorEvent()">+ Event</span>
        <span class="btn btn-secondary" @click="copyAllEvents()">Copy all events</span>
        <span class="btn btn-secondary" @click="pasteEvents()">Paste events</span>

        <modal v-if="functionArgumentsEditor.shown"
            :title="`${functionArgumentsEditor.functionDescription.name} arguments`"
            @close="functionArgumentsEditor.shown = false"
            :width="functionArgumentsEditor.width"
            :use-mask="false"
            >
            <div v-if="functionArgumentsEditor.functionDescription.editorComponent">
                <component
                    :is="functionArgumentsEditor.functionDescription.editorComponent"
                    :editorId="editorId"
                    :args="functionArgumentsEditor.args"
                    @argument-changed="onFunctionArgumentsEditorChange"
                ></component>
            </div>
            <div v-else :style="{'max-width': `${functionArgumentsEditor.width}px`}">
                <p>{{ functionArgumentsEditor.functionDescription.description }}</p>
                <ArgumentsEditor
                    :editorId="editorId"
                    :argsDefinition="functionArgumentsEditor.functionDescription.args"
                    :args="functionArgumentsEditor.args"
                    :scheme-container="schemeContainer"
                    @argument-changed="onFunctionArgumentsEditorChange"
                />
            </div>
        </modal>

        <div ref="dragPreview" class="behavior-action-drag-preview">
            <i v-if="dragging.preview.elementIcon" :class="dragging.preview.elementIcon"></i>
            {{dragging.preview.elementName}} <span class="action-name-separator">:</span>
            <span v-if="dragging.preview.method">{{dragging.preview.method}}</span>
            <i class="fas fa-cog" v-if="dragging.preview.propertyName"></i>
            <span v-if="dragging.preview.propertyName">{{dragging.preview.propertyName}}</span>
        </div>
    </div>
</template>

<script>
import {forEach, map, mapObjectValues, filter, find, indexOf, uniq} from '../../../collections';

import shortid from 'shortid';
import VueTagsInput from '@johmun/vue-tags-input';
import utils from '../../../utils.js';
import Shape from '../items/shapes/Shape.js'
import Dropdown from '../../Dropdown.vue';
import NumberTextfield from '../../NumberTextfield.vue';
import Panel from '../Panel.vue';
import Functions from '../../../userevents/functions/Functions.js';
import {findItemEffectById, fieldPathToEffectData, getEffectArgumentDescription, isArgTypeSupportedInSetFunction, supportsAnimationForSetFunction} from '../../../userevents/functions/SetFunction';
import Events from '../../../userevents/Events.js';
import ElementPicker from '../ElementPicker.vue';
import {generateEnrichedElement} from '../ElementPicker.vue';
import SetArgumentEditor from './behavior/SetArgumentEditor.vue';
import ArgumentsEditor from '../ArgumentsEditor.vue';
import {createSettingStorageFromLocalStorage} from '../../../LimitedSettingsStorage';
import {textSlotProperties, getItemPropertyDescriptionForShape, DragType, coreItemPropertyTypes} from '../../../scheme/Item';
import { copyObjectToClipboard, getObjectFromClipboard } from '../../../clipboard.js';
import StoreUtils from '../../../store/StoreUtils.js';
import {COMPONENT_LOADED_EVENT, COMPONENT_FAILED, COMPONENT_DESTROYED} from '../items/shapes/Component.vue';
import EditorEventBus from '../EditorEventBus.js';
import { dragAndDropBuilder } from '../../../dragndrop';
import Modal from '../../Modal.vue';
import { getEffects } from '../../effects/Effects';


function byName(a, b) {
    const nameA = a.name.toUpperCase();
    const nameB = b.name.toUpperCase();
    if (nameA < nameB) { return -1; }
    if (nameA > nameB) { return 1; }
    return 0;
}

const standardItemEvents = Object.values(Events.standardEvents);
const standardItemEventIds = map(standardItemEvents, event => event.id);

const behaviorCollapseStateStorage = createSettingStorageFromLocalStorage('behavior-collapse', 400);

function sanitizeAction(action) {
    const newAction = {...action};
    delete newAction.id;
    return newAction;
}
function sanitizeEvent(event) {
    return {
        event: event.event,
        actions: map(event.actions, sanitizeAction)
    };
}

function createPrettyPropertyName(propertyPath, element, selfItem, schemeContainer) {
    let item = null;
    if (element === 'self') {
        item = selfItem;
    } else {
        item = schemeContainer.findFirstElementBySelector(element);
    }
    const coreProp = coreItemPropertyTypes[propertyPath];
    if (coreProp) {
        return coreProp.name;
    } else if (propertyPath.indexOf('shapeProps.') === 0) {
        if (item && item.shape) {
            const shape = Shape.find(item.shape);
            const shapeArgName = propertyPath.substr('shapeProps.'.length);
            if (shape && shape.args && shape.args.hasOwnProperty(shapeArgName)) {
                return shape.args[shapeArgName].name;
            } else if (shape.shapeType === 'standard' && Shape.standardShapeProps.hasOwnProperty(shapeArgName)) {
                return Shape.standardShapeProps[shapeArgName].name;
            }
        }
    } else if (propertyPath.indexOf('textSlots.') === 0) {
        const firstDotIdx = propertyPath.indexOf('.');
        const secondDotIdx = propertyPath.indexOf('.', firstDotIdx + 1);
        const textSlotName = propertyPath.substring(firstDotIdx + 1, secondDotIdx);
        const textSlotField = propertyPath.substring(secondDotIdx + 1);
        const fieldDescription = find(textSlotProperties, textSlotProperty => textSlotProperty.field === textSlotField);
        if (fieldDescription) {
            return `Text / ${textSlotName} / ${fieldDescription.name}`;
        }
    } else if (propertyPath.indexOf('effects.') === 0) {
        const firstDotIdx = propertyPath.indexOf('.');
        const secondDotIdx = propertyPath.indexOf('.', firstDotIdx + 1);
        const effectId = propertyPath.substring(firstDotIdx + 1, secondDotIdx);
        const argName = propertyPath.substring(secondDotIdx + 1);
        const effect = item && Array.isArray(item.effects) ? item.effects.find(effect => effect.id === effectId) : null;

        if (!effect) {
            return 'Missing effect';
        }
        const knownEffect = getEffects()[effect.effect];
        if (!knownEffect) {
            return 'Missing effect';
        }
        const argDef = knownEffect.args[argName];
        if (!argDef) {
            return 'Missing effect';
        }
        return `Effect / ${effect.name} / ${argDef.name}`;
    }
    return propertyPath;
}

export default {
    props: {
        editorId       : {type: String, required: true},
        item           : {type: Object},
        schemeContainer: {type: Object},
        extended       : { type: Boolean, default: false }
    },

    components: {Dropdown, ElementPicker, SetArgumentEditor, Panel, ArgumentsEditor, VueTagsInput, Modal, NumberTextfield},

    data() {
        const items = map(this.schemeContainer.getItems(), item => {return {id: item.id, name: item.name || 'Unnamed'}});
        items.sort(byName);


        const eventMetas = map(this.item.behavior.events, this.createBehaviorEventMeta);
        forEach(eventMetas, (meta, index) => {
            const collapsed = behaviorCollapseStateStorage.get(`${this.schemeContainer.scheme.id}/${this.item.id}/${index}`, 0);
            meta.collapsed = collapsed === 1 ? true: false;
        });

        const shape = Shape.find(this.item.shape);
        let shapeEvents = [];
        if (shape.getEvents) {
            shapeEvents = shape.getEvents(this.item).map(shapeEvent => shapeEvent.name);
        }

        const draggingOptions = [];
        forEach(DragType, (value) => draggingOptions.push(value));

        return {
            items: items,
            eventOptions: this.createEventOptions(),
            eventMetas: eventMetas,
            functionArgumentsEditor: {
                shown: false,
                width: 600,
                functionDescription: null,
                eventIndex: 0,
                actionIndex: 0,
                args: {}
            },
            itemTag: '',
            existingItemTags: map(this.schemeContainer.itemTags, tag => {return {text: tag}}),

            shapeEvents,
            dragging: {
                action: null,
                eventIndex: -1,
                actionIndex: -1,
                readyToDrop: false,
                preview: {
                    elementName: '',
                    elementIcon: '',
                    method: '',
                    propertyName: ''
                },
                dropTo: {
                    eventIndex: -1,
                    actionIndex: -1,
                }
            },

            draggingOptions
        };
    },

    methods: {
        updateItem(callback) {
            this.schemeContainer.updateItem(this.item.id, 'behavior.events', callback);
        },

        createBehaviorEventMeta(behaviorEvent) {
            return {
                collapsed: false
            };
        },

        onItemTagsChange(newTags) {
            this.$emit('item-field-changed', 'tags', map(newTags, tag => tag.text));
        },

        toggleBehaviorCollapse(eventIndex) {
            this.eventMetas[eventIndex].collapsed = !this.eventMetas[eventIndex].collapsed;
            behaviorCollapseStateStorage.save(`${this.schemeContainer.scheme.id}/${this.item.id}/${eventIndex}`, this.eventMetas[eventIndex].collapsed ? 1 : 0);
        },

        moveEventInOrder(srcIndex, dstIndex)  {
            this.updateItem(item => {
                if (dstIndex < 0 || dstIndex >= item.behavior.events.length) {
                    return;
                }

                let temp = item.behavior.events[srcIndex];
                item.behavior.events[srcIndex] = item.behavior.events[dstIndex];
                item.behavior.events[dstIndex] = temp;

                temp = this.eventMetas[srcIndex];
                this.eventMetas[srcIndex] = this.eventMetas[dstIndex];
                this.eventMetas[dstIndex] = temp;

                this.$forceUpdate();
            });
        },

        findElement(selector) {
            const elements = this.schemeContainer.findElementsBySelector(selector, this.item);
            if (elements.length > 0) {
                return elements[0];
            }
            return null;
        },

        createEventOptions() {
            let eventOptions = [];

            const shape = Shape.find(this.item.shape);
            if (shape) {

                const itemEvents = shape.getEvents(this.item);
                if (itemEvents.length > 500) {
                    itemEvents.length = 500;
                }
                eventOptions = standardItemEvents.concat(map(itemEvents, event => {return {id: event.name, name: event.name}}));
            }

            eventOptions.push({
                id: 'custom-event',
                name: 'Custom event ...'
            });
            return eventOptions;
        },

        createMethodSuggestionsForElement(element) {
            const item = this.findElement(element);
            if (!item) {
                return [];
            }

            const methods = [];

            forEach(Functions.main, (func, funcId) => {
                if (funcId !== 'set' && funcId !== 'sendEvent' && !funcId.startsWith('_')) {
                    let shouldAddMethod = true;

                    if (func.supportedShapes) {
                        let foundShape = false;
                        for (let i = 0; i < func.supportedShapes.length; i++) {
                            if (func.supportedShapes[i] === item.shape) {
                                foundShape = true;
                                break;
                            }
                        }
                        shouldAddMethod = foundShape;
                    }

                    if (shouldAddMethod) {
                        if (Array.isArray(func.menuOptions)) {
                            func.menuOptions.forEach(option => {
                                methods.push({
                                    method: funcId,
                                    name: option.name,
                                    args: option.args,
                                    iconClass: 'fas fa-running',
                                    description: option.description ? option.description : func.description
                                });
                            });
                        } else {
                            methods.push({
                                method: funcId,
                                name: func.name,
                                iconClass: 'fas fa-running',
                                description: func.description
                            });
                        }
                    }
                }
            });

            forEach(this.collectAllItemCustomEvents(item), customEvent => {
                if (item.shape === 'component' &&
                    (customEvent === COMPONENT_LOADED_EVENT || customEvent === COMPONENT_FAILED || customEvent === COMPONENT_DESTROYED)) {
                    return;
                }
                methods.push({
                    method: 'custom-event',
                    name: customEvent,
                    event: customEvent,
                    iconClass: 'fas fa-running'
                });
            });

            methods.sort((a,b) => {
                if (a.name < b.name) {
                    return -1;
                } else {
                    return 1;
                }
            });

            const properties = this.createSetFunctionPropertySuggestions(item);
            return methods.concat(properties);
        },

        createSetFunctionPropertySuggestions(item) {
            let properties = [];
            forEach(coreItemPropertyTypes, (arg, name) => {
                properties.push({
                    method: 'set',
                    name: arg.name ? arg.name : name,
                    fieldPath: name,
                    iconClass: 'fas fa-cog'
                });
            });

            const shape = Shape.find(item.shape);
            if (shape) {
                forEach(shape.args, (arg, argName) => {
                    if (isArgTypeSupportedInSetFunction(arg.type)) {
                        properties.push({
                            method: 'set',
                            name: arg.name,
                            fieldPath: `shapeProps.${argName}`,
                            iconClass: 'fas fa-cog'
                        });
                    }
                });
            }

            forEach(shape.getTextSlots(item), textSlot => {
                forEach(textSlotProperties, textSlotProperty => {
                    properties.push({
                        method: 'set',
                        name: `Text / ${textSlot.name} / ${textSlotProperty.name}`,
                        fieldPath: `textSlots.${textSlot.name}.${textSlotProperty.field}`,
                        iconClass: 'fas fa-cog'
                    });
                });
            });

            if (Array.isArray(item.effects)) {
                properties = properties.concat(this.createEffectPropertySuggestions(item.effects));
            }

            properties.sort((a,b) => {
                if (a.name < b.name) {
                    return -1;
                } else {
                    return 1;
                }
            });

            return properties;
        },

        /**
         * @param {Array<ItemEffect>} effects
         */
        createEffectPropertySuggestions(effects) {
            const properties = [];

            const knownEffects = getEffects();

            effects.forEach(effect => {
                const knownEffect = knownEffects[effect.effect];
                if (!knownEffect) {
                    return;
                }
                forEach(knownEffect.args, (arg, argName) => {
                    if (isArgTypeSupportedInSetFunction(arg.type)) {
                        properties.push({
                            method: 'set',
                            name: `Effect / ${effect.name} / ${arg.name}`,
                            fieldPath: `effects.${effect.id}.${argName}`,
                            iconClass: 'fa-solid fa-wand-magic-sparkles'
                        });
                    }
                });
            });
            return properties;
        },

        collectAllItemCustomEvents(item) {
            if (!item.behavior.events) {
                return [];
            }
            const filteredEvents = filter(item.behavior.events, event => {
                return !this.isStandardEvent(event.event);
            });

            return uniq(map(filteredEvents, event => event.event));
        },

        isStandardEvent(event) {
            return indexOf(standardItemEventIds, event) >= 0 || indexOf(this.shapeEvents, event) >= 0;
        },

        addBehaviorEvent() {
            this.updateItem(item => {
                if (!item.behavior.events) {
                    item.behavior.events = [];
                }
                const newEvent = {
                    id: shortid.generate(),
                    event: 'clicked',
                    actions: []
                };
                item.behavior.events.push(newEvent);
                this.eventMetas.push(this.createBehaviorEventMeta(newEvent));
                this.emitChangeCommited();
                this.$forceUpdate();
            });
        },

        copyAllEvents() {
            copyObjectToClipboard('behavior-events', map(this.item.behavior.events, sanitizeEvent)).then(() => {
                StoreUtils.addInfoSystemMessage(this.$store, 'Copied all events');
            });
        },

        copyEvent(eventIndex) {
            const event = this.item.behavior.events[eventIndex];
            copyObjectToClipboard('behavior-events', [sanitizeEvent(event)]).then(() => {
                const e = Events.standardEvents[event.event];
                const name = e ? e.name : event.event;
                StoreUtils.addInfoSystemMessage(this.$store, `Copied "${name}" event`);
            });
        },

        pasteEvents() {
            getObjectFromClipboard('behavior-events').then(events => {
                if (events && events.length > 0) {
                    this.updateItem(item => {
                        forEach(events, event => {
                            event.id = shortid.generate();
                            forEach(event.actions, action => {
                                action.id = shortid.generate();
                            });
                            item.behavior.events.push(event);
                        });
                        EditorEventBus.schemeChangeCommitted.$emit(this.editorId);
                    });
                }
            });
        },

        removeBehaviorEvent(eventIndex) {
            this.updateItem(item => {
                item.behavior.events.splice(eventIndex, 1);
                this.eventMetas.splice(eventIndex, 1)
                this.emitChangeCommited();
            });
        },

        onBehaviorEventSelected(eventIndex, eventOption) {
            this.updateItem(item => {
                if (eventOption.id === 'custom-event') {
                    item.behavior.events[eventIndex].event = 'Unknown event...';

                    this.$nextTick(() => {
                        const textfield = document.getElementById(`custom-event-textfield-${item.id}-${eventIndex}`);
                        if (textfield) {
                            textfield.focus();
                        }
                    });

                } else {
                    item.behavior.events[eventIndex].event = eventOption.id;
                }
                this.emitChangeCommited();
            });
        },

        addActionToEvent(eventIndex) {
            this.updateItem(item => {
                const event = item.behavior.events[eventIndex];
                if (!event.actions) {
                    event.actions = [];
                }

                let element = 'self';

                if (event.actions.length > 0) {
                    // picking element from the last action
                    element = event.actions[event.actions.length - 1].element;
                }
                event.actions.push({
                    id: shortid.generate(),
                    element,
                    method: 'show',
                    on: true,
                    args: mapObjectValues(Functions.main.show.args, arg => arg.value)
                });
                this.emitChangeCommited();
            });
        },

        removeAction(eventIndex, actionIndex) {
            this.updateItem(item => {
                item.behavior.events[eventIndex].actions.splice(actionIndex, 1);
                this.emitChangeCommited();
            });
        },

        onActionElementSelected(eventIndex, actionIndex, element) {
            this.updateItem(item => {
                item.behavior.events[eventIndex].actions[actionIndex].element = element;
                this.emitChangeCommited();
            });
        },

        onActionMethodSelected(eventIndex, actionIndex, methodOption) {
            this.updateItem(item => {
                const action = item.behavior.events[eventIndex].actions[actionIndex];
                if (!action) {
                    return;
                }
                if (methodOption.method === 'set') {
                    action.method = methodOption.method;
                    const args = {
                        field: methodOption.fieldPath,
                        value: '',
                        animated: false,
                        animationDuration: 0.2,
                        transition: 'ease-in-out',
                        inBackground: true
                    };

                    const element = this.findElement(action.element);
                    if (element) {
                        if (methodOption.fieldPath.startsWith('effects.')) {
                            const effectData = fieldPathToEffectData(methodOption.fieldPath);
                            if (effectData) {
                                const itemEffect = findItemEffectById(element, effectData.effectId);
                                if (itemEffect) {
                                    const effect = getEffects()[itemEffect.effect];
                                    const argDescriptor = effect.args[effectData.argName];
                                    if (effect && argDescriptor) {
                                        args.value = itemEffect.args[effectData.argName];
                                        args.animated = supportsAnimationForSetFunction(argDescriptor.type);
                                    }
                                }
                            }
                        } else {
                            const property = getItemPropertyDescriptionForShape(Shape.find(element.shape), methodOption.fieldPath);
                            if (property && supportsAnimationForSetFunction(property.type)) {
                                args.animated = true;
                            }
                            args.value = utils.getObjectProperty(element, methodOption.fieldPath);
                        }
                    }
                    action.args = args;
                } else if (methodOption.method === 'custom-event') {
                    action.method = 'sendEvent';
                    action.args = {event: methodOption.event};
                } else {
                    action.method = methodOption.method;
                    let optionArgs = methodOption.args || {};
                    action.args = {
                        ...this.getDefaultArgsForMethod(action, methodOption.method),
                        ...optionArgs
                    };
                    const elementPickerArgumentName = this.findFirstElementPickerArgument(methodOption.method);
                    if (elementPickerArgumentName) {
                        EditorEventBus.elementPick.requested.$emit(this.editorId, (element) => {
                            action.args[elementPickerArgumentName] = element;
                            this.emitChangeCommited();
                        });
                    }
                }
                this.emitChangeCommited();
            });
        },

        getDefaultArgsForMethod(action, method) {
            let functions = Functions.main;

            if (functions[method]) {
                const functionArgs = functions[method].args;
                if (functionArgs) {
                    const args = {};

                    forEach(functionArgs, (arg, argName) => {
                        args[argName] = arg.value;
                    });

                    return args;
                }
            }
            return {};
        },

        findFirstElementPickerArgument(method) {
            const functions = Functions.main;

            if (!functions[method]) {
                return null;
            }

            const functionArgs = functions[method].args;
            if (!functionArgs) {
                return null;
            }
            for (let argName in functionArgs) {
                if (functionArgs.hasOwnProperty(argName)) {
                    const arg = functionArgs[argName];
                    if (arg.type === 'element') {
                        return argName;
                    }
                }
            }
            return null;
        },

        getArgumentDescriptionForElement(element, propertyPath) {
            const entity = this.findElement(element);
            if (!entity) {
                return {type: 'string'};
            }

            if (propertyPath.startsWith('effects.')) {
                return getEffectArgumentDescription(entity, propertyPath);
            }

            if (entity && entity.shape) {
                const descriptor = getItemPropertyDescriptionForShape(Shape.find(entity.shape), propertyPath);
                if (descriptor) {
                    return descriptor;
                }
            }

            return {type: 'string'};
        },

        onArgumentPropertyChangeForSet(eventIndex, actionIndex, property, value) {
            this.updateItem(item => {
                item.behavior.events[eventIndex].actions[actionIndex].args[property] = value;
                const propertyName = item.behavior.events[eventIndex].actions[actionIndex].args.field;
                this.emitChangeCommited(`${item.id}.behavior.events.${eventIndex}.actions.${actionIndex}.args.${propertyName}`);
            });
        },

        duplicateBehavior(eventIndex) {
            this.updateItem(item => {
                const newEvent = utils.clone(item.behavior.events[eventIndex]);
                newEvent.id = shortid.generate();
                forEach(newEvent.actions, action => {
                    action.id = shortid.generate();
                });
                item.behavior.events.push(newEvent);
                this.eventMetas.push(this.createBehaviorEventMeta(newEvent));
                this.emitChangeCommited();
                this.$forceUpdate();
            });
        },

        emitChangeCommited(affinityId) {
            EditorEventBus.item.changed.specific.$emit(this.editorId, this.item.id);
            EditorEventBus.schemeChangeCommitted.$emit(this.editorId, affinityId);
        },

        showFunctionArgumentsEditor(action, eventIndex, actionIndex) {
            let functionDescription = Functions.main[action.method];

            if (!functionDescription) {
                functionDescription = {
                    args: {}
                };
            }
            this.functionArgumentsEditor.functionDescription = functionDescription;
            this.functionArgumentsEditor.args = action.args;
            this.functionArgumentsEditor.eventIndex = eventIndex;
            this.functionArgumentsEditor.actionIndex = actionIndex;
            if (functionDescription.editorComponent) {
                this.functionArgumentsEditor.width = 900;
            } else {
                this.functionArgumentsEditor.width = 600;
            }
            this.functionArgumentsEditor.shown = true;
        },

        onFunctionArgumentsEditorChange(argName, value) {
            this.updateItem(item => {
                const eventIndex = this.functionArgumentsEditor.eventIndex
                const actionIndex = this.functionArgumentsEditor.actionIndex;

                if (eventIndex < item.behavior.events.length) {
                    const event = item.behavior.events[eventIndex];
                    if (actionIndex < event.actions.length) {
                        event.actions[actionIndex].args[argName] = value;
                    }
                }
                EditorEventBus.schemeChangeCommitted.$emit(this.editorId, `items.${item.id}.behavior.events.${eventIndex}.actions.${actionIndex}.args.${argName}`);
            });
        },
        prettyMethodName(method) {
            if (Functions.main[method]) {
                return Functions.main[method].name;
            }
            return method;
        },
        onActionDraggerMouseDown(originalEvent, eventIndex, actionIndex) {
            dragAndDropBuilder(originalEvent)
            .withDroppableClass('behavior-action-droppable')
            .withDraggedElement(this.$refs.dragPreview)
            .onDragStart(() => {
                let name = 'Drop here';
                // TODO refactor to use $ref
                const domActionContainer = document.getElementById(`behavior-action-container-${this.item.id}-${eventIndex}-${actionIndex}`);
                if (domActionContainer) {
                    name = domActionContainer.innerHTML;
                }
                this.dragging.action = name;

                const action = this.item.behavior.events[eventIndex].actions[actionIndex];
                const enrichedElement = generateEnrichedElement(action.element, this.schemeContainer);
                this.dragging.preview.elementName = enrichedElement.name;
                this.dragging.preview.elementIcon = enrichedElement.iconClass;

                if (action.method === 'set') {
                    this.dragging.preview.method = null;
                    this.dragging.preview.propertyName = createPrettyPropertyName(action.args.field, action.element, this.item, this.schemeContainer);
                } else {
                    this.dragging.preview.propertyName = null;
                    this.dragging.preview.method = this.prettyMethodName(action.method);
                }
                this.dragging.eventIndex = eventIndex;
                this.dragging.actionIndex = actionIndex;
                this.dragging.dropTo.eventIndex = -1;
                this.dragging.dropTo.actionIndex = -1;
            })
            .onDragOver((event, element, pageX, pageY) => {
                const dstEventIndex = parseInt(element.getAttribute('data-event-index'));
                const actionIndexAttr = element.getAttribute('data-action-index')
                if (!actionIndexAttr) {
                    this.onDragOverToEvent(dstEventIndex);
                } else {
                    const dstActionIndex = parseInt(actionIndexAttr);
                    this.onDragOverToAction(dstEventIndex, dstActionIndex, element, pageY);
                }
            })
            .onDone(() => {
                this.onDragEnd();
            })
            .build();
        },

        onActionDragStarted(eventIndex, actionIndex) {
            let name = 'Drop here';
            // TODO refactor to use $ref
            const domActionContainer = document.getElementById(`behavior-action-container-${this.item.id}-${eventIndex}-${actionIndex}`);
            if (domActionContainer) {
                name = domActionContainer.innerHTML;
            }
            this.dragging.action = name;

            this.dragging.eventIndex = eventIndex;
            this.dragging.actionIndex = actionIndex;
            this.dragging.dropTo.eventIndex = -1;
            this.dragging.dropTo.actionIndex = -1;
        },

        onDragOverToEvent(eventIndex) {
            this.dragging.dropTo.eventIndex = eventIndex;
            this.dragging.dropTo.actionIndex = 0;
            this.dragging.readyToDrop = !(this.dragging.eventIndex === eventIndex && this.dragging.actionIndex === 0);
        },

        onDragOverToAction(eventIndex, actionIndex, element, pageY) {
            this.dragging.dropTo.eventIndex = eventIndex;
            this.dragging.dropTo.actionIndex = actionIndex;

            const containerRect = element.getBoundingClientRect();
            const midLine = containerRect.top + containerRect.height / 2;
            const offsetToMid = pageY - midLine;
            if (offsetToMid > 0) {
                this.dragging.dropTo.actionIndex = actionIndex + 1;
            }
            let readyToDrop = true;

            if (this.dragging.eventIndex === this.dragging.dropTo.eventIndex) {
                if (this.dragging.actionIndex === this.dragging.dropTo.actionIndex || this.dragging.actionIndex === this.dragging.dropTo.actionIndex - 1) {
                    readyToDrop = false;
                }
            }
            this.dragging.readyToDrop = readyToDrop;
        },

        onDragEnd() {
            if (this.dragging.eventIndex >= 0 && this.dragging.actionIndex >= 0 && this.dragging.dropTo.eventIndex >= 0 && this.dragging.dropTo.actionIndex >= 0) {
                this.moveAction(this.dragging.eventIndex, this.dragging.actionIndex, this.dragging.dropTo.eventIndex, this.dragging.dropTo.actionIndex);
            }
            this.resetDragging();
        },

        resetDragging() {
            this.dragging.action = null;
            this.dragging.eventIndex = -1;
            this.dragging.actionIndex = -1;
            this.dragging.readyToDrop = false;
            this.dragging.dropTo.eventIndex = -1;
            this.dragging.dropTo.actionIndex = -1;
        },

        moveAction(srcBehaviorIndex, srcActionIndex, dstBehaviorIndex, dstActionIndex) {
            this.updateItem(item => {
                if (srcBehaviorIndex === dstBehaviorIndex && srcActionIndex === dstActionIndex) {
                    return;
                }
                const action = this.item.behavior.events[srcBehaviorIndex].actions.splice(srcActionIndex, 1)[0];

                if (srcBehaviorIndex === dstBehaviorIndex && dstActionIndex > srcActionIndex) {
                    // since the item was removed from the same array, we need to adjust the new destination position in the array
                    dstActionIndex -= 1;
                }
                this.item.behavior.events[dstBehaviorIndex].actions.splice(dstActionIndex, 0, action);

                this.emitChangeCommited();
            });
        },

        jumpToElement(elementSelector) {
            const item = this.schemeContainer.findFirstElementBySelector(elementSelector);
            if (item) {
                this.$emit('jumped-to-item', item);
            }
        },

        toggleActionOnOff(eventIndex, actionIndex) {
            this.updateItem(item => {
                const action = item.behavior.events[eventIndex].actions[actionIndex];
                action.on = !action.on;
                this.$forceUpdate();
            });
        },

        onItemDraggingChange(option) {
            this.updateItem(item => {
                item.behavior.dragging = option.id;
                this.$forceUpdate();
                EditorEventBus.schemeChangeCommitted.$emit(this.editorId);
            });
        },

        onItemDraggingDropToSelected(element) {
            this.updateItem(item => {
                item.behavior.dropTo = element;
                this.$forceUpdate();
                EditorEventBus.schemeChangeCommitted.$emit(this.editorId);
            });
        },

        onItemDraggingPathSelected(element) {
            this.updateItem(item => {
                item.behavior.dragPath = element;
                this.$forceUpdate();
                EditorEventBus.schemeChangeCommitted.$emit(this.editorId);
            });
        },

        onItemDragAlignChange(aligned) {
            this.updateItem(item => {
                item.behavior.dragPathAlign = aligned;
                this.$forceUpdate();
                EditorEventBus.schemeChangeCommitted.$emit(this.editorId);
            });
        },

        onItemDragRotationChange(angle) {
            this.updateItem(item => {
                item.behavior.dragPathRotation = angle;
                this.$forceUpdate();
                EditorEventBus.schemeChangeCommitted.$emit(this.editorId);
            });
        }
    },

    filters: {
        toPrettyEventName(event) {
            if (Events.standardEvents[event]) {
                return Events.standardEvents[event].name;
            } else {
                return event;
            }
        },

        toPrettyMethod(method, element) {
            if (Functions.main[method]) {
                return Functions.main[method].name;
            } else {
                return method;
            }
        },

        toPrettyActionArgs(action, schemeContainer) {
            if (Functions.main[action.method]) {
                const func = Functions.main[action.method];
                if (func.argsToShortString) {
                    const text = func.argsToShortString(action.args, schemeContainer);
                    if (text.length > 100) {
                        return `( ${text.substring(0, 100)} ... )`;
                    }
                    return `( ${text} )`;
                }
            }
            return '( ... )';
        },

        toPrettyPropertyName(propertyPath, element, selfItem, schemeContainer) {
            return createPrettyPropertyName(propertyPath, element, selfItem, schemeContainer);
        },

        toPrettyDraggingOptionName(id) {
            const option = DragType[id];
            if (!option) {
                return DragType.none.name;
            }

            return option.name;
        }
    },

    computed: {
        filteredItemTagsSuggestions() {
            const lowerText = this.itemTag.toLowerCase();
            return this.existingItemTags.filter(tag => {
                return tag.text.toLowerCase().indexOf(lowerText) >= 0;
            });
        },
        itemTags() {
            return map(this.item.tags, tag => {return {text: tag}});
        },
    }
}
</script>