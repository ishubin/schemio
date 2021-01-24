export default {
    shapeConfig: {
        shapeType: 'standard',

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

        args: {
            cornerRadius: {type: 'number', value: '0', name: 'Corner radius'},
            headerHeight: {type: 'number', value: 30, name: 'Header Height'}
        }
    }
}