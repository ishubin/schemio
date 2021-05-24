import myMath from '../../../../../myMath';
import AdvancedFill from '../../AdvancedFill.vue';
import {enrichItemTextSlotWithDefaults} from '../../../../../scheme/Item';

function computeOutline(item) {
    return `M 0 0 L ${item.area.w} 0 L ${item.area.w} ${item.area.h} L 0 ${item.area.h} Z`;
}

function computeCurves(item) {
    const headerHeight = myMath.clamp(item.shapeProps.headerHeight, 0, item.area.h);
    const curves = [{
        path: computeOutline(item),
        fill: AdvancedFill.computeStandardFill(item),
        strokeColor: item.shapeProps.strokeColor,
        strokeSize: item.shapeProps.strokeSize,
    }, {
        path: `M 0 ${headerHeight} L ${item.area.w} ${headerHeight}`,
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

        let width = pos - previousPosition;
        if (i === item.shapeProps.columns) {
            width = item.area.w - previousPosition;
        }

        textSlots.push({
            name: `col${i}`,
            area: {
                x: previousPosition,
                y: 0,
                w: width,
                h: item.shapeProps.headerHeight
            }
        });
        previousColumnRatio = columnRatio;
        previousPosition = pos;
    }
    return textSlots;
}


function onColumnNumberInput(item, columns, previousColumns) {
    const columnWidths = [];
    let totalColumnSum = 0
    for (let i = 1; i < previousColumns; i++) {
        const width = item.shapeProps[`colw${i}`] * item.area.w / 100.0;
        columnWidths.push(width);
        totalColumnSum += width;
    }

    if (columns > previousColumns && columns > 1 && !myMath.tooSmall(item.area.w)) {
        // adding a column
        const columnWidth = item.area.w  / (columns - 1);

        item.area.w += columnWidth;

        item.shapeProps[`colw${columns-1}`] = 100 * columnWidth / item.area.w;

        for (let i = 1; i < previousColumns; i++) {
            item.shapeProps[`colw${i}`] = 100 * columnWidths[i-1] / item.area.w;
        }

        if (!item.textSlots[`col${columns}`]) {
            item.textSlots[`col${columns}`] = {
                text: `<b>Title ${columns}</b>`
            };
            enrichItemTextSlotWithDefaults(item.textSlots[`col${columns}`]);
        }
    }

    if (columns < previousColumns && columns > 0 && !myMath.tooSmall(item.area.w)) {
        item.area.w = totalColumnSum;
        if (!myMath.tooSmall(item.area.w)) {
            for (let i = 1; i < columns; i++) {
                item.shapeProps[`colw${i}`] = 100 * columnWidths[i-1] / item.area.w;
            }
        }
    }

}

export default {
    shapeConfig: {
        shapeType: 'standard',

        id: 'uml_swim_lane',

        menuItems: [{
            group: 'UML',
            name: 'Swim Lane',
            iconUrl: '/assets/images/items/uml-swim-lane.svg',
            item: {
                shapeProps: {
                    columns: 3,
                    colw1: 33.33333,
                    colw2: 33.33333,
                    colw3: 33.33333,
                },
                textSlots: {
                    col1: { text: '<b>Todo</b>'},
                    col2: { text: '<b>In Progress</b>'},
                    col3: { text: '<b>Done</b>'},
                }
            }
        }],

        computeCurves,
        computeOutline,

        getTextSlots,

        // triggered when user initiates creation of this item
        beforeCreate(item) {
            const columns = myMath.clamp(item.shapeProps.columns, 1, 12);
            const columnRatio = 100 / columns;

            for(let i = 0; i < columns; i++) {
                item.shapeProps[`colw${i}`] = columnRatio;
            }
        },

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
            columns: {type: 'number', value: 3, name: 'Columns', min: 1, max: 12, onInput: onColumnNumberInput },
            headerHeight: {type: 'number', value: 60, name: 'Header Height', min: 0, hidden: true},
            colw1: {type: 'number', value: 20, name: 'Column Width 1', min: 0, max: 100.0, hidden: true},
            colw2: {type: 'number', value: 20, name: 'Column Width 2', min: 0, max: 100.0, hidden: true},
            colw3: {type: 'number', value: 20, name: 'Column Width 3', min: 0, max: 100.0, hidden: true},
            colw4: {type: 'number', value: 20, name: 'Column Width 4', min: 0, max: 100.0, hidden: true},
            colw5: {type: 'number', value: 20, name: 'Column Width 5', min: 0, max: 100.0, hidden: true},
            colw6: {type: 'number', value: 20, name: 'Column Width 6', min: 0, max: 100.0, hidden: true},
            colw7: {type: 'number', value: 20, name: 'Column Width 7', min: 0, max: 100.0, hidden: true},
            colw8: {type: 'number', value: 20, name: 'Column Width 8', min: 0, max: 100.0, hidden: true},
            colw9: {type: 'number', value: 20, name: 'Column Width 9', min: 0, max: 100.0, hidden: true},
            colw10: {type: 'number', value: 20, name: 'Column Width 10', min: 0, max: 100.0, hidden: true},
            colw11: {type: 'number', value: 20, name: 'Column Width 11', min: 0, max: 100.0, hidden: true},
            colw12: {type: 'number', value: 20, name: 'Column Width 12', min: 0, max: 100.0, hidden: true},
        }
    }
}