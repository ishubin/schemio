import expect from 'expect';
import {parseColor} from '../src/ui/colors';

describe('parseColor', () => {
    it('it should parse color from rgb(...) format', () => {
        const testParams = [
            [ 'rgb(0,1,2)',         {r: 0, g: 1, b: 2, a: 1.0} ],
            [ 'rgb ( 1 , 1 , 2 )',  {r: 1, g: 1, b: 2, a: 1.0} ],
            [ 'rgb  (2, 1, 2)',     {r: 2, g: 1, b: 2, a: 1.0} ],
            [ 'rgb  (120, 141, 42)',{r: 120, g: 141, b: 42, a: 1.0} ],
        ];
        for (let i = 0; i < testParams.length; i++) {
            expect(parseColor(testParams[i][0])).toStrictEqual(testParams[i][1]);
        }
    });

    it('it should parse color from rgb(...) format', () => {
        const testParams = [
            [ 'rgba(0,1,2,0.05)',         {r: 0, g: 1, b: 2, a: 0.05} ],
            [ 'rgba ( 1 , 1 , 2 , 0.05)', {r: 1, g: 1, b: 2, a: 0.05} ],
            [ 'rgba  (2, 1, 2, 1.0)',     {r: 2, g: 1, b: 2, a: 1.0} ],
            [ 'rgba  (120, 141, 42, 0.6)',{r: 120, g: 141, b: 42, a: 0.6} ],
        ];
        for (let i = 0; i < testParams.length; i++) {
            expect(parseColor(testParams[i][0])).toStrictEqual(testParams[i][1]);
        }
    });

    it('it should parse color from hex format', () => {
        const testParams = [
            [ '#ffa',        {r: 255, g: 255, b: 170, a: 1.0} ],
            [ '#3aFAb0',     {r: 58, g: 250, b: 176, a: 1.0} ],
            [ '#000081',     {r: 0, g: 0, b: 129, a: 1.0} ],
        ];
        for (let i = 0; i < testParams.length; i++) {
            expect(parseColor(testParams[i][0])).toStrictEqual(testParams[i][1]);
        }
    });
});
