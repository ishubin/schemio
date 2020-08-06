export default {
    shapeType: 'standard',

    computePath(item) {
        const W = item.area.w;
        const H = item.area.h;

        const w = Math.min(item.shapeProps.brickWidth, item.area.w/2);
        const h = Math.min(item.shapeProps.brickHeight, item.area.h/4);

        const R = Math.min(item.shapeProps.cornerRadius, item.area.w/4, item.area.h/4, h, w);

        return `M ${W-R} ${H}  L ${w/2+R} ${H} `
                +`a ${R} ${R} 0 0 1 ${-R} ${-R} `
                +`L ${w/2} ${4*h} L ${w} ${4*h} L ${w} ${3*h} L ${w/2} ${3*h} L ${w/2} ${2*h} L ${w} ${2*h} L ${w} ${h} L ${w/2} ${h} L ${w/2} ${R}`
                +`a ${R} ${R} 0 0 1 ${R} ${-R}   `
                +`L ${W-R} 0   a ${R} ${R} 0 0 1 ${R} ${R}  L ${W} ${H-R}   a ${R} ${R} 0 0 1 ${-R} ${R} Z`
                +`M 0 ${h} l ${w} 0  l 0 ${h} l ${-w} 0 Z`
                +`M 0 ${3*h} l ${w} 0  l 0 ${h} l ${-w} 0 Z`;
    },

    getTextSlots(item) {
        const w = Math.min(item.shapeProps.brickWidth, item.area.w/2);
        const h = Math.min(item.shapeProps.brickHeight, item.area.h/4);

        return [{
            name: 'title',
            area: {x: w/2, y: 0, w: Math.max(0, item.area.w - w/2), h: item.shapeProps.headerHeight}
        }, {
            name: 'body',
            area: {x: w, y: item.shapeProps.headerHeight, w: Math.max(0, item.area.w - w), h: Math.max(10, item.area.h - item.shapeProps.headerHeight)}
        }];
    },

    args: {
        cornerRadius: {type: 'number', value: '0', name: 'Corner radius'},
        brickWidth  : {type: 'number', value: '70', name: 'Brick Width'},
        brickHeight : {type: 'number', value: '20', name: 'Brick Height'},
        headerHeight: {type: 'number', value: '30', name: 'Header Height', min: 0},
    },
}