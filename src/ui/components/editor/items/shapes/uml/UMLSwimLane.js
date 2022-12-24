/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import myMath from '../../../../../myMath';
import AdvancedFill from '../../AdvancedFill.vue';
import {enrichItemTextSlotWithDefaults} from '../../../../../scheme/ItemFixer';

function swimLaneWidth(item) {
    if (item.shapeProps.vertical) {
        return item.area.w;
    }
    return item.area.h;
}

function swimLaneHeight(item) {
    if (item.shapeProps.vertical) {
        return item.area.h;
    }
    return item.area.w;
}

function computeOutline(item) {
    return `M 0 0 L ${item.area.w} 0 L ${item.area.w} ${item.area.h} L 0 ${item.area.h} Z`;
}

function computeCurves(item) {
    const headerHeight = myMath.clamp(item.shapeProps.headerHeight, 0, swimLaneHeight(item));

    let headerLinePath = '';
    if (item.shapeProps.vertical) {
        headerLinePath = `M 0 ${headerHeight} L ${item.area.w} ${headerHeight}`;
    } else {
        headerLinePath = `M ${headerHeight} 0 L ${headerHeight} ${item.area.h}`;
    }

    const curves = [{
        path: computeOutline(item),
        fill: AdvancedFill.computeStandardFill(item),
        strokeColor: item.shapeProps.strokeColor,
        strokeSize: item.shapeProps.strokeSize,
    }, {
        path: headerLinePath,
        fill: 'none',
        strokeColor: item.shapeProps.strokeColor,
        strokeSize: item.shapeProps.strokeSize,
    }];

    
    let previousColumnRatio = 0;

    for (let i = 1; i < item.shapeProps.columns; i++) {
        let columnRatio = myMath.clamp(previousColumnRatio + Math.abs(item.shapeProps[`colw${i}`]), 0, 100);
        const pos = columnRatio * swimLaneWidth(item) / 100.0;

        let path = '';
        if (item.shapeProps.vertical) {
            path = `M ${pos} 0 L ${pos} ${swimLaneHeight(item)}`;
        } else {
            path = `M 0 ${pos} L ${swimLaneHeight(item)} ${pos}`;
        }
        curves.push({
            path,
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
        offset += r * swimLaneWidth(item) / 100.0;
    }
    
    if (item.shapeProps.vertical) {
        return {
            x: myMath.clamp(offset, 0, swimLaneWidth(item)),
            y: 0
        };
    } else {
        return {
            x: 0,
            y: myMath.clamp(offset, 0, swimLaneWidth(item))
        };
    }
}


function getTextSlots(item) {
    const textSlots = [];
    const W = swimLaneWidth(item);

    let previousColumnRatio = 0;
    let previousPosition = 0;
    for (let i = 1; i <= item.shapeProps.columns; i++) {
        let columnRatio = myMath.clamp(previousColumnRatio + Math.abs(item.shapeProps[`colw${i}`]), 0, 100);
        const pos = columnRatio * W / 100.0;

        let width = pos - previousPosition;
        if (i === item.shapeProps.columns) {
            width = W - previousPosition;
        }

        if (item.shapeProps.vertical) {
            textSlots.push({
                name: `col${i}`,
                area: {
                    x: previousPosition,
                    y: 0,
                    w: width,
                    h: item.shapeProps.headerHeight
                }
            });
        } else {
            textSlots.push({
                name: `col${i}`,
                area: {
                    x: 0,
                    y: previousPosition,
                    w: item.shapeProps.headerHeight,
                    h: width
                }
            });
        }
        previousColumnRatio = columnRatio;
        previousPosition = pos;
    }
    return textSlots;
}


function onColumnNumberUpdate($store, item, columns, previousColumns) {
    const columnWidths = [];
    let totalColumnSum = 0;
    let W = swimLaneWidth(item);

    for (let i = 1; i < previousColumns; i++) {
        const width = item.shapeProps[`colw${i}`] * W / 100.0;
        columnWidths.push(width);
        totalColumnSum += width;
    }

    if (columns > previousColumns && columns > 1 && !myMath.tooSmall(W)) {
        // adding a column
        const columnWidth = W  / (columns - 1);

        if (item.shapeProps.vertical) {
            item.area.w += columnWidth;
        } else {
            item.area.h += columnWidth;
        }

        W = swimLaneWidth(item);

        item.shapeProps[`colw${columns-1}`] = 100 * columnWidth / W;

        for (let i = 1; i < previousColumns; i++) {
            item.shapeProps[`colw${i}`] = 100 * columnWidths[i-1] / W;
        }

        if (!item.textSlots[`col${columns}`]) {
            item.textSlots[`col${columns}`] = {
                text: `<b>Title ${columns}</b>`
            };
            enrichItemTextSlotWithDefaults(item.textSlots[`col${columns}`]);
        }
    }

    if (columns < previousColumns && columns > 0 && !myMath.tooSmall(W)) {
        if (item.shapeProps.vertical) {
            item.area.w = totalColumnSum;
        } else {
            item.area.h = totalColumnSum;
        }

        W = swimLaneWidth(item);

        if (!myMath.tooSmall(W)) {
            for (let i = 1; i < columns; i++) {
                item.shapeProps[`colw${i}`] = 100 * columnWidths[i-1] / W;
            }
        }
    }

}

export default {
    shapeConfig: {
        shapeType: 'standard',

        id: 'uml_swim_lane',

        menuItems: [{
            group: 'Tables',
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
            },
            previewArea: { x: 5, y: 5, w: 250, h: 100},
            size: {w: 800, h: 400}
        }, {
            group: 'Tables',
            name: 'Swim Lane (Horizontal)',
            iconUrl: '/assets/images/items/uml-swim-lane-horizontal.svg',
            item: {
                shapeProps: {
                    columns: 3,
                    vertical: false,
                    headerHeight: 110,
                    colw1: 33.33333,
                    colw2: 33.33333,
                    colw3: 33.33333,
                },
                textSlots: {
                    col1: { text: '<b>Todo</b>'},
                    col2: { text: '<b>In Progress</b>'},
                    col3: { text: '<b>Done</b>'},
                }
            },
            previewArea: { x: 5, y: 5, w: 250, h: 100},
            size: {w: 800, h: 400}
        }],

        computeCurves,
        computeOutline,

        getTextSlots,

        // triggered when user initiates creation of this item
        beforeCreate(store, item) {
            const columns = myMath.clamp(item.shapeProps.columns, 1, 12);
            const columnRatio = 100 / columns;

            for(let i = 0; i < columns; i++) {
                item.shapeProps[`colw${i}`] = columnRatio;
            }
        },

        editorProps: {
            textSlotTabsDisabled: true,
        },

        controlPoints: {
            make(item) {
                const cps = { };

                if (item.shapeProps.vertical) {
                    cps.headerHeight = {
                        x: 0, y: myMath.clamp(item.shapeProps.headerHeight, 0, item.area.h)
                    };
                } else {
                    cps.headerHeight = {
                        x: myMath.clamp(item.shapeProps.headerHeight, 0, item.area.w), y: 0
                    };
                }


                // doing it in reverse order so that control point for first column would always be rendered on top of second control point
                for (let i = item.shapeProps.columns - 1; i > 0; i--) {
                    cps[`colw${i}`] = makeColumnControlPoint(item, i);
                }
                return cps;
            },
            handleDrag(item, controlPointName, originalX, originalY, dx, dy) {
                if (controlPointName.indexOf('colw') === 0) {
                    let movement = originalX + dx;
                    if (!item.shapeProps.vertical) {
                        movement = originalY + dy;
                    }

                    const W = swimLaneWidth(item);

                    const columns = Math.max(1, item.shapeProps.columns);
                    if (myMath.tooSmall(W)) {
                        return;
                    }
                    const columnNumber = parseInt(controlPointName.substr(4));
                    let offset = 0;
                    for (let i = 1; i < columnNumber; i++) {
                        const r = item.shapeProps[`colw${i}`];
                        offset += r * W / 100.0;
                    }

                    const width = Math.max(0, movement - offset);

                    const minWidth = 5 / columns;
                    const maxWidth = 100 - 5 / columns;
                    item.shapeProps[`colw${columnNumber}`] = myMath.clamp(100 * width / W, minWidth, maxWidth);

                } else if (controlPointName === 'headerHeight') {
                    let movement = originalY + dy;
                    if (!item.shapeProps.vertical) {
                        movement = originalX + dx;
                    }
                    item.shapeProps.headerHeight = myMath.clamp(movement, 0, swimLaneHeight(item));
                }
            }
        },
        
        args: {
            columns: {type: 'number', value: 3, name: 'Columns', min: 1, max: 12, onUpdate: onColumnNumberUpdate },
            headerHeight: {type: 'number', value: 50, name: 'Header Height', min: 0, hidden: true},
            vertical: {type: 'boolean', value: true, name: 'Vertical'},
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