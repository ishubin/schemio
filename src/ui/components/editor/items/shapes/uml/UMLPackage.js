
export default {
    shapeConfig: {
        shapeType: 'standard',

        id: 'uml_package',

        menuItems: [{
            group: 'UML',
            name: 'Package',
            iconUrl: '/assets/images/items/uml-package.svg',
        }],

        getPins(item) {
            const w = item.area.w;
            const h = item.area.h;
            const bh = Math.min(Math.max(0, item.shapeProps.brickHeight), item.area.h/2);
            const H = h - bh;

            return [{
                x: w/2, y: bh + H/2,
            }, {
                x: w / 2, y: bh,
                nx: 0, ny: -1
            }, {
                x: w / 2, y: h,
                nx: 0, ny: 1
            }, {
                x: 0, y: bh + H/2,
                nx: -1, ny: 0
            }, {
                x: w, y: bh + H/2,
                nx: 1, ny: 0
            }];

        },

        computePath(item) {
            const W = item.area.w;
            const H = item.area.h;
            const BW = Math.min(Math.max(0, item.shapeProps.brickWidth), item.area.w/2);
            const BH = Math.min(Math.max(0, item.shapeProps.brickHeight), item.area.h/2);

            return `M 0 0  L ${BW} 0 L ${BW} ${BH} L 0 ${BH} Z`
                    +`M ${0} ${BH} L ${W} ${BH} L ${W} ${H} L 0 ${H} Z`;
        },

        computeOutline(item) {
            const W = item.area.w;
            const H = item.area.h;
            const BW = Math.min(Math.max(0, item.shapeProps.brickWidth), item.area.w/2);
            const BH = Math.min(Math.max(0, item.shapeProps.brickHeight), item.area.h/2);

            return `M 0 0  L ${BW} 0 L ${BW} ${BH}  L ${W} ${BH} L ${W} ${H} L 0 ${H} Z`;
        },

        args: {
            brickWidth: {type: 'number', value: 60, name: 'Brick width', min: 0},
            brickHeight: {type: 'number', value: 20, name: 'Brick height', min: 0},
        },
    }
}