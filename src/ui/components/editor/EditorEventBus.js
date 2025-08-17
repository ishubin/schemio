// const Emitter = require('tiny-emitter');

import Emitter from 'tiny-emitter';

import {Logger} from '../../logger';

const log = new Logger('EditorEventBus');

const bus = new Emitter();

function generateEvent(editorId, eventName, args) {
    let fullEvent = editorId + '/' + eventName;
    if (args && args.length > 0) {
        return fullEvent + '/' + args.join('/');
    }
    return fullEvent;
}

function $on(editorId, eventName, args, callback) {
    if (!editorId) {
        throw new Error('editorId should be specified, got: ', editorId);
    }
    bus.on(generateEvent(editorId, eventName, args), callback);
}
function $off(editorId, eventName, args, callback) {
    if (!editorId) {
        throw new Error('editorId should be specified, got: ', editorId);
    }
    bus.off(generateEvent(editorId, eventName, args), callback);
}
function $emit(editorId, eventName, eventArgs, ...emitArgs) {
    if (!editorId) {
        throw new Error('editorId should be specified, got: ', editorId);
    }
    const fullEventName = generateEvent(editorId, eventName, eventArgs);
    log.infoEvent(fullEventName, emitArgs);
    bus.emit(fullEventName, ...emitArgs);
}

const EditorEventBus = {
    // this is used outside of Schemio core code
    custom: {
        $on: (editorId, eventName, callback) => $on(editorId, `custom-${eventName}`, [], callback),
        $off: (editorId, eventName, callback) => $off(editorId, `custom-${eventName}`, [], callback),
        $emit: (editorId, eventName, ...args) => $emit(editorId, `custom-${eventName}`, [], ...args),
    },
    schemeChangeCommitted: {
        $on: (editorId, callback) => $on(editorId, 'scheme-change-committed', [], callback),
        $off: (editorId, callback) => $off(editorId, 'scheme-change-committed', [], callback),
        $emit: (editorId, affinityId) => $emit(editorId, 'scheme-change-committed', [], affinityId),
    },

    // emited when user clicks undo/redo when editing modified scheme in patch mode
    patchedSchemeUpdated: {
        $on: (editorId, callback) => $on(editorId, 'patched-scheme-updated', [], callback),
        $off: (editorId, callback) => $off(editorId, 'patched-scheme-updated', [], callback),
        $emit: (editorId, affinityId) => $emit(editorId, 'patched-scheme-updated', [], affinityId),
    },

    schemeRebased: {
        $on: (editorId, callback) => $on(editorId, 'scheme-rebased', [], callback),
        $off: (editorId, callback) => $off(editorId, 'scheme-rebased', [], callback),
        $emit: (editorId, scheme) => $emit(editorId, 'scheme-rebased', [], scheme),
    },

    item: {
        custom: {
            $on: (eventName, editorId, itemId, callback) => $on(editorId, eventName, [itemId], callback),
            $off: (eventName, editorId, itemId, callback) => $off(editorId, eventName, [itemId], callback),
            $emit: (eventName, editorId, itemId, ...args) => $emit(editorId, eventName, [itemId], ...args),
        },
        userEvent: {
            $on: (editorId, callback) => $on(editorId, 'shape-custom-event', [], callback),
            $off: (editorId, callback) => $off(editorId,  'shape-custom-event', [], callback),
            $emit: (editorId, itemId, eventName, ...args) => {
                const allArgs = [itemId, eventName].concat(args);
                $emit(editorId,   'shape-custom-event', [], ...allArgs);
            },
        },
        selected: {
            any: {
                $on: (editorId, callback) => $on(editorId, 'any-item-selected', [], callback),
                $off: (editorId, callback) => $off(editorId, 'any-item-selected', [], callback),
                $emit: (editorId, itemId) => $emit(editorId, 'any-item-selected', [], itemId),
            },
            specific: {
                $on: (editorId, itemId, callback) => $on(editorId, 'item-selected', [itemId], callback),
                $off: (editorId, itemId, callback) => $off(editorId, 'item-selected', [itemId], callback),
                $emit: (editorId, itemId) => {
                    EditorEventBus.item.selected.any.$emit(editorId, itemId);
                    $emit(editorId, 'item-selected', [itemId]);
                }
            }
        },
        deselected: {
            any: {
                $on: (editorId, callback) => $on(editorId, 'any-item-deselected', [], callback),
                $off: (editorId, callback) => $off(editorId, 'any-item-deselected', [], callback),
                $emit: (editorId, itemId) => $emit(editorId, 'any-item-deselected', [], itemId),
            },
            specific: {
                $on: (editorId, itemId, callback) => $on(editorId, 'item-deselected', [itemId], callback),
                $off: (editorId, itemId, callback) => $off(editorId, 'item-deselected', [itemId], callback),
                $emit: (editorId, itemId) => {
                    EditorEventBus.item.deselected.any.$emit(editorId, itemId);
                    $emit(editorId, 'item-deselected', [itemId]);
                }
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
            $on: (editorId, callback) => $on(editorId, 'item-links-show-requested', [], callback),
            $off: (editorId, callback) => $off(editorId, 'item-links-show-requested', [], callback),
            $emit: (editorId, item, componentItem) => $emit(editorId, 'item-links-show-requested', [], item, componentItem),
        },
        templateSelected: {
            $on: (editorId, callback) => $on(editorId, 'item-template-selected', [], callback),
            $off: (editorId, callback) => $off(editorId,  'item-template-selected', [], callback),
            $emit: (editorId, templateRootItem, templateRef) => {
                $emit(editorId,   'item-template-selected', [], templateRootItem, templateRef);
            },
        },
        templateArgsUpdated: {
            specific: {
                $on: (editorId, itemId, callback) => $on(editorId, 'item-template-args-changed', [itemId], callback),
                $off: (editorId, itemId, callback) => $off(editorId, 'item-template-args-changed', [itemId], callback),
                $emit: (editorId, itemId) => {
                    $emit(editorId, 'item-template-args-changed', [itemId], itemId);
                }
            },
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
                $emit: (editorId, item, schemeContainer, userEventBus) => $emit(editorId, 'any-component-load-requested', [], item, schemeContainer, userEventBus),
            },

            specific: {
                $on: (editorId, itemId, callback) => $on(editorId, 'component-load-requested', [itemId], callback),
                $off: (editorId, itemId, callback) => $off(editorId, 'component-load-requested', [itemId], callback),
                $emit: (editorId, itemId, item, schemeContainer, userEventBus) => {
                    EditorEventBus.component.loadRequested.any.$emit(editorId, item, schemeContainer, userEventBus);
                    $emit(editorId, 'component-load-requested', [itemId], item, schemeContainer, userEventBus);
                }
            },
        },

        destroyed: {
            $on: (editorId, callback) => $on(editorId, 'component-destroyed', [], callback),
            $off: (editorId, callback) => $off(editorId, 'component-destroyed', [], callback),
            $emit: (editorId, schemeContainer, userEventBus) => $emit(editorId, 'component-destroyed', [], schemeContainer, userEventBus),
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
    },

    itemSurround: {
        created: {
            $on: (editorId, callback) => $on(editorId, 'item-surround-created', [], callback),
            $off: (editorId, callback) => $off(editorId, 'item-surround-created', [], callback),
            $emit: (editorId, item, boundingBox, padding) => $emit(editorId, 'item-surround-created', [], item, boundingBox, padding),
        }
    },

    behaviorPanel: {
        requested: {
            $on: (editorId, callback) => $on(editorId, 'behavior-panel-requested', [], callback),
            $off: (editorId, callback) => $off(editorId, 'behavior-panel-requested', [], callback),
            $emit: (editorId) => $emit(editorId, 'behavior-panel-requested', []),
        }
    },

    editBox: {
        updated: {
            $on: (editorId, callback) => $on(editorId, 'edit-box-items-updated', [], callback),
            $off: (editorId, callback) => $off(editorId, 'edit-box-items-updated', [], callback),
            $emit: (editorId) => $emit(editorId, 'edit-box-items-updated', []),
        },
        fillEnabled: {
            $on: (editorId, callback) => $on(editorId, 'edit-box-fill-enabled', [], callback),
            $off: (editorId, callback) => $off(editorId, 'edit-box-fill-enabled', [], callback),
            $emit: (editorId) => $emit(editorId, 'edit-box-fill-enabled', []),
        },
        fillDisabled: {
            $on: (editorId, callback) => $on(editorId, 'edit-box-fill-disabled', [], callback),
            $off: (editorId, callback) => $off(editorId, 'edit-box-fill-disabled', [], callback),
            $emit: (editorId) => $emit(editorId, 'edit-box-fill-disabled', []),
        },
        regenerate: {
            $on: (editorId, callback) => $on(editorId, 'edit-box-items-regenerate', [], callback),
            $off: (editorId, callback) => $off(editorId, 'edit-box-items-regenerate', [], callback),
            $emit: (editorId) => $emit(editorId, 'edit-box-items-regenerate', []),
        }
    },

    framePlayer: {
        prepared: {
            $on: (editorId, callback) => $on(editorId, 'frame-player-prepared', [], callback),
            $off: (editorId, callback) => $off(editorId, 'frame-player-prepared', [], callback),
            $emit: (editorId, framePlayerItem, frameCallbacks) => $emit(editorId, 'frame-player-prepared', [], framePlayerItem, frameCallbacks),
        }
    },

    searchKeywordUpdated: {
        $on: (editorId, callback) => $on(editorId, 'search-keyword-updated', [], callback),
        $off: (editorId, callback) => $off(editorId, 'search-keyword-updated', [], callback),
        $emit: (editorId, keyword) => $emit(editorId, 'search-keyword-updated', [], keyword),
    },

    searchedItemsToggled: {
        $on: (editorId, callback) => $on(editorId, 'searched-items-toggled', [], callback),
        $off: (editorId, callback) => $off(editorId, 'searched-items-toggled', [], callback),
        $emit: (editorId) => $emit(editorId, 'searched-items-toggled', []),
    },

    clickableMarkers: {
        toggled: {
            $on: (editorId, callback) => $on(editorId, 'clickable-markers-toggled', [], callback),
            $off: (editorId, callback) => $off(editorId, 'clickable-markers-toggled', [], callback),
            $emit: (editorId) => $emit(editorId, 'clickable-markers-toggled', []),
        }
    },

    colorControlToggled: {
        $on: (editorId, callback) => $on(editorId, 'color-control-toggled', [], callback),
        $off: (editorId, callback) => $off(editorId, 'color-control-toggled', [], callback),
        $emit: (editorId, expanded) => $emit(editorId, 'color-control-toggled', [], expanded),
    },

    editorResized: {
        $on: (editorId, callback) => $on(editorId, 'editor-resized', [], callback),
        $off: (editorId, callback) => $off(editorId, 'editor-resized', [], callback),
        $emit: (editorId) => $emit(editorId, 'editor-resized', []),
    },

    scriptLog: {
        $on: (editorId, callback) => $on(editorId, 'script-log', [], callback),
        $off: (editorId, callback) => $off(editorId, 'script-log', [], callback),
        $emit: (editorId, level, message) => $emit(editorId, 'script-log', [], level, message),
    },

    exportSchemeAsPicture: {
        $on: (editorId, callback) => $on(editorId, 'export-scheme-as-picture', [], callback),
        $off: (editorId, callback) => $off(editorId, 'export-scheme-as-picture', [], callback),
        $emit: (editorId, kind) => $emit(editorId, 'export-scheme-as-picture', [], kind),
    },

    connectorRequested: {
        $on: (editorId, callback) => $on(editorId, 'connector-requested', [], callback),
        $off: (editorId, callback) => $off(editorId, 'connector-requested', [], callback),
        $emit: (editorId, sourceItem, sourcePin, x, y) => $emit(editorId, 'connector-requested', [], sourceItem, sourcePin, x, y),
    }
};

export default EditorEventBus;