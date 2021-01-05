import Shape from '../components/editor/items/shapes/Shape';

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

    updateItemControlPoint(store, pointId, point) {
        store.dispatch('updateItemControlPoint', { pointId, point });
    },


    updateAllCurveEditPoints(store, item) {
        // the followinh action will reset all the curve eidt points in store
        store.dispatch('setCurveEditItem', item);
    },
    updateCurveEditPoint(store, pointId, point) {
        store.dispatch('updateCurveEditPoint', { pointId, point });
    }
}