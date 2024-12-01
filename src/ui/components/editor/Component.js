import shortid from "shortid";
import myMath from "../../myMath";
import SchemeContainer, { createDefaultRectItem, getLocalBoundingBoxOfItems } from "../../scheme/SchemeContainer";
import StoreUtils from "../../store/StoreUtils";
import UserEventBus from "../../userevents/UserEventBus";
import EditorEventBus from "./EditorEventBus";
import { generateComponentGoBackButton } from "./items/shapes/Component.vue";
import { collectAndLoadAllMissingShapes } from "./items/shapes/ExtraShapes";

const VIEW_MODE = 'view';

/**
 * Loads
 * @param {SchemeContainer} schemeContainer
 * @param {UserEventBus} userEventBus
 * @param {Item} item
 * @param {Store} $store
 * @param {Function} compilerErrorCallback
 * @returns {Promise}
 */
export function loadAndMountExternalComponent(schemeContainer, userEventBus, item, $store, compilerErrorCallback) {
    if (!$store.state.apiClient || !$store.state.apiClient.getScheme) {
        return;
    }

    item.meta.componentSchemeContainer = null;
    item.meta.componentUserEventBus = null;
    item.meta.componentLoadFailed = false;

    return $store.state.apiClient.getScheme(item.shapeProps.schemeId)
    .then(schemeDetails => {
        if (!schemeDetails || !schemeDetails.scheme) {
            return Promise.reject('Empty document');
        }
        return collectAndLoadAllMissingShapes(schemeDetails.scheme.items, $store)
        .catch(err => {
            console.error(err);
            StoreUtils.addErrorSystemMessage($store, 'Failed to load shapes');
        })
        .then(() => {
            return schemeDetails;
        });
    })
    .then(schemeDetails => {
        const scheme = schemeDetails.scheme;
        const tempSchemeContainer = new SchemeContainer(scheme, schemeContainer.editorId, VIEW_MODE, $store.state.apiClient);
        const clonedItems = schemeContainer.cloneItemsPreservingNames(tempSchemeContainer.scheme.items);
        scheme.items = clonedItems;
        const componentSchemeContainer = new SchemeContainer(scheme, schemeContainer.editorId, VIEW_MODE, $store.state.apiClient, {
            onSchemeChangeCommitted: () => {}
        });
        componentSchemeContainer.prepareFrameAnimationsForItems();

        const componentUserEventBus = new UserEventBus(schemeContainer.editorId);
        const box = getLocalBoundingBoxOfItems(clonedItems);
        componentSchemeContainer.scheme.items.forEach(item => {
            item.area.x -= box.x;
            item.area.y -= box.y;
        });

        const w = Math.max(box.w, 0.00001);
        const h = Math.max(box.h, 0.00001);
        const scale = Math.min(item.area.w / w, item.area.h / h);
        const dx = (item.area.w - w * scale) / 2;
        const dy = (item.area.h - h * scale) / 2;

        const overlayRect = createDefaultRectItem();
        overlayRect.id = shortid.generate();
        overlayRect.area.x = 0;
        overlayRect.area.y = 0;
        overlayRect.area.w = item.area.w;
        overlayRect.area.h = item.area.h;
        overlayRect.selfOpacity = 0;
        overlayRect.meta = {isComponentContainer: true};
        overlayRect.name = 'Overlay container';

        const rectItem = createDefaultRectItem();
        rectItem.shape = 'dummy';
        rectItem.selfOpacity = 0;
        rectItem.id = shortid.generate();
        rectItem.meta = {isComponentContainer: true};
        rectItem.name = 'Scaled container';
        rectItem.area.x = dx;
        rectItem.area.y = dy;
        rectItem.area.w = w;
        rectItem.area.h = h;
        rectItem.area.px = 0;
        rectItem.area.py = 0;
        rectItem.area.sx = scale;
        rectItem.area.sy = scale;


        rectItem.meta.componentItemIdsForInit = componentSchemeContainer.indexUserEvents(componentUserEventBus, compilerErrorCallback);
        rectItem.meta.componentSchemeContainer = componentSchemeContainer;
        rectItem.meta.componentUserEventBus = componentUserEventBus;
        overlayRect._childItems = [rectItem];

        const backButton = generateComponentGoBackButton(item, overlayRect, schemeContainer.screenTransform);
        if (backButton) {
            overlayRect._childItems.push(backButton);
        }

        item._childItems = [overlayRect];

        const itemTransform = myMath.standardTransformWithArea(item.meta.transformMatrix, item.area);
        const nonIndexable = false;
        schemeContainer.reindexSpecifiedItems(item._childItems, itemTransform, item, item.meta.ancestorIds.concat([item.id]), nonIndexable);

        schemeContainer.indexUserEventsForItems(item._childItems, userEventBus, compilerErrorCallback);

        const parentShadowTransform = schemeContainer.shadowTransform ? schemeContainer.shadowTransform : myMath.identityMatrix();
        const shadowTransform = myMath.standardTransformWithArea(
            myMath.multiplyMatrices(parentShadowTransform, rectItem.meta.transformMatrix),
            rectItem.area
        );
        componentSchemeContainer.setShadowTransform(shadowTransform);

        EditorEventBus.item.changed.specific.$emit(schemeContainer.editorId, item.id);
    })
    .catch(err => {
        console.error(err);
        StoreUtils.addErrorSystemMessage($store, 'Failed to load component', 'scheme-component-load');
        item.meta.componentLoadFailed = true;
        item.meta.componentSchemeContainer = null;
        item.meta.componentUserEventBus = null;
        item._childItems = [];
        EditorEventBus.component.loadFailed.specific.$emit(schemeContainer.editorId, item.id, item);
    });
}
