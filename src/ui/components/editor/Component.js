import shortid from "shortid";
import myMath from "../../myMath";
import SchemeContainer, { createDefaultRectItem, getLocalBoundingBoxOfItems } from "../../scheme/SchemeContainer";
import StoreUtils from "../../store/StoreUtils";
import UserEventBus from "../../userevents/UserEventBus";
import EditorEventBus from "./EditorEventBus";
import { COMPONENT_FAILED, COMPONENT_LOADED_EVENT, generateComponentGoBackButton } from "./items/shapes/Component.vue";
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
        const clonedItems = tempSchemeContainer.cloneItemsPreservingNames(tempSchemeContainer.scheme.items);
        scheme.items = clonedItems;
        const box = getLocalBoundingBoxOfItems(scheme.items);
        // scheme.items.forEach(item => {
        //     item.area.x -= box.x;
        //     item.area.y -= box.y;
        // });

        const componentSchemeContainer = new SchemeContainer(scheme, schemeContainer.editorId, VIEW_MODE, $store.state.apiClient, {
            onSchemeChangeCommitted: () => {}
        });
        // linking to the same screen transform so that it is possible to zoom to items inside of component
        componentSchemeContainer.screenTransform = schemeContainer.screenTransform;
        componentSchemeContainer.screenSettings = schemeContainer.screenSettings;
        componentSchemeContainer.prepareFrameAnimationsForItems();

        componentSchemeContainer.scheme.items.forEach(componentRootItem => {
            componentRootItem.meta.getParentEnvironment = () => {
                return {
                    item,
                    schemeContainer,
                    userEventBus
                };
            }
        });

        const componentUserEventBus = new UserEventBus(schemeContainer.editorId);

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
        overlayRect.name = 'Overlay container';
        // overlayRect.clip = true;

        const scaledContainer = createDefaultRectItem();
        scaledContainer.shape = 'none';
        scaledContainer.selfOpacity = 0;
        scaledContainer.id = shortid.generate();
        scaledContainer.name = 'Scaled container';
        scaledContainer.area.x = dx;
        scaledContainer.area.y = dy;
        scaledContainer.area.w = w;
        scaledContainer.area.h = h;
        scaledContainer.area.px = 0;
        scaledContainer.area.py = 0;
        scaledContainer.area.sx = scale;
        scaledContainer.area.sy = scale;

        const displacementContainer = createDefaultRectItem();
        displacementContainer.shape = 'none';
        displacementContainer.selfOpacity = 0;
        displacementContainer.id = shortid.generate();
        displacementContainer.name = 'Displacement container';
        displacementContainer.area.x = -box.x;
        displacementContainer.area.y = -box.y;
        displacementContainer.area.w = box.w;
        displacementContainer.area.h = box.h;
        displacementContainer.area.px = 0;
        displacementContainer.area.py = 0;
        displacementContainer.area.sx = 1;
        displacementContainer.area.sy = 1;


        scaledContainer._childItems = [displacementContainer];
        overlayRect._childItems = [scaledContainer];


        displacementContainer.meta.componentItemIdsForInit = componentSchemeContainer.indexUserEvents(componentUserEventBus, compilerErrorCallback);
        displacementContainer.meta.componentSchemeContainer = componentSchemeContainer;
        displacementContainer.meta.componentUserEventBus = componentUserEventBus;

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
        const shadowTransform = myMath.multiplyMatrices(myMath.standardTransformWithArea(
            myMath.multiplyMatrices(parentShadowTransform, scaledContainer.meta.transformMatrix),
            scaledContainer.area
        ), myMath.translationMatrix(-box.x, -box.y));

        componentSchemeContainer.setShadowTransform(shadowTransform);

        EditorEventBus.item.changed.specific.$emit(schemeContainer.editorId, item.id);
        userEventBus.emitItemEvent(item.id, COMPONENT_LOADED_EVENT);

        return {
            schemeContainer: componentSchemeContainer,
            userEventBus: componentUserEventBus,
        };
    })
    .catch(err => {
        console.error(err);
        StoreUtils.addErrorSystemMessage($store, 'Failed to load component', 'scheme-component-load');
        item.meta.componentLoadFailed = true;
        item.meta.componentSchemeContainer = null;
        item.meta.componentUserEventBus = null;
        item._childItems = [];
        EditorEventBus.component.loadFailed.specific.$emit(schemeContainer.editorId, item.id, item);
        userEventBus.emitItemEvent(item.id, COMPONENT_FAILED);
    });
}

/**
 *
 * @param {Item} item
 * @returns
 */
export function findLoadedComponentEnvironment(item) {
    if (!Array.isArray(item._childItems) || item._childItems.length < 1) {
        return;
    }
    const overlayRect = item._childItems[0];
    if (!Array.isArray(overlayRect._childItems) || overlayRect._childItems.length < 1) {
        return;
    }
    const scaledContainer = overlayRect._childItems[0];
    if (!Array.isArray(scaledContainer._childItems) || scaledContainer._childItems.length < 1) {
        return;
    }
    const displacementContainer = scaledContainer._childItems[0];
    if (!displacementContainer.meta.componentSchemeContainer || !displacementContainer.meta.componentUserEventBus) {
        return
    }


    return {
        schemeContainer: displacementContainer.meta.componentSchemeContainer,
        userEventBus: displacementContainer.meta.componentUserEventBus
    };
}