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
    }
};

export default EditorEventBus;