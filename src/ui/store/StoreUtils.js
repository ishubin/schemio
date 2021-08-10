import Shape from '../components/editor/items/shapes/Shape';
import '../typedef';

export default {
    setItemControlPoints(store, item) {
        const shape = Shape.find(item.shape);
        if (shape && shape.controlPoints) {
            store.dispatch('setItemControlPoints', shape.controlPoints.make(item));
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
    updateCurveEditPoint(store, pointId, point) {
        store.dispatch('updateCurveEditPoint', { pointId, point });
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

    setItemCreatingAutoRemount(store, shouldAutoRemount) {
        store.dispatch('setItemCreatingAutoRemount', shouldAutoRemount);
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

    giveConsent(store) {
        store.dispatch('giveConsent');
    },

    startAnimationEditor(store, framePlayer) {
        store.dispatch('startAnimationEditor', framePlayer);
    }
}