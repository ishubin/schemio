import Shape from '../src/ui/components/editor/items/shapes/Shape.js';
import expect from 'expect';


describe('Shape.js', () => {
    it('Should allow to create a custom shape', () => {
        const result = Shape.load(`
            <g>
                <rect x="0" y="0" :width="width" :height="height" :stroke-size="strokeSize" :stroke="strokeColor" :fill="backgroundColor"></rect>
            </g>
        `).render({
            x: 2, y:3, width: 101, height: 102, strokeSize: 1, strokeColor: "#f00", backgroundColor: "#fff"
        });

        expect(result).toBe(`
            <g>
                <rect x="0" y="0" width="101" height="102" stroke-size="1" stroke="#f00" fill="#fff"></rect>
            </g>
        `);
    })
});
