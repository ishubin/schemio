import Vue from 'vue';
import {Logger} from '../../logger';

const log = new Logger('EditorEventBus');

const bus = new Vue({});

function generateEvent(editorId, eventName, args) {
    let fullEvent = editorId + '/' + eventName;
    if (args && args.length > 0) {
        return fullEvent + '/' + args.join('/');
    }
    return fullEvent;
}

function $on(editorId, eventName, args, callback) {
    bus.$on(generateEvent(editorId, eventName, args), callback);
}
function $off(editorId, eventName, args, callback) {
    bus.$off(generateEvent(editorId, eventName, args), callback);
}
function $emit(editorId, eventName, eventArgs, ...emitArgs) {
    if (!editorId) {
        throw new Error('editorId should be specified, got: ', editorId);
    }
    const fullEventName = generateEvent(editorId, eventName, eventArgs);
    log.infoEvent(fullEventName, emitArgs);
    bus.$emit(fullEventName, ...emitArgs);
}

const EditorEventBus = {
    schemeChangeCommitted: {
        $on: (editorId, callback) => $on(editorId, 'scheme-change-committed', [], callback),
        $off: (editorId, callback) => $off(editorId, 'scheme-change-committed', [], callback),
        $emit: (editorId, affinityId) => $emit(editorId, 'scheme-change-committed', [], affinityId),
    },

    item: {
        selected: {
            any: {
                $on: (editorId, callback) => $on(editorId, 'any-item-selected', [], callback),
                $off: (editorId, callback) => $off(editorId, 'any-item-selected', [], callback),
                $emit: (editorId, itemId) => $emit(editorId, 'any-item-selected', [], itemId),
            },
            specific: {
                $emit: (editorId, itemId) => EditorEventBus.item.selected.any.$emit(editorId, itemId)
            }
        },
        deselected: {
            any: {
                $on: (editorId, callback) => $on(editorId, 'any-item-deselected', [], callback),
                $off: (editorId, callback) => $off(editorId, 'any-item-deselected', [], callback),
                $emit: (editorId, itemId) => $emit(editorId, 'any-item-deselected', [], itemId),
            },
            specific: {
                $emit: (editorId, itemId) => EditorEventBus.item.deselected.any.$emit(editorId, itemId)
            }
        },
        clicked: {
            any: {
                $on: (editorId, callback) => $on(editorId, 'any-item-clicked', [], callback),
                $off: (editorId, callback) => $off(editorId, 'any-item-clicked', [], callback),
                $emit: (editorId, item) => $emit(editorId, 'any-item-clicked', [], item),
            }
        },
        changed: {
            any: {
                $on: (editorId, callback) => $on(editorId, 'any-item-changed', [], callback),
                $off: (editorId, callback) => $off(editorId, 'any-item-changed', [], callback),
                $emit: (editorId, itemId, propertyPath) => $emit(editorId, 'any-item-changed', [], itemId, propertyPath),
            },
            specific: {
                $on: (editorId, itemId, callback) => $on(editorId, 'item-changed', [itemId], callback),
                $off: (editorId, itemId, callback) => $off(editorId, 'item-changed', [itemId], callback),
                $emit: (editorId, itemId, propertyPath) => {
                    EditorEventBus.item.changed.any.$emit(editorId, itemId, propertyPath);
                    $emit(editorId, 'item-changed', [itemId], itemId, propertyPath);
                }
            },
        },
        linksShowRequested: {
            any: {
                $on: (editorId, callback) => $on(editorId, 'item-links-show-requested', [], callback),
                $off: (editorId, callback) => $off(editorId, 'item-links-show-requested', [], callback),
                $emit: (editorId, item) => $emit(editorId, 'item-links-show-requested', [], item),
            }
        }
    },

    textSlot: {
        triggered: {
            any: {
                $on: (editorId, callback) => $on(editorId, 'any-text-slot-triggered', [], callback),
                $off: (editorId, callback) => $off(editorId, 'any-text-slot-triggered', [], callback),
                $emit: (editorId, item, slotName, area, markupDisabled, creatingNewItem) => {
                    $emit(editorId, 'any-text-slot-triggered', [], item, slotName, area, markupDisabled, creatingNewItem);
                }
            },
            specific: {
                $on: (editorId, itemId, callback) => $on(editorId, 'text-slot-triggered', [itemId], callback),
                $off: (editorId, itemId, callback) => $off(editorId, 'text-slot-triggered', [itemId], callback),
                $emit: (editorId, item, slotName, area, markupDisabled, creatingNewItem) => {
                    EditorEventBus.textSlot.triggered.any.$emit(editorId, item, slotName, area, markupDisabled, creatingNewItem);
                    $emit(editorId, 'text-slot-triggered', [item.id], item, slotName, area, markupDisabled, creatingNewItem);
                }
            },
        },
        canceled: {
            any: {
                $on: (editorId, callback) => $on(editorId, 'any-text-slot-canceled', [], callback),
                $off: (editorId, callback) => $off(editorId, 'any-text-slot-canceled', [], callback),
                $emit: (editorId, item, slotName) => {
                    $emit(editorId, 'any-text-slot-canceled', [], item, slotName);
                }
            },
            specific: {
                $on: (editorId, itemId, callback) => $on(editorId, 'text-slot-canceled', [itemId], callback),
                $off: (editorId, itemId, callback) => $off(editorId, 'text-slot-canceled', [itemId], callback),
                $emit: (editorId, item, slotName) => {
                    EditorEventBus.textSlot.canceled.any.$emit(editorId, item, slotName);
                    $emit(editorId, 'text-slot-canceled', [item.id], item, slotName);
                }
            },
        },
        moved: {
            $on: (editorId, callback) => $on(editorId, 'text-slot-moved', [], callback),
            $off: (editorId, callback) => $off(editorId, 'text-slot-moved', [], callback),
            $emit: (editorId, item, slotName, destinationSlotName) => {
                $emit(editorId, 'text-slot-moved', [], item, slotName, destinationSlotName);
            }
        }
    },

    inPlaceTextEditor: {
        created: {
            $on: (editorId, callback) => $on(editorId, 'in-place-text-editor-created', [], callback),
            $off: (editorId, callback) => $off(editorId, 'in-place-text-editor-created', [], callback),
            $emit: (editorId, editor) => {
                $emit(editorId, 'in-place-text-editor-created', [], editor);
            }
        }
    },

    void: {
        clicked: {
            $on: (editorId, callback) => $on(editorId, 'void-clicked', [], callback),
            $off: (editorId, callback) => $off(editorId, 'void-clicked', [], callback),
            $emit: (editorId) => $emit(editorId, 'void-clicked', []),
        },
        doubleClicked: {
            $on: (editorId, callback) => $on(editorId, 'void-double-clicked', [], callback),
            $off: (editorId, callback) => $off(editorId, 'void-double-clicked', [], callback),
            $emit: (editorId, x, y, mx, my) => $emit(editorId, 'void-double-clicked', [], x, y, mx, my),
        }
    },

    component:{
        loadRequested: {
            any: {
                $on: (editorId, callback) => $on(editorId, 'any-component-load-requested', [], callback),
                $off: (editorId, callback) => $off(editorId, 'any-component-load-requested', [], callback),
                $emit: (editorId, item) => $emit(editorId, 'any-component-load-requested', [], item),
            },

            specific: {
                $on: (editorId, itemId, callback) => $on(editorId, 'component-load-requested', [itemId], callback),
                $off: (editorId, itemId, callback) => $off(editorId, 'component-load-requested', [itemId], callback),
                $emit: (editorId, itemId, item) => {
                    EditorEventBus.component.loadRequested.any.$emit(editorId, item);
                    $emit(editorId, 'component-load-requested', [itemId], item);
                }
            },
        },

        loadFailed: {
            any: {
                $on: (editorId, callback) => $on(editorId, 'any-component-load-failed', [], callback),
                $off: (editorId, callback) => $off(editorId, 'any-component-load-failed', [], callback),
                $emit: (editorId, item) => $emit(editorId, 'any-component-load-failed', [], item),
            },

            specific: {
                $on: (editorId, itemId, callback) => $on(editorId, 'component-load-failed', [itemId], callback),
                $off: (editorId, itemId, callback) => $off(editorId, 'component-load-failed', [itemId], callback),
                $emit: (editorId, itemId, item) => {
                    EditorEventBus.component.loadFailed.any.$emit(editorId, item);
                    $emit(editorId, 'component-load-failed', [itemId], item);
                }
            },
        },

        mounted: {
            any: {
                $on: (editorId, callback) => $on(editorId, 'any-component-mounted', [], callback),
                $off: (editorId, callback) => $off(editorId, 'any-component-mounted', [], callback),
                $emit: (editorId, item) => $emit(editorId, 'any-component-mounted', [], item),
            },

            specific: {
                $on: (editorId, itemId, callback) => $on(editorId, 'component-mounted', [itemId], callback),
                $off: (editorId, itemId, callback) => $off(editorId, 'component-mounted', [itemId], callback),
                $emit: (editorId, itemId, item) => {
                    EditorEventBus.component.mounted.any.$emit(editorId, item);
                    $emit(editorId, 'component-mounted', [itemId], item);
                }
            },
        },
    },

    zoomToAreaRequested: {
        $on: (editorId, callback) => $on(editorId, 'zoom-to-area-requested', [], callback),
        $off: (editorId, callback) => $off(editorId, 'zoom-to-area-requested', [], callback),
        $emit: (editorId, area, isAnimated) => $emit(editorId, 'zoom-to-area-requested', [], area, isAnimated),
    },

    elementPick: {
        requested: {
            $on: (editorId, callback) => $on(editorId, 'element-pick-requested', [], callback),
            $off: (editorId, callback) => $off(editorId, 'element-pick-requested', [], callback),
            $emit: (editorId, pickCallback) => $emit(editorId, 'element-pick-requested', [], pickCallback),
        },
        canceled: {
            $on: (editorId, callback) => $on(editorId, 'element-pick-canceled', [], callback),
            $off: (editorId, callback) => $off(editorId, 'element-pick-canceled', [], callback),
            $emit: (editorId) => $emit(editorId, 'element-pick-canceled', []),
        },
    },

    screenTransformUpdated: {
        $on: (editorId, callback) => $on(editorId, 'screen-transform-updated', [], callback),
        $off: (editorId, callback) => $off(editorId, 'screen-transform-updated', [], callback),
        $emit: (editorId, screenTransform) => $emit(editorId, 'screen-transform-updated', [], screenTransform),
    }
};

export default EditorEventBus;