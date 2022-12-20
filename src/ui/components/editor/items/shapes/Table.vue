<!-- This Source Code Form is subject to the terms of the Mozilla Public
     License, v. 2.0. If a copy of the MPL was not distributed with this
     file, You can obtain one at https://mozilla.org/MPL/2.0/. -->
<template>
    <g>
        <advanced-fill :fillId="`fill-pattern-${item.id}`" :fill="item.shapeProps.fill" :area="item.area"/>
        <advanced-fill :fillId="`fill-pattern-${item.id}-header`" :fill="item.shapeProps.headerFill" :area="item.area"/>
        <advanced-fill :fillId="`fill-pattern-${item.id}-secondary-fill`" :fill="item.shapeProps.rowSecondaryFill" :area="item.area"/>

        <g v-if="item.shapeProps.style === 'simple'">
            <path :d="shapePath" stroke="none" :fill="svgFill"/>
            <path :d="shapePath" :stroke="item.shapeProps.stroke" fill="none" :stroke-width="`${item.shapeProps.strokeSize}px`" />
            <path v-for="r in rows"
                :d="`M 0 ${r} l ${item.area.w} 0`"
                :stroke="item.shapeProps.stroke"
                :stroke-width="`${item.shapeProps.strokeSize}px`"
                fill="none"/>
            <path v-for="c in columns"
                :d="`M ${c} 0 l 0 ${item.area.h}`"
                :stroke="item.shapeProps.stroke"
                :stroke-width="`${item.shapeProps.strokeSize}px`"
                fill="none"/>
        </g>
        <g v-if="item.shapeProps.style === 'flat'">
            <rect v-for="c in cells" :x="c.area.x" :y="c.area.y" :width="c.area.w" :height="c.area.h" stroke="none" :fill="c.fill"/>
        </g>
    </g>
</template>

<script>
import AdvancedFill from '../AdvancedFill.vue';
import myMath from '../../../../myMath';
import EditorEventBus from '../../EditorEventBus';

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
                    item.textSlots[key] = {text: ''};
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
                    item.textSlots[key] = {text: ''};
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
    return `M 0 0 L ${item.area.w} 0 L ${item.area.w} ${item.area.h} L 0 ${item.area.h} Z`;
}

function generateCells(item) {
    const cells = [];
    let rowOffset = 0;
    let remainingRowWidth = item.area.h;
    for (let i = 0; i < item.shapeProps.rows; i++) {
        const rowWidth = Math.min(remainingRowWidth, i < item.shapeProps.rows - 1 ? item.shapeProps.rowWidths[i] * item.area.h / 100 : remainingRowWidth);

        let columnOffset = 0;
        let remainingColumnWidth = item.area.w;
        for (let j = 0; j < item.shapeProps.columns; j++) {
            const columnWidth = Math.min(remainingColumnWidth, j < item.shapeProps.columns - 1 ? item.shapeProps.colWidths[j] * item.area.w / 100 : remainingColumnWidth);
            let x1 = columnOffset;
            let x2 = columnOffset + columnWidth;
            let y1 = rowOffset;
            let y2 = rowOffset + rowWidth;

            let pad = 0;
            if (item.shapeProps.style === 'flat') {
                pad = item.shapeProps.cellPadding;
            }

            x1 = Math.min(x1 + pad, x2);
            y1 = Math.min(y1 + pad, y2);

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

export default {
    props: ['item'],
    components: {AdvancedFill},

    shapeConfig: {
        shapeType: 'vue',

        id: 'uml_table',

        menuItems: [{
            group: 'table',
            name: 'Table',
            iconUrl: '/assets/images/items/uml-swim-lane.svg',
            item: {
                shapeProps: {
                    columns: 3,
                    rows: 3
                },
                textSlots: {
                }
            },
            previewArea: { x: 5, y: 5, w: 200, h: 100},
            size: {w: 200, h: 100}
        }],

        computeOutline,

        getTextSlots,

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
            style: {type: 'choice', value: 'simple', options: [
                'simple', 'flat',
            ], name: 'Style'},

            columns: {type: 'number', value: 3, name: 'Columns', min: minCells, max: maxCells, onUpdate: onColumnNumberUpdate },
            rows: {type: 'number', value: 3, name: 'Rows', min: minCells, max: maxCells, onUpdate: onRowsNumberUpdate },
            fill: {type: 'advanced-color', value: {type: 'solid', color: 'rgba(245, 245, 245, 1.0)'}, name: 'Fill'},
            stroke: {type: 'color', value: 'rgba(90, 90, 90, 1.0)', name: 'Stroke', depends: {style: 'simple'}},
            strokeSize: {type: 'number', value: 1, name: 'Stroke size', depends: {style: 'simple'}},
            cellPadding: {type: 'number', value: 2, name: 'Cell padding', depends: {style: 'flat'}},

            header: {type: 'choice', value: 'none', options: ['none', 'columns', 'rows', 'both'], name: 'Header fill override'},
            headerFill: {type: 'advanced-color', value: {type: 'solid', color: 'rgba(245, 215, 145, 1.0)'}, name: 'Header fill'},

            oddEvenFill: {type: 'boolean', value: false, name: 'Odd/even fill'},
            rowSecondaryFill: {type: 'advanced-color', value: {type: 'solid', color: 'rgba(225, 225, 225, 1.0)'}, name: 'Row secondary fill', depends: {oddEvenFill: true}},

            colWidths: {type: 'custom', value: [33.3, 33.3, 33.3], hidden: true},
            rowWidths: {type: 'custom', value: [33.3, 33.3, 33.3], hidden: true},
        },

        editorProps: {
            textSlotTabsDisabled: true,

            // Is invoked from multi-item-edit-box for rendering addition controls
            editBoxControls: (editorId, item) => {
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
                            addColumn(editorId, item);
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
                            removeColumn(editorId, item);
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
                            addRow(editorId, item);
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
                            removeRow(editorId, item);
                        }
                    });
                }
                return controls;
            }
        }
    },

    data() {
        return {
        };
    },

    computed: {
        shapePath() {
            return computeOutline(this.item);
        },

        svgFill() {
            return AdvancedFill.computeSvgFill(this.item.shapeProps.fill, `fill-pattern-${this.item.id}`);
        },

        rowCount() {
            return Math.max(1, this.item.shapeProps.rows);
        },

        colCount() {
            return Math.max(1, this.item.shapeProps.columns);
        },

        columns() {
            const cols = [];
            let offset = 0;
            for (let i = 0; i < this.item.shapeProps.columns - 1; i++) {
                offset += this.item.shapeProps.colWidths[i] * this.item.area.w / 100.0;
                cols.push(Math.min(offset, this.item.area.w));
            }
            return cols;
        },

        rows() {
            const rows = [];
            let offset = 0;
            for (let i = 0; i < this.item.shapeProps.rows - 1; i++) {
                offset += this.item.shapeProps.rowWidths[i] * this.item.area.h / 100.0;
                rows.push(Math.min(offset, this.item.area.h));
            }
            return rows;
        },

        cells() {
            const fill = AdvancedFill.computeSvgFill(this.item.shapeProps.fill, `fill-pattern-${this.item.id}`);
            const headerFill = AdvancedFill.computeSvgFill(this.item.shapeProps.headerFill, `fill-pattern-${this.item.id}-header`);
            const secondaryFill = AdvancedFill.computeSvgFill(this.item.shapeProps.rowSecondaryFill, `fill-pattern-${this.item.id}-secondary-fill`);
            return generateCells(this.item).map(cell => {
                if (cell.row === 0 && (this.item.shapeProps.header === 'columns' || this.item.shapeProps.header === 'both')) {
                    cell.fill = headerFill;
                } else if (cell.col === 0 && (this.item.shapeProps.header === 'rows' || this.item.shapeProps.header === 'both')) {
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
