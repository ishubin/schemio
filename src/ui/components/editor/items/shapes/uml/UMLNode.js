const calculateD = (item) => {
    let D = item.shapeProps.depth;
    const minD = Math.min(item.area.w, item.area.h) / 4;
    if (D > minD) {
        D =  minD;
    }
    return D;
};


export default {
    shapeConfig: {
        shapeType: 'standard',

        id: 'uml_node',

        menuItems: [{
            group: 'UML',
            name: 'Node',
            iconUrl: '/assets/images/items/uml-node.svg',
        }],

        computePath(item) {
            const W = item.area.w;
            const H = item.area.h;
            const D = calculateD(item);
            return `M 0 ${D}  L ${W-D} ${D}  L ${W-D} ${H} L 0 ${H} Z`
                    +`M 0 ${D} L ${D} 0 L ${W} 0 L ${W-D} ${D} Z`
                    +`M ${W-D} ${D} L ${W} 0 L ${W} ${H-D} L ${W-D} ${H} Z`;
        },

        computeOutline(item) {
            const W = item.area.w;
            const H = item.area.h;
            const D = calculateD(item);
            return `M 0 ${D}  L ${D} 0  L ${W} 0  L ${W} ${H-D} L ${W-D} ${H} L 0 ${H} Z`;
        },

        args: {
            depth: {type: 'number', value: 20, name: 'Depth'},
        },
    }
}