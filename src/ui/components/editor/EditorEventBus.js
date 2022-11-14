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
    }
};

export default EditorEventBus;