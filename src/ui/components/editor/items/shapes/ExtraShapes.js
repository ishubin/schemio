import StoreUtils from "../../../../store/StoreUtils";
import Shape from "./Shape";

export function registerExternalShapeGroup($store, shapeGroupId, shapeGroup) {
    //TODO validate shapeGroup JSON schema

    if (typeof shapeGroup !== 'object' || !Array.isArray(shapeGroup.shapes)) {
        throw new Error(`Invalid shape group in ${url}`);
    }

    const menuItems = [];
    
    shapeGroup.shapes.forEach(shapeDef => {
        const shapeId = `ext:${shapeDef.shapeConfig.id}:${shapeGroupId}`;
        Shape.registerRawShape(shapeId, shapeDef.shapeConfig);

        if (Array.isArray(shapeDef.shapeConfig.menuItems)) {
            shapeDef.shapeConfig.menuItems.forEach(menuItem => {
                menuItems.push({
                    id: shapeId,
                    ...menuItem
                });
            });
        }
    });

    StoreUtils.registerExtraShapeGroup($store, {
        id: shapeGroupId,
        name: shapeGroup.group,
        items: menuItems
    });
}