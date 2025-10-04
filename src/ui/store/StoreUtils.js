/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import {forEach} from '../collections';
import Shape from '../components/editor/items/shapes/Shape';
import { worldScalingVectorOnItem } from '../scheme/ItemMath';
import '../typedef';

export default {
    /**
     * @param {*} store
     * @param {Item} item
     */
    setItemControlPoints(store, item) {
        // For templated items we don't want users to allow editing of shapes with control points
        if (item.meta.templated && item.meta.templateRootId) {
            this.clearItemControlPoints(store);
            return;
        }
        const shape = Shape.find(item.shape);
        if (shape && shape.controlPoints) {
            const controlPoints = shape.controlPoints.make(item);

            // since item control points are supposed to be used by edit box
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

    setSelectedConnector(store, item) {
        const path = item ? Shape.find(item.shape).computeOutline(item) : null;
        store.dispatch('setSelectedConnectorWithPath', {item, path});
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

    toggleAutoRemount(store) {
        store.dispatch('toggleAutoRemount');
    },

    togglePivot(store) {
        store.dispatch('togglePivot');
    },

    toggleItemDetailMarkers(store) {
        store.dispatch('toggleItemDetailMarkers');
    },

    proposeConnectorDestinationItems(store, connectorItemId, mx, my, primaryShapeId) {
        store.dispatch('proposeConnectorDestinationItems', {connectorItemId, mx, my, primaryShapeId});
    },

    disableProposeConnectorDestinationItems(store) {
        store.dispatch('disableProposeConnectorDestinationItems');
    },

    addInfoSystemMessage(store, message, id, iconClass = null) {
        store.dispatch('addSystemMessage', { status: 'info', message, id, iconClass });
    },

    addErrorSystemMessage(store, message, id, iconClass = null) {
        store.dispatch('addSystemMessage', { status: 'error', message, id, iconClass });
    },

    removeSystemMessage(store, id) {
        store.dispatch('removeSystemMessage', id);
    },

    setDefaultConnectorSmoothing(store, smoothing) {
        store.dispatch('setDefaultConnectorSmoothing', smoothing);
    },

    copyItemStyle(store, item) {
        store.dispatch('copyItemStyle', item);
    },

    // used in connecting state and set the current connector item that is being created
    setCurrentConnector(store, item) {
        store.dispatch('setCurrentConnector', item)
    },

    addArtPack(store, artPackId, artPack) {
        store.dispatch('addArtPack', {artPack, artPackId});
    },

    removeArtPack(store, artPackId) {
        store.dispatch('removeArtPack', artPackId);
    },

    registerShapeGroupId(store, shapeGroupId) {
        store.dispatch('registerShapeGroupId', shapeGroupId);
    }
}