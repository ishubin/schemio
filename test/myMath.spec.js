import myMath from '../src/ui/myMath';
import expect from 'expect';


describe('myMath.overlappingArea', () => {
    it('should calculate overlapping area 1', () => {
        const result = myMath.overlappingArea({
            x: 0, y: 0,
            w: 100, h: 50
        }, {
            x: 52, y: 30,
            w: 200, h: 300
        });
        expect(result).toStrictEqual({
            x: 52, y: 30,
            w: 48, h: 20
        });
    });

    it('should calculate overlapping area 2', () => {
        const result = myMath.overlappingArea({
            x: 0, y: 0,
            w: 100, h: 50
        }, {
            x: -10, y: -30,
            w: 200, h: 300
        });
        expect(result).toStrictEqual({
            x: 0, y: 0,
            w: 100, h: 50
        });
    });

    it('should calculate overlapping area 3', () => {
        const result = myMath.overlappingArea({
            x: 0, y: 0,
            w: 100, h: 50
        }, {
            x: 520, y: 30,
            w: 200, h: 300
        });
        expect(result).toBeNull();
    });
});