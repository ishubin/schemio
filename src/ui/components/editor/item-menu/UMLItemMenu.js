import utils from '../../../../ui/utils.js';

const defaultItem = {
    interactive: false,
    opacity: 1.0,
    blendMode: 'normal',
    name: '',
    description: '',
    text: '',
    links: []
};

export default [{
    name: 'Object',
    item: utils.extendObject({
        shape: 'uml_object',
        shapeProps: {}
    }, defaultItem)
}]