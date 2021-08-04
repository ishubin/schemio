
const effects = {
    'drop-shadow': {
        name: 'Drop Shadow',
        args: {
            color  : {type: 'color', value: 'rgba(0,0,0,1.0)', name: 'Color'},
            dx     : {type: 'number', value: 10, name: 'Offset X'},
            dy     : {type: 'number', value: 10, name: 'Offset Y'},
            blur   : {type: 'number', value: 0.2, name: 'Blur', min: 0, max: 100},
            opacity: {type: 'number', value: 50, name: 'Opacity (%)', min: 0, max: 100},
        },

        applySVGFilterEffect(item, effectArgs) {
            const el = document.createElementNS('http://www.w3.org/2000/svg', 'feDropShadow');
            el.setAttribute('dx', effectArgs.dx);
            el.setAttribute('dy', effectArgs.dy);
            el.setAttribute('stdDeviation', effectArgs.blur);
            el.setAttribute('flood-color', effectArgs.color);
            el.setAttribute('flood-opacity', effectArgs.opacity / 100.0);

            return el.outerHTML;
        }
    }
}


export function getEffects() {
    return effects;
}

export function getEffectById(effectId) {
    return effects[effectId];
}