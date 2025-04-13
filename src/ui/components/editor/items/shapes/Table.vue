<!-- This Source Code Form is subject to the terms of the Mozilla Public
     License, v. 2.0. If a copy of the MPL was not distributed with this
     file, You can obtain one at https://mozilla.org/MPL/2.0/. -->
<template>
    <g>
        <advanced-fill :fillId="`fill-pattern-${item.id}`" :fill="item.shapeProps.fill" :area="item.area"/>
        <advanced-fill :fillId="`fill-pattern-${item.id}-header`" :fill="item.shapeProps.headerFill" :area="item.area"/>
        <advanced-fill :fillId="`fill-pattern-${item.id}-secondary-fill`" :fill="item.shapeProps.rowSecondaryFill" :area="item.area"/>

        <g>
            <rect v-for="c in cells" :x="c.area.x" :y="c.area.y" :width="c.area.w" :height="c.area.h" stroke="none" :fill="c.fill"/>
        </g>
        <g v-if="item.shapeProps.tableStyle === 'simple'">
            <path :d="outlinePath" :stroke="item.shapeProps.stroke" :stroke-width="`${item.shapeProps.strokeSize}px`" fill="none"/>
            <line v-for="l in gridLines"
                :stroke="item.shapeProps.stroke"
                :stroke-width="`${item.shapeProps.strokeSize}px`"
                :x1="l.x1" :y1="l.y1"
                :x2="l.x2" :y2="l.y2"/>
        </g>
    </g>
</template>

<script>
import AdvancedFill from '../AdvancedFill.vue';
import {computeSvgFill} from '../AdvancedFill.vue';
import myMath from '../../../../myMath';
import EditorEventBus from '../../EditorEventBus';
import TablePropertiesEditor from './TablePropertiesEditor.vue';
import utils from '../../../../utils';
import { defaultTextSlotProps } from '../../../../scheme/Item';
import { enrichItemTextSlotWithDefaults } from '../../../../scheme/ItemFixer';

const minCells = 1;
const maxCells = 100;

function addColumn(editorId, item) {
    if (item.shapeProps.columns >= maxCells) {
        return;
    }
    changeColumn(editorId, item, item.shapeProps.columns + 1);
}

function removeColumn(editorId, item) {
    if (item.shapeProps.columns <= minCells) {
        return;
    }
    changeColumn(editorId, item, item.shapeProps.columns - 1);
}

function changeColumn(editorId, item, newValue) {
    const oldValue = item.shapeProps.columns;
    item.shapeProps.columns = newValue;
    onColumnNumberUpdate(null, item, newValue, oldValue);
    EditorEventBus.item.changed.specific.$emit(editorId, item.id, `shapeProps.column`);
    EditorEventBus.schemeChangeCommitted.$emit(editorId, `item.${item.id}.shapeProps.columns`);

}

function addRow(editorId, item) {
    if (item.shapeProps.rows >= maxCells) {
        return;
    }
    changeRow(editorId, item, item.shapeProps.rows + 1);
}

function removeRow(editorId, item) {
    if (item.shapeProps.rows <= minCells) {
        return;
    }
    changeRow(editorId, item, item.shapeProps.rows - 1);
}

function changeRow(editorId, item, newValue) {
    const oldValue = item.shapeProps.rows;
    item.shapeProps.rows = newValue;
    onRowsNumberUpdate(null, item, newValue, oldValue);
    EditorEventBus.item.changed.specific.$emit(editorId, item.id, `shapeProps.rows`);
    EditorEventBus.schemeChangeCommitted.$emit(editorId, `item.${item.id}.shapeProps.rows`);

}

function onColumnNumberUpdate($store, item, columns, previousColumns) {
    const columnWidths = [];
    let lastColumnWidth = 100;

    let total = 0;
    for (let i = 0; i < previousColumns - 1; i++) {
        const width = item.area.w * item.shapeProps.colWidths[i] / 100;
        total += width;
        columnWidths[i] = width;
    }

    lastColumnWidth = Math.max(item.area.w / (2 * Math.max(1, previousColumns)), item.area.w - total);

    if (columns > previousColumns && columns > 0 && !myMath.tooSmall(item.area.w)) {
        for (let i = previousColumns - 1 ; i < columns - 1; i++) {
            columnWidths.push(lastColumnWidth);
            item.area.w += lastColumnWidth;
        }
        for (let i = previousColumns - 1 ; i < columns; i++) {
            for (let j = 0; j < item.shapeProps.rows; j++) {
                const key = `c_${j}_${i}`;
                if (!item.textSlots.hasOwnProperty(key)) {
                    if (i > 0) {
                        item.textSlots[key] = {
                            ...utils.clone(item.textSlots[`c_${j}_${i-1}`]),
                            text: ''
                        };
                    } else {
                        item.textSlots[key] = utils.clone(defaultTextSlotProps);
                    }
                }
            }
        }
    }

    if (columns < previousColumns && columns > 0 && !myMath.tooSmall(item.area.w)) {
        let newWidth = 0;
        for (let i = 0; i < columns; i++) {
            newWidth += item.shapeProps.colWidths[i] * item.area.w / 100;
        }
        item.area.w = newWidth;
    }

    if (item.shapeProps.colWidths.length > columns) {
        item.shapeProps.colWidths = item.shapeProps.colWidths.slice(0, columns);
        //TODO delete old text slots
    }

    let W = item.area.w;
    if (myMath.tooSmall(W)) {
        W = 1;
    }

    for (let i = 0; i < columns && i < columnWidths.length; i++) {
        item.shapeProps.colWidths[i] = 100 * columnWidths[i] / W;
    }
}

function onRowsNumberUpdate($store, item, rows, previousRows) {
    const rowWidths = [];
    let total = 0;
    let lastRowWidth = 100;

    for (let i = 0; i < previousRows - 1; i++) {
        const width = item.area.h * item.shapeProps.rowWidths[i] / 100;
        total += width;
        rowWidths[i] = width;
    }

    lastRowWidth = Math.max(item.area.h / (2 * Math.max(1, previousRows)), item.area.h - total);

    if (rows > previousRows && rows > 0 && !myMath.tooSmall(item.area.h)) {
        for (let i = previousRows - 1 ; i < rows - 1; i++) {
            rowWidths.push(lastRowWidth);
            item.area.h += lastRowWidth;
        }
        for (let i = previousRows - 1 ; i < rows; i++) {
            for (let j = 0; j < item.shapeProps.columns; j++) {
                const key = `c_${i}_${j}`;
                if (!item.textSlots.hasOwnProperty(key)) {
                    if (i > 0) {
                        item.textSlots[key] = {
                            ...utils.clone(item.textSlots[`c_${i-1}_${j}`]),
                            text: ''
                        };
                    } else {
                        item.textSlots[key] = utils.clone(defaultTextSlotProps);
                    }
                }
            }
        }
    }

    if (rows < previousRows && rows > 0 && !myMath.tooSmall(item.area.h)) {
        let newWidth = 0;
        for (let i = 0; i < rows; i++) {
            newWidth += item.shapeProps.rowWidths[i] * item.area.h / 100;
        }
        item.area.h = newWidth;
    }

    if (item.shapeProps.rowWidths.length > rows) {
        item.shapeProps.rowWidths = item.shapeProps.rowWidths.slice(0, rows);
        //TODO delete old text slots
    }

    let H = item.area.h;
    if (myMath.tooSmall(H)) {
        H = 1;
    }

    for (let i = 0; i < rows && i < rowWidths.length; i++) {
        item.shapeProps.rowWidths[i] = 100 * rowWidths[i] / H;
    }
}

function computeOutline(item) {
    if (item.shapeProps.header === 'both' && item.shapeProps.cutCorner) {
        const firstColumnWidth = item.area.w * item.shapeProps.colWidths[0] / 100;
        const firstRowWidth = item.area.h * item.shapeProps.rowWidths[0] / 100;

        return `M ${firstColumnWidth} 0 L ${item.area.w} 0 L ${item.area.w} ${item.area.h} L 0 ${item.area.h}  L 0 ${firstRowWidth} L ${firstColumnWidth} ${firstRowWidth} Z`;
    }
    return `M 0 0 L ${item.area.w} 0 L ${item.area.w} ${item.area.h} L 0 ${item.area.h} Z`;
}

function generateCells(item) {
    const cells = [];
    let rowOffset = 0;
    let remainingRowWidth = item.area.h;
    let rowStart = 0;
    let columnStart = 0;

    if (item.shapeProps.header === 'columns-single') {
        columnStart = 1;
    }
    if (item.shapeProps.header === 'rows-single') {
        rowStart = 1;
    }
    for (let i = rowStart; i < item.shapeProps.rows; i++) {
        const rowWidth = Math.min(remainingRowWidth, i < item.shapeProps.rows - 1 ? item.shapeProps.rowWidths[i] * item.area.h / 100 : remainingRowWidth);

        let columnOffset = 0;
        let remainingColumnWidth = item.area.w;
        for (let j = columnStart; j < item.shapeProps.columns; j++) {
            const columnWidth = Math.min(remainingColumnWidth, j < item.shapeProps.columns - 1 ? item.shapeProps.colWidths[j] * item.area.w / 100 : remainingColumnWidth);
            let x1 = columnOffset;
            let x2 = columnOffset + columnWidth;
            let y1 = rowOffset;
            let y2 = rowOffset + rowWidth;

            let pad = 0;
            if (item.shapeProps.tableStyle === 'flat') {
                pad = item.shapeProps.cellPadding;
            }

            x1 = Math.min(x1 + pad, x2);
            y1 = Math.min(y1 + pad, y2);


            if (!(item.shapeProps.header === 'both' && item.shapeProps.cutCorner && i === 0 && j === 0)) {
                cells.push({
                    row: i,
                    col: j,
                    area: {
                        x: x1,
                        y: y1,
                        w: Math.max(0, x2 - pad - x1),
                        h: Math.max(0, y2 - pad - y1)
                    }
                });
            }
            columnOffset += columnWidth;
            remainingColumnWidth -= columnWidth;
        }
        rowOffset += rowWidth;
        remainingRowWidth -= rowWidth;
    }
    return cells;
}

function getTextSlots(item) {
    return generateCells(item).map(cell => {
        return {
            name: `c_${cell.row}_${cell.col}`,
            area: cell.area
        };
    });
}


function identifyRowAndColumn(item, x, y) {
    let row = 0, col = 0;
    let offset = 0;
    for (let i = 0; i < item.shapeProps.columns - 1; i++) {
        col = i;
        offset += item.shapeProps.colWidths[i] * item.area.w / 100.0;
        if (x < offset) {
            break;
        }
    }
    if (x > offset) {
        col += 1;
    }

    offset = 0;
    for (let i = 0; i < item.shapeProps.rows - 1; i++) {
        row = i;
        offset += item.shapeProps.rowWidths[i] * item.area.h / 100.0;
        if (y < offset) {
            break;
        }
    }
    if (y > offset) {
        row += 1;
    }
    return {row, col};
}

function calculateRealColumnWidths(item) {
    const realColumnWidths = [];
    let offset = 0;
    for (let i = 0; i < item.shapeProps.columns - 1 && i < item.shapeProps.colWidths.length; i++) {
        realColumnWidths[i] = item.shapeProps.colWidths[i] * item.area.w / 100;
        offset += realColumnWidths[i];
    }
    const leftOverWidth = Math.max(0, item.area.w - offset);
    realColumnWidths.push(leftOverWidth);
    return realColumnWidths;
}

function updateColWidths(item, realColumnWidths) {
    item.shapeProps.colWidths = [];
    for (let i = 0; i < item.shapeProps.columns - 1; i++) {
        const width = myMath.tooSmall(item.area.w) ? 1 : item.area.w;
        item.shapeProps.colWidths[i] = 100 * realColumnWidths[i] / width;
    }
}

function calculateRealRowWidths(item) {
    const realRowWidths = [];
    let offset = 0;
    for (let i = 0; i < item.shapeProps.rows - 1 && i < item.shapeProps.rowWidths.length; i++) {
        realRowWidths[i] = item.shapeProps.rowWidths[i] * item.area.h / 100;
        offset += realRowWidths[i];
    }
    const leftOverWidth = Math.max(0, item.area.h - offset);
    realRowWidths.push(leftOverWidth);
    return realRowWidths;
}

function updateRowWidths(item, realRowWidths) {
    item.shapeProps.rowWidths = [];
    for (let i = 0; i < item.shapeProps.rows - 1; i++) {
        const width = myMath.tooSmall(item.area.h) ? 1 : item.area.h;
        item.shapeProps.rowWidths[i] = 100 * realRowWidths[i] / width;
    }
}

function deleteColumn(item, col) {
    if (item.shapeProps.columns < 2) {
        return false;
    }

    const realColumnWidths = calculateRealColumnWidths(item);
    item.shapeProps.columns -= 1;

    if (col < item.shapeProps.colWidths.length) {
        const columnWidth = realColumnWidths[col];
        item.area.w = Math.max(0, item.area.w - columnWidth);
        item.shapeProps.colWidths.splice(col, 1);
        realColumnWidths.splice(col, 1);
    } else if (col === item.shapeProps.colWidths.length) {
        item.shapeProps.colWidths.length -= 1;
        item.area.w = Math.max(0, item.area.w - realColumnWidths[realColumnWidths.length - 1]);
    }

    updateColWidths(item, realColumnWidths);

    for (let i = col; i < item.shapeProps.columns; i++) {
        for (let j = 0; j < item.shapeProps.rows; j++) {
            item.textSlots[`c_${j}_${i}`] = item.textSlots[`c_${j}_${i+1}`];
        }
    }
    for (let j = 0; j < item.shapeProps.rows; j++) {
        delete item.textSlots[`c_${j}_${item.shapeProps.columns}`];
    }
    return true;
}

function insertColumn(item, idx) {
    const realWidths = calculateRealColumnWidths(item);

    const newColumnWidth = idx < realWidths.length ? realWidths[idx] : realWidths[realWidths.length - 1];
    realWidths.splice(idx, 0, newColumnWidth);

    item.area.w += newColumnWidth;
    item.shapeProps.columns += 1;
    updateColWidths(item, realWidths);

    for (let i = item.shapeProps.columns - 1; i >= idx; i--) {
        for (let j = 0; j < item.shapeProps.rows; j++) {
            item.textSlots[`c_${j}_${i}`] = item.textSlots[`c_${j}_${i-1}`];
        }
    }
    for (let j = 0; j < item.shapeProps.rows; j++) {
        if (idx < item.shapeProps.columns - 1) {
            item.textSlots[`c_${j}_${idx}`] = {
                ...utils.clone(item.textSlots[`c_${j}_${idx+1}`]),
                text: ''
            };
        } else if (idx > 0) {
            item.textSlots[`c_${j}_${idx}`] = {
                ...utils.clone(item.textSlots[`c_${j}_${idx-1}`]),
                text: ''
            };
        } else {
            item.textSlots[`c_${j}_${idx}`] = utils.clone(defaultTextSlotProps);
        }
    }

    return true;
}

function insertRow(item, idx) {
    const realWidths = calculateRealRowWidths(item);

    const newRowWidth = idx < realWidths.length ? realWidths[idx] : realWidths[realWidths.length - 1];
    realWidths.splice(idx, 0, newRowWidth);

    item.area.h += newRowWidth;
    item.shapeProps.rows += 1;
    updateRowWidths(item, realWidths);

    for (let j = item.shapeProps.rows - 1; j >= idx; j--) {
        for (let i = 0; i < item.shapeProps.columns; i++) {
            item.textSlots[`c_${j}_${i}`] = item.textSlots[`c_${j-1}_${i}`];
        }
    }
    for (let i = 0; i < item.shapeProps.columns; i++) {
        if (idx < item.shapeProps.rows - 1) {
            item.textSlots[`c_${idx}_${i}`] = {
                ...utils.clone(item.textSlots[`c_${idx+1}_${i}`]),
                text: ''
            };
        } else if (idx > 0) {
            item.textSlots[`c_${idx}_${i}`] = {
                ...utils.clone(item.textSlots[`c_${idx-1}_${i}`]),
                text: ''
            };
        } else {
            item.textSlots[`c_${idx}_${i}`] = utils.clone(defaultTextSlotProps);
        }
    }

    return true;
}

function deleteRow(item, row) {
    if (item.shapeProps.rows < 2) {
        return false;
    }

    const realRowWidths = calculateRealRowWidths(item);
    item.shapeProps.rows -= 1;

    if (row < item.shapeProps.rowWidths.length) {
        item.area.h = Math.max(0, item.area.h - realRowWidths[row]);
        item.shapeProps.rowWidths.splice(row, 1);
        realRowWidths.splice(row, 1);
    } else if (row === item.shapeProps.rowWidths.length) {
        item.shapeProps.rowWidths.length -= 1;
        item.area.h = Math.max(0, item.area.h - realRowWidths[realRowWidths.length - 1]);
    }

    updateRowWidths(item, realRowWidths);

    for (let i = row; i < item.shapeProps.rows; i++) {
        for (let j = 0; j < item.shapeProps.columns; j++) {
            item.textSlots[`c_${i}_${j}`] = item.textSlots[`c_${i+1}_${j}`];
        }
    }
    for (let j = 0; j < item.shapeProps.columns; j++) {
        delete item.textSlots[`c_${item.shapeProps.rows}_${j}`];
    }
    return true;
}

function copyTextStyleToColumn(item, row, col) {
    const textSlot = utils.clone(item.textSlots[`c_${row}_${col}`]);
    for (let i = 0; i < item.shapeProps.rows; i++) {
        if (i != row) {
            const slotName = `c_${i}_${col}`;
            const text = item.textSlots[slotName].text;
            item.textSlots[slotName] = {
                ...textSlot,
                text
            };
        }
    }
    return true;
}

function copyTextStyleToRow(item, row, col) {
    const textSlot = utils.clone(item.textSlots[`c_${row}_${col}`]);

    for (let i = 0; i < item.shapeProps.columns; i++) {
        if (i != col) {
            const slotName = `c_${row}_${i}`;
            const text = item.textSlots[slotName].text;
            item.textSlots[slotName] = {
                ...textSlot,
                text
            };
        }
    }
    return true;
}

function copyTextStyleToAllCells(item, row, col) {
    const textSlot = utils.clone(item.textSlots[`c_${row}_${col}`]);
    for (let j = 0; j < item.shapeProps.rows; j++) {
        for (let i = 0; i < item.shapeProps.columns; i++) {
            if (!(i === col && j === row)) {
                const slotName = `c_${j}_${i}`;
                const text = item.textSlots[slotName].text;
                item.textSlots[slotName] = {
                    ...textSlot,
                    text
                };
            }
        }
    }
    return true;
}

function copyTextStyleToHeaderCells(item, row, col) {
    const header = item.shapeProps.header;
    const textSlot = utils.clone(item.textSlots[`c_${row}_${col}`]);
    for (let j = 0; j < item.shapeProps.rows; j++) {
        for (let i = 0; i < item.shapeProps.columns; i++) {
            const isHeaderCell =((header === 'columns' || header === 'both') && j ===0)
                || ((header === 'rows' || header === 'both') && i ===0);
            if (isHeaderCell && !(i === col && j === row)) {
                const slotName = `c_${j}_${i}`;
                const text = item.textSlots[slotName].text;
                item.textSlots[slotName] = {
                    ...textSlot,
                    text
                };
            }
        }
    }
    return true;
}

function copyTextStyleToRegularCells(item, row, col) {
    const header = item.shapeProps.header;
    const textSlot = utils.clone(item.textSlots[`c_${row}_${col}`]);
    for (let j = 0; j < item.shapeProps.rows; j++) {
        for (let i = 0; i < item.shapeProps.columns; i++) {
            const isHeaderCell =((header === 'columns' || header === 'both') && j ===0)
                || ((header === 'rows' || header === 'both') && i ===0);
            if (!isHeaderCell && !(i === col && j === row)) {
                const slotName = `c_${j}_${i}`;
                const text = item.textSlots[slotName].text;
                item.textSlots[slotName] = {
                    ...textSlot,
                    text
                };
            }
        }
    }
    return true;
}

function menuItem(name, iconFile, shapeProps) {
    return {
        group: 'Tables',
        name: name,
        iconUrl: `/assets/images/items/${iconFile}`,
        item: {
            shapeProps,
        },
        previewArea: { x: 5, y: 5, w: 200, h: 100},
        size: {w: 200, h: 100}
    };
}

function fixItem(item) {
    if (item.shapeProps.columns < 1) {
        item.shapeProps.columns = 1;
    }
    if (item.shapeProps.rows < 1) {
        item.shapeProps.rows = 1;
    }

    if (item.shapeProps.colWidths.length > item.shapeProps.columns - 1) {
        item.shapeProps.colWidths = item.shapeProps.colWidths.slice(0, item.shapeProps.columns - 1);
    } else if (item.shapeProps.colWidths.length < item.shapeProps.columns - 1) {
        const missingColumns = item.shapeProps.columns - 1 - item.shapeProps.colWidths.length;

        let sumWidth = 0;
        for (let i = 0; i < item.shapeProps.colWidths.length; i++) {
            sumWidth += item.shapeProps.colWidths[i] * item.area.w / 100;
        }

        let w = item.area.w;
        if (myMath.tooSmall(w)) {
            w = 1;
        }

        if (missingColumns > 0) {
            const ratio = Math.max(0, item.area.w - sumWidth) * 100 / (w * (missingColumns + 1));
            for (let i = 0; i < missingColumns; i++) {
                item.shapeProps.colWidths.push(ratio);
            }
        }
    }

    if (item.shapeProps.rowWidths.length > item.shapeProps.rows - 1) {
        item.shapeProps.rowWidths = item.shapeProps.rowWidths.slice(0, item.shapeProps.rows - 1);
    } else if (item.shapeProps.rowWidths.length < item.shapeProps.rows - 1) {
        const missingRows = item.shapeProps.rows - 1 - item.shapeProps.rowWidths.length;

        let sumWidth = 0;
        for (let i = 0; i < item.shapeProps.rowWidths.length; i++) {
            sumWidth += item.shapeProps.rowWidths[i] * item.area.h / 100;
        }

        let h = item.area.h;
        if (myMath.tooSmall(h)) {
            h = 1;
        }

        if (missingRows > 0) {
            const ratio = Math.max(0, item.area.h - sumWidth) * 100 / (h * (missingRows + 1));
            for (let i = 0; i < missingRows; i++) {
                item.shapeProps.rowWidths.push(ratio);
            }
        }
    }
}

/**
 * @param {Item} item
 */
function getPins(item) {
    const pins = {};
    return pins;
}

/**
 * @param {String} editorId
 * @param {SchemeContainer} schemeContainer
 * @param {Item} item
 */
function scriptFunctions(editorId, schemeContainer, item) {
    const emitItemChanged = () => {
        EditorEventBus.item.changed.specific.$emit(editorId, item.id);
    };

    return {
        setCellText(row, col, text) {
            if (row < 0 || row >= item.shapeProps.rows) {
                throw new Error(`Cannot set cell text in a table. Row (${row}) is out of bounds [0,${item.shapeProps.rows}]: `);
            }
            if (col < 0 || col >= item.shapeProps.columns) {
                throw new Error(`Cannot set cell text in a table. Cell (${col}) is out of bounds [0,${item.shapeProps.columns}]: `);
            }
            const key = `c_${row}_${col}`;
            if (!item.textSlots[key]) {
                item.textSlots[key] = {text: '' + text};
                enrichItemTextSlotWithDefaults(item.textSlots[key]);
            } else {
                item.textSlots[key].text = '' + text;
            }
            emitItemChanged();
        },

        getCellText(row, col) {
            if (row < 0 || row >= item.shapeProps.rows) {
                throw new Error(`Cannot get cell text in a table. Row (${row}) is out of bounds [0,${item.shapeProps.rows}]: `);
            }
            if (col < 0 || col >= item.shapeProps.columns) {
                throw new Error(`Cannot get cell text in a table. Cell (${col}) is out of bounds [0,${item.shapeProps.columns}]: `);
            }
            const key = `c_${row}_${col}`;
            if (item.textSlots[key]) {
                return item.textSlots[key].text;
            }
            return '';
        }
    };
}

export default {
    props: ['item'],
    components: {AdvancedFill},

    shapeConfig: {
        shapeType: 'vue',

        id: 'uml_table',

        menuItems: [
            menuItem('Table', 'table-simple.svg', {
                columns: 3,
                rows: 3,
                header: 'none'
            }),
            menuItem('Table with header', 'table-h-header.svg', {
                columns: 3,
                rows: 3,
                header: 'columns'
            }),
            menuItem('Table with vertical header', 'table-v-header.svg', {
                columns: 3,
                rows: 3,
                header: 'rows'
            }),
            menuItem('Table with double header', 'table-dbl-header.svg', {
                columns: 3,
                rows: 3,
                header: 'both',
                cutCorner: false
            }),
            menuItem('Table with double header', 'table-dbl-header-2.svg', {
                columns: 3,
                rows: 3,
                header: 'both',
                cutCorner: true
            }),
        ],

        getPins,

        computeOutline,

        getTextSlots,

        fixItem,

        controlPoints: {
            make(item) {
                const cps = { };

                let offset = 0;
                for (let i = 0; i < item.shapeProps.columns - 1; i++) {
                    const r = item.shapeProps.colWidths[i];
                    offset += r * item.area.w / 100.0;
                    cps[`c_${i}`] = {
                        x: myMath.clamp(offset, 0, item.area.w),
                        y: 0
                    };
                }
                offset = 0;
                for (let i = 0; i < item.shapeProps.rows - 1; i++) {
                    const r = item.shapeProps.rowWidths[i];
                    offset += r * item.area.h / 100.0;
                    cps[`r_${i}`] = {
                        x: 0,
                        y: myMath.clamp(offset, 0, item.area.h),
                    };
                }
                return cps;
            },
            handleDrag(item, controlPointName, originalX, originalY, dx, dy) {
                if (controlPointName.startsWith('c_')) {
                    let movement = originalX + dx;
                    const W = item.area.w;

                    const columns = Math.max(1, item.shapeProps.columns);
                    if (myMath.tooSmall(W)) {
                        return;
                    }
                    const columnNumber = parseInt(controlPointName.substr(2));
                    let offset = 0;
                    for (let i = 0; i < columnNumber; i++) {
                        const r = item.shapeProps.colWidths[i];
                        offset += r * W / 100.0;
                    }

                    const width = Math.max(0, movement - offset);

                    const minWidth = 5 / columns;
                    const maxWidth = 100 - 5 / columns;
                    item.shapeProps.colWidths[columnNumber] = myMath.clamp(100 * width / W, minWidth, maxWidth);

                } else if (controlPointName.startsWith('r_')) {
                    let movement = originalY + dy;
                    const H = item.area.h;

                    const rows = Math.max(1, item.shapeProps.rows);
                    if (myMath.tooSmall(H)) {
                        return;
                    }
                    const rowNumber = parseInt(controlPointName.substr(2));
                    let offset = 0;
                    for (let i = 0; i < rowNumber; i++) {
                        const r = item.shapeProps.rowWidths[i];
                        offset += r * H / 100.0;
                    }

                    const width = Math.max(0, movement - offset);

                    const minWidth = 5 / rows;
                    const maxWidth = 100 - 5 / rows;
                    item.shapeProps.rowWidths[rowNumber] = myMath.clamp(100 * width / H, minWidth, maxWidth);
                }
            }
        },

        args: {
            tableStyle: {type: 'choice', value: 'simple', options: [
                'simple', 'flat',
            ], name: 'Style'},

            columns: {type: 'number', value: 3, name: 'Columns', min: minCells, max: maxCells, onUpdate: onColumnNumberUpdate },
            rows: {type: 'number', value: 3, name: 'Rows', min: minCells, max: maxCells, onUpdate: onRowsNumberUpdate },
            fill: {type: 'advanced-color', value: {type: 'solid', color: 'rgba(245, 245, 245, 1.0)'}, name: 'Fill'},
            stroke: {type: 'color', value: 'rgba(145, 178, 196, 1.0)', name: 'Stroke', depends: {tableStyle: 'simple'}},
            strokeSize: {type: 'number', value: 1, name: 'Stroke size', min: 0, softMax: 100, depends: {tableStyle: 'simple'}},
            cellPadding: {type: 'number', value: 2, name: 'Cell padding', min: 0, softMax: 100, depends: {tableStyle: 'flat'}},

            header: {type: 'choice', value: 'columns', options: ['none', 'columns', 'columns-single', 'rows', 'rows-single', 'both'], name: 'Header fill override'},
            headerFill: {type: 'advanced-color', value: {type: 'solid', color: 'rgba(168, 193, 219, 1.0)'}, name: 'Header fill'},
            cutCorner: {type: 'boolean', value: false, name: 'Cut corner', depends: {header: 'both'}},

            oddEvenFill: {type: 'boolean', value: false, name: 'Odd/even fill'},
            rowSecondaryFill: {type: 'advanced-color', value: {type: 'solid', color: 'rgba(234, 241, 246, 1.0)'}, name: 'Row secondary fill', depends: {oddEvenFill: true}},

            colWidths: {type: 'custom', value: [33.3, 33.3], hidden: true},
            rowWidths: {type: 'custom', value: [33.3, 33.3], hidden: true},
        },

        editorProps: {
            textSlotTabsDisabled: true,

            contextMenu(x, y, item) {
                const {row, col} = identifyRowAndColumn(item, x, y);
                const rowNum = row + 1;
                const colNum = col + 1;

                let subOptions = [{
                    name: `Insert column before #${colNum}`, clicked: () => insertColumn(item, col)
                }, {
                    name: `Insert column after #${colNum}`, clicked: () => insertColumn(item, col+1)
                }, {
                    name: `Insert row before #${rowNum}`, clicked: () => insertRow(item, row)
                }, {
                    name: `Insert row after #${rowNum}`, clicked: () => insertRow(item, row+1)
                }];

                if (item.shapeProps.columns > 1) {
                    subOptions.push({ name: `Delete column #${colNum}`, iconClass: 'fas fa-trash', clicked: () => deleteColumn(item, col) });
                }
                if (item.shapeProps.rows > 1) {
                    subOptions.push({ name: `Delete row #${rowNum}`, iconClass: 'fas fa-trash', clicked: () => deleteRow(item, row) });
                }

                subOptions = subOptions.concat([{
                    name: 'Copy text style to column', clicked: () => copyTextStyleToColumn(item, row, col),
                }, {
                    name: 'Copy text style to row', clicked: () => copyTextStyleToRow(item, row, col),
                }, {
                    name: 'Copy text style to all cells', clicked: () => copyTextStyleToAllCells(item, row, col),
                }]);

                if (item.shapeProps.header !== 'none') {
                    subOptions = subOptions.concat([{
                        name: 'Copy text style to header cells', clicked: () => copyTextStyleToHeaderCells(item, row, col),
                    }, {
                        name: 'Copy text style to regular cells', clicked: () => copyTextStyleToRegularCells(item, row, col),
                    }]);

                }

                return [{
                    name: 'Table',
                    subOptions
                }];
            },

            shapePropsEditor: {
                component: TablePropertiesEditor
            },

            // Is invoked from edit-box for rendering additional controls
            editBoxControls: (schemeContainer, item) => {
                const controls = [];
                if (item.shapeProps.columns < maxCells) {
                    controls.push({
                        name: 'Add Column',
                        type: 'button',
                        hPlace: 'right',
                        vPlace: 'center',
                        iconClass: 'fa-solid fa-plus',
                        position: {x: 30, y: 0},
                        click: () => {
                            addColumn(schemeContainer.editorId, item);
                        }
                    });
                }
                if (item.shapeProps.columns > minCells) {
                    controls.push({
                        name: 'Remove Column',
                        type: 'button',
                        hPlace: 'right',
                        vPlace: 'top',
                        iconClass: 'fa-solid fa-minus',
                        position: {x: 0, y: 30},
                        click: () => {
                            removeColumn(schemeContainer.editorId, item);
                        }
                    });
                }
                if (item.shapeProps.rows < maxCells) {
                    controls.push({
                        name: 'Add Row',
                        type: 'button',
                        hPlace: 'center',
                        vPlace: 'bottom',
                        iconClass: 'fa-solid fa-plus',
                        position: {x: 0, y: 30},
                        click: () => {
                            addRow(schemeContainer.editorId, item);
                        }
                    });
                }
                if (item.shapeProps.rows > minCells) {
                    controls.push({
                        name: 'Remove Row',
                        type: 'button',
                        hPlace: 'left',
                        vPlace: 'bottom',
                        iconClass: 'fa-solid fa-minus',
                        position: {x: 30, y: 0},
                        click: () => {
                            removeRow(schemeContainer.editorId, item);
                        }
                    });
                }
                return controls;
            }
        },

        scriptFunctions,
    },

    data() {
        return {
        };
    },

    computed: {
        svgFill() {
            return computeSvgFill(this.item.shapeProps.fill, `fill-pattern-${this.item.id}`);
        },

        outlinePath() {
            return computeOutline(this.item);
        },

        gridLines() {
            const lines = [];
            let offset = 0;
            const cutCorner = this.item.shapeProps.header === 'both' && this.item.shapeProps.cutCorner;

            const firstColumnWidth = this.item.area.w * this.item.shapeProps.colWidths[0] / 100;
            const firstRowWidth = this.item.area.h * this.item.shapeProps.rowWidths[0] / 100;

            for (let i = 1; i < this.item.shapeProps.rows; i++) {
                offset += this.item.shapeProps.rowWidths[i-1] * this.item.area.h / 100;
                lines.push({
                    x1: i === 1  && cutCorner ? firstColumnWidth : 0,
                    x2: this.item.area.w,
                    y1: offset,
                    y2: offset,
                });
            }
            // vertical lines
            offset = 0;
            for (let i = 1; i < this.item.shapeProps.columns; i++) {
                offset += this.item.shapeProps.colWidths[i-1] * this.item.area.w / 100;
                lines.push({
                    x1: offset,
                    x2: offset,
                    y1: i === 1 && cutCorner  ? firstRowWidth : 0,
                    y2: this.item.area.h,
                });
            }
            return lines;
        },

        cells() {
            const fill = computeSvgFill(this.item.shapeProps.fill, `fill-pattern-${this.item.id}`);
            const headerFill = computeSvgFill(this.item.shapeProps.headerFill, `fill-pattern-${this.item.id}-header`);
            const secondaryFill = computeSvgFill(this.item.shapeProps.rowSecondaryFill, `fill-pattern-${this.item.id}-secondary-fill`);
            const header = this.item.shapeProps.header;
            return generateCells(this.item).map(cell => {
                if (cell.row === 0 && (header === 'columns' || header === 'columns-single' || header === 'both')) {
                    cell.fill = headerFill;
                } else if (cell.col === 0 && (header === 'rows' || header === 'rows-single' || header === 'both')) {
                    cell.fill = headerFill;
                } else if (this.item.shapeProps.oddEvenFill && cell.row % 2 === 1) {
                    cell.fill = secondaryFill;
                } else {
                    cell.fill = fill;
                }
                return cell;
            });
        }
    }
};
</script>
