
let scIiterator = 1;
function _sc(fillColor, strokeColor, textColor) {
    return {
        id         : `simple-color-style-${scIiterator++}`,
        fill       : {type: 'solid', color: fillColor},
        strokeColor: strokeColor,
        textColor  : textColor
    }
}
const simpleColors = {
    name: 'Simple Colors',
    styles: [
        _sc('rgba(255,255,255,1.0)', 'rgba(0,0,0,1.0)', 'rgba(0,0,0,1.0)'),
        _sc('rgba(0,0,0,1.0)', 'rgba(255,255,255,1.0)', 'rgba(255,255,255,1.0)'),
        _sc('rgba(255,0,0,1.0)', 'rgba(0,0,0,1.0)', 'rgba(0,0,0,1.0)'),
    ]
};




export default [simpleColors]