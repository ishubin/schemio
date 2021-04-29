import myMath from "../../../../../myMath";

function makeHeaderHeightControlPoint(item) {
    return {
        x: item.area.w / 2,
        y: item.shapeProps.headerHeight
    }
}

function makeCornerRadiusControlPoint(item) {
    return {
        x: item.area.w - item.shapeProps.cornerRadius,
        y: 0
    };
}

export default {
    shapeConfig: {
        shapeType: 'standard',

        id: 'uml_object',

        menuItems: [{
            group: 'UML',
            name: 'Object',
            iconUrl: '/assets/images/items/uml-object.svg',
            item: {
                textSlots: {
                    title: {text: '<b>Object</b>', fontSize: 16, halign: 'center', valign: 'middle', padding: {top: 6}},
                    body: {text: '', fontSize: 14, font: 'Courier New', halign: 'left', valign: 'top'}
                },
            },
        }],

        computePath(item) {
            const W = item.area.w;
            const H = item.area.h;
            const R = Math.min(item.shapeProps.cornerRadius, item.area.w/4, item.area.h/4);

            const nameLineTop = Math.min(item.area.h, Math.max(item.shapeProps.headerHeight, item.shapeProps.cornerRadius));

            return `M ${W-R} ${H}  L ${R} ${H} a ${R} ${R} 0 0 1 ${-R} ${-R}  `
                +`L 0 ${R}  a ${R} ${R} 0 0 1 ${R} ${-R}  `
                +`L ${W-R} 0   a ${R} ${R} 0 0 1 ${R} ${R}  `
                +`L ${W} ${H-R}   a ${R} ${R} 0 0 1 ${-R} ${R} Z`
                +`M 0 ${nameLineTop} l ${W} 0`;
        },

        computeOutline(item) {
            const W = item.area.w;
            const H = item.area.h;
            const R = Math.min(item.shapeProps.cornerRadius, item.area.w/4, item.area.h/4);

            return `M ${W-R} ${H}  L ${R} ${H} a ${R} ${R} 0 0 1 ${-R} ${-R}  `
                +`L 0 ${R}  a ${R} ${R} 0 0 1 ${R} ${-R}  `
                +`L ${W-R} 0   a ${R} ${R} 0 0 1 ${R} ${R}  `
                +`L ${W} ${H-R}   a ${R} ${R} 0 0 1 ${-R} ${R} Z`;
        },

        getTextSlots(item) {
            return [{
                name: 'title',
                area: {x: 0, y: 0, w: item.area.w, h: item.shapeProps.headerHeight}
            }, {
                name: 'body',
                area: {x: 0, y: item.shapeProps.headerHeight, w: item.area.w, h: Math.max(10, item.area.h - item.shapeProps.headerHeight)}
            }];
        },

        controlPoints: {
            make(item, pointId) {
                if (!pointId) {
                    return {
                        headerHeight: makeHeaderHeightControlPoint(item),
                        cornerRadius: makeCornerRadiusControlPoint(item),
                    };
                } else if (pointId === 'headerHeight') {
                    return makeHeaderHeightControlPoint(item);
                } else if (pointId === 'cornerRadius') {
                    return makeCornerRadiusControlPoint(item);
                }
            },
            handleDrag(item, controlPointName, originalX, originalY, dx, dy) {
                if (controlPointName === 'headerHeight') {
                    item.shapeProps.headerHeight = myMath.clamp(originalY + dy, 0, item.area.h);
                } else if (controlPointName === 'cornerRadius') {
                    item.shapeProps.cornerRadius = myMath.clamp(item.area.w - originalX - dx, 0, Math.min(item.area.w/4, item.area.h/4));
                }
            }
        },

        args: {
            cornerRadius: {type: 'number', value: '0', name: 'Corner radius'},
            headerHeight: {type: 'number', value: 30, name: 'Header Height'}
        }
    }
}