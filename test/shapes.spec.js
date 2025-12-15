
import Shape from '../src/ui/components/editor/items/shapes/Shape';
import { forEach } from '../src/ui/collections';
import { enrichItemWithDefaults } from '../src/ui/scheme/ItemFixer';
import { defaultItem } from '../src/ui/scheme/Item';
import utils from '../src/ui/utils';



describe('Shapes', () => {
    it('should have consistent properties', () => {
        forEach(Shape.getRegistry(), (shape, name) =>{
            const item = {
                ...utils.clone(defaultItem),
                shape: name,
                shapeProps: {}
            };
            enrichItemWithDefaults(item);
            const pins = shape.getPins(item);
            if (Array.isArray(pins)) {
                throw new Error(`shape "${name}" generates invalid pins: Array`);
            }
            if (!pins) {
                throw new Error(`shape "${name}" generates invalid pins: null`);
            }
        });
    });
});