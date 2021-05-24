import myMath from "../../../../../myMath";
import {getStandardRectPins} from '../ShapeDefaults'

function calculateNameLineTop(item) {
    return myMath.clamp(myMath.roundPrecise1(Math.max(item.shapeProps.headerHeight, item.shapeProps.cornerRadius)), 0, item.area.h);
}

function calculateSectionLineTop(item, nameLineTop) {
    return myMath.clamp(myMath.roundPrecise1((item.area.h - nameLineTop) * item.shapeProps.sectionRatio / 100 + nameLineTop), 0, item.area.h);
}

export default {
    shapeConfig: {
        shapeType: 'standard',

        id: 'uml_class',

        menuItems: [{
            group: 'UML',
            name: 'Class',
            iconUrl: '/assets/images/items/uml-class.svg',
            item: {
                textSlots: {
                    title: {text: '<b>Class</b>', fontSize: 16, halign: 'center', valign: 'middle', padding: {top: 6}},
                    section1: {text: '', fontSize: 14, font: 'Courier New', halign: 'left', valign: 'top'},
                    section2: {text: '', fontSize: 14, font: 'Courier New', halign: 'left', valign: 'top'}
                },
            },
        }],

        getPins(item) {
            return getStandardRectPins(item);
        },

        computePath(item) {
            const W = item.area.w;
            const H = item.area.h;
            const R = Math.min(item.shapeProps.cornerRadius, item.area.w/4, item.area.h/4);

            const nameLineTop = calculateNameLineTop(item);
            const sectionLineTop = calculateSectionLineTop(item, nameLineTop);

            return `M ${W-R} ${H}  L ${R} ${H} a ${R} ${R} 0 0 1 ${-R} ${-R}  `
                +`L 0 ${R}  a ${R} ${R} 0 0 1 ${R} ${-R}  `
                +`L ${W-R} 0   a ${R} ${R} 0 0 1 ${R} ${R}  `
                +`L ${W} ${H-R}   a ${R} ${R} 0 0 1 ${-R} ${R} Z`
                +`M 0 ${nameLineTop} l ${W} 0`
                +`M 0 ${sectionLineTop} l ${W} 0`;
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
            const nameLineTop = calculateNameLineTop(item);
            const sectionLineTop = calculateSectionLineTop(item, nameLineTop);

            return [{
                name: 'title',
                area: {x: 0, y: 0, w: item.area.w, h: nameLineTop}
            }, {
                name: 'section1',
                area: {x: 0, y: nameLineTop, w: item.area.w, h: sectionLineTop - nameLineTop}
            }, {
                name: 'section2',
                area: {x: 0, y: sectionLineTop, w: item.area.w, h: item.area.h - sectionLineTop}
            }];
        },

        controlPoints: {
            make(item) {
                return {
                    headerHeight: {
                        x: item.area.w / 2,
                        y: item.shapeProps.headerHeight
                    },
                    cornerRadius: {
                        x: item.area.w - item.shapeProps.cornerRadius,
                        y: 0
                    },
                    sectionRatio: {
                        x: item.area.w / 2,
                        y: calculateSectionLineTop(item, calculateNameLineTop(item))
                    },
                };
            },
            handleDrag(item, controlPointName, originalX, originalY, dx, dy) {
                if (controlPointName === 'headerHeight') {
                    item.shapeProps.headerHeight = myMath.clamp(myMath.roundPrecise1(originalY + dy), 0, item.area.h);
                } else if (controlPointName === 'cornerRadius') {
                    item.shapeProps.cornerRadius = myMath.clamp(myMath.roundPrecise1(item.area.w - originalX - dx), 0, Math.min(item.area.w/4, item.area.h/4));
                } else if (controlPointName === 'sectionRatio') {
                    const nameLineTop = calculateNameLineTop(item);
                    const bodyHeight = Math.max(0, item.area.h - nameLineTop);
                    if (bodyHeight > 0) {
                        item.shapeProps.sectionRatio = myMath.clamp(myMath.roundPrecise1(Math.max(0, originalY + dy - nameLineTop) * 100 / bodyHeight), 0, 100);
                    }
                }
            }
        },

        args: {
            cornerRadius: {type: 'number', value: '0', name: 'Corner radius'},
            headerHeight: {type: 'number', value: 30, name: 'Header Height'},
            sectionRatio: {type: 'number', value: 50, name: 'Section Ratio (%)', min: 0, max: 100}
        }
    }
}
