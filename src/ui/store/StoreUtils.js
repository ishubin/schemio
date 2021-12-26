/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import forEach from 'lodash/forEach';
import Shape from '../components/editor/items/shapes/Shape';
import { worldScalingVectorOnItem } from '../scheme/SchemeContainer';
import '../typedef';

export default {
    setItemControlPoints(store, item) {
        const shape = Shape.find(item.shape);
        if (shape && shape.controlPoints) {
            const controlPoints = shape.controlPoints.make(item);

            // since item control points are supposed to be used by multi-item edit box
            // and it uses scale of 1 always
            // we need to convert positions of those points
            // by recalculating the complete scaling effect of the item relative to the world
            const scalingVector = worldScalingVectorOnItem(item);

            forEach(controlPoints, controlPoint => {
                controlPoint.x = controlPoint.x * scalingVector.x;
                controlPoint.y = controlPoint.y * scalingVector.y;
            });
            
            store.dispatch('setItemControlPoints', controlPoints);
        } else {
            this.clearItemControlPoints(store);
        }
    },

    clearItemControlPoints(store) {
        store.dispatch('clearItemControlPoints');
    },

    updateAllCurveEditPoints(store, item) {
        // the following action will reset all the curve eidt points in store
        store.dispatch('setCurveEditItem', item);
    },
    updateCurveEditPoint(store, item, pointId, point) {
        store.dispatch('updateCurveEditPoint', {item, pointId, point });
    },
    toggleCurveEditPointSelection(store, pointId, inclusive) {
        store.dispatch('toggleCurveEditPointSelection', { pointId, inclusive });
    },
    resetCurveEditPointSelection(store) {
        store.dispatch('resetCurveEditPointSelection');
    },
    selectCurveEditPoint(store, pointId, inclusive) {
        store.dispatch('selectCurveEditPoint', { pointId, inclusive });
    },
    getCurveEditPoints(store) {
        return store.state.curveEditing.points;
    },

    setMultiSelectBox(store, box) {
        store.dispatch('setMultiSelectBox', box);
    },

    setSelectedConnectorPath(store, path) {
        store.dispatch('setSelectedConnectorPath', path);
    },

    /**
     * 
     * @param {*} store 
     * @param {ItemSnapper} snapper 
     */
    setItemSnapper(store, snapper) {
        store.dispatch('setItemSnapper', snapper);
    },

    clearItemSnappers(store) {
        store.dispatch('clearItemSnappers');
    },

    setAutoRemount(store, shouldAutoRemount) {
        store.dispatch('setAutoRemount', shouldAutoRemount);
    },

    setShowPivot(store, show) {
        store.dispatch('setShowPivot', show);
    },

    setShowClickableMarkers(store, show) {
        store.dispatch('setShowClickableMarkers', show);
    },

    proposeConnectorDestinationItems(store, connectorItemId, mx, my) {
        store.dispatch('proposeConnectorDestinationItems', {connectorItemId, mx, my});
    },

    disableProposeConnectorDestinationItems(store) {
        store.dispatch('disableProposeConnectorDestinationItems');
    },

    addInfoSystemMessage(store, message, id) {
        store.dispatch('addSystemMessage', { status: 'info', message, id })
    },

    addErrorSystemMessage(store, message, id) {
        store.dispatch('addSystemMessage', { status: 'error', message, id })
    },

    removeSystemMessage(store, id) {
        store.dispatch('removeSystemMessage', id);
    },

    startAnimationEditor(store, framePlayer) {
        store.dispatch('startAnimationEditor', framePlayer);
    },

    setAnimationEditorRecording(store, isRecording) {
        store.dispatch('setAnimationEditorRecording', isRecording);
    },

    setDefaultConnectorSmoothing(store, smoothing) {
        store.dispatch('setDefaultConnectorSmoothing', smoothing);
    }
}