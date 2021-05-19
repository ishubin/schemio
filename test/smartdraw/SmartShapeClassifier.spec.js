import fs from 'fs';
import forEach from 'lodash/forEach';
import { identifyShape } from '../../src/ui/components/editor/items/shapes/SmartShapeClassifier';


function verifyDrawnShapes(shape, sampleFiles) {
    forEach(sampleFiles, fileName => {
        fs.readFile(fileName, 'utf8', (err, data) => {
            if (err) {
                throw err;
            }

            const scheme = JSON.parse(data);
            
            const curveItems = [];
            forEach(scheme.items, item => {
                if (item.shape === 'curve') {
                    curveItems.push(item);
                }
            });
            if (curveItems.length === 0) {
                throw new Error(`${fileName} contains no items`);
            }


            let matchResults = '';
            let hasMisses = false;
            forEach(curveItems, item => {
                const shapeMatch = identifyShape(item.shapeProps.points);

                matchResults += `${shape} "${item.name}" in ${fileName} was identified as ${shapeMatch.shape} with score ${shapeMatch.score}\n`;

                console.log('Shape match', fileName, shape, item.name, shapeMatch);
                if (shapeMatch.shape !== shape) {
                    hasMisses = true;
                }
            });
            if (hasMisses) {
                throw new Error(`Some drawings were not identified correctly:\n${matchResults}`);
            }
        });
    });
}

describe('SmartShapeClassifier', () => {
    it('should correctly identify rect shapes', () => {
        verifyDrawnShapes('rect', [ 'test/smartdraw/samples/rect.samples.scheme.json' ]);
    });

    it('should correctly identify ellipse shapes', () => {
        verifyDrawnShapes('ellipse', [ 'test/smartdraw/samples/ellipse.samples.scheme.json' ]);
    });

    it('should correctly identify triangle shapes', () => {
        verifyDrawnShapes('basic_triangle', [ 'test/smartdraw/samples/triangle.samples.scheme.json' ]);
    });

    it('should correctly identify uml_object shapes', () => {
        verifyDrawnShapes('uml_object', [ 'test/smartdraw/samples/uml_object.samples.scheme.json' ]);
    });

    it('should correctly identify diamond shapes', () => {
        verifyDrawnShapes('basic_diamond', [ 'test/smartdraw/samples/basic_diamond.samples.scheme.json' ]);
    });
});
