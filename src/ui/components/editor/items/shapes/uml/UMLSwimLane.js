import myMath from '../../../../../myMath';
import AdvancedFill from '../../AdvancedFill.vue';

function computeOutline(item) {
    return `M 0 0 L ${item.area.w} 0 L ${item.area.w} ${item.area.h} L 0 ${item.area.h} Z`;
}

function computeCurves(item) {
    const curves = [{
        path: computeOutline(item),
        fill: AdvancedFill.computeStandardFill(item),
        strokeColor: item.shapeProps.strokeColor,
        strokeSize: item.shapeProps.strokeSize,
    }, {
        path: `M 0 ${item.shapeProps.headerHeight} L ${item.area.w} ${item.shapeProps.headerHeight}`,
        fill: 'none',
        strokeColor: item.shapeProps.strokeColor,
        strokeSize: item.shapeProps.strokeSize,
    }];
    
    let previousColumnRatio = 0;

    for (let i = 1; i < item.shapeProps.columns; i++) {
        let columnRatio = myMath.clamp(previousColumnRatio + Math.abs(item.shapeProps[`colw${i}`]), 0, 100);
        const pos = columnRatio * item.area.w / 100.0;
        curves.push({
            path: `M ${pos} 0 L ${pos} ${item.area.h}`,
            fill: 'none',
            strokeColor: item.shapeProps.strokeColor,
            strokeSize: item.shapeProps.strokeSize,
        });
        previousColumnRatio = columnRatio;
    }
    return curves;
}


// This implementation is very inefficient since for each column control point it will have to scan through all columns from the start
// but I am not able to solve it in a better way without refactoring control points implementation completely
// there is another way to solve: by replacing colw (relative column width) arguments with colp (relative column position),
// but this has a bad side effect when user modifies number of columns - it would look ugly

function makeColumnControlPoint(item, columnNumber) {
    let offset = 0;
    for (let i = 1; i <= columnNumber; i++) {
        const r = item.shapeProps[`colw${i}`];
        offset += r * item.area.w / 100.0;
    }
    
    return {
        x: myMath.clamp(offset, 0, item.area.w),
        y: 0
    }
}


function getTextSlots(item) {
    const textSlots = [];
    let previousColumnRatio = 0;
    let previousPosition = 0;
    for (let i = 1; i <= item.shapeProps.columns; i++) {
        let columnRatio = myMath.clamp(previousColumnRatio + Math.abs(item.shapeProps[`colw${i}`]), 0, 100);
        const pos = columnRatio * item.area.w / 100.0;

        textSlots.push({
            name: `col${i}`,
            area: {
                x: previousPosition,
                y: 0,
                w: pos - previousPosition,
                h: item.shapeProps.headerHeight
            }
        });
        previousColumnRatio = columnRatio;
        previousPosition = pos;
    }
    return textSlots;
}

export default {
    shapeConfig: {
        shapeType: 'standard',

        id: 'uml_swim_lane',

        menuItems: [{
            group: 'UML',
            name: 'Swim Lane',
            iconUrl: '/assets/images/items/uml-storage.svg',
            item: {
                shapeProps: {
                    columns: 3,
                    colw1: 33.33333,
                    colw2: 33.33333,
                    colw3: 33.33333,
                }
            }
        }],

        computeCurves,
        computeOutline,

        getTextSlots,

        controlPoints: {
            make(item, pointId) {
                if (!pointId) {
                    const cps = {
                        headerHeight: {
                            x: 0, y: myMath.clamp(item.shapeProps.headerHeight, 0, item.area.h)
                        }
                    };
                    // doing it in reverse order so that control point for first column would always be rendered on top of second control point
                    for (let i = item.shapeProps.columns - 1; i > 0; i--) {
                        cps[`colw${i}`] = makeColumnControlPoint(item, i);
                    }
                    return cps;
                } else if (pointId.indexOf('colw') === 0) {
                    const columnNumber = parseInt(pointId.substr(4));
                    return makeColumnControlPoint(item, columnNumber);
                }
            },
            handleDrag(item, controlPointName, originalX, originalY, dx, dy) {
                if (controlPointName.indexOf('colw') === 0) {

                    const columns = Math.max(1, item.shapeProps.columns);
                    if (myMath.tooSmall(item.area.w)) {
                        return;
                    }
                    const columnNumber = parseInt(controlPointName.substr(4));
                    let offset = 0;
                    for (let i = 1; i < columnNumber; i++) {
                        const r = item.shapeProps[`colw${i}`];
                        offset += r * item.area.w / 100.0;
                    }
                    
                    const width = Math.max(0, originalX + dx - offset);

                    const minWidth = 5 / columns;
                    const maxWidth = 100 - 5 / columns;
                    item.shapeProps[`colw${columnNumber}`] = myMath.clamp(100 * width / item.area.w, minWidth, maxWidth);
                } else if (controlPointName === 'headerHeight') {
                    item.shapeProps.headerHeight = myMath.clamp(originalY + dy, 0, item.area.h);
                }
            }
        },
        
        args: {
            columns: {type: 'number', value: 3, name: 'Columns', min: 1, max: 6},
            headerHeight: {type: 'number', value: 60, name: 'Header Height', min: 0, hidden: true},
            colw1: {type: 'number', value: 20, name: 'Column Width 1', min: 0, max: 100.0, hidden: true},
            colw2: {type: 'number', value: 20, name: 'Column Width 2', min: 0, max: 100.0, hidden: true},
            colw3: {type: 'number', value: 20, name: 'Column Width 3', min: 0, max: 100.0, hidden: true},
            colw4: {type: 'number', value: 20, name: 'Column Width 4', min: 0, max: 100.0, hidden: true},
            colw5: {type: 'number', value: 20, name: 'Column Width 5', min: 0, max: 100.0, hidden: true},
            colw6: {type: 'number', value: 20, name: 'Column Width 6', min: 0, max: 100.0, hidden: true},
        }
    }
}