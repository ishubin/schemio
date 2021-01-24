import { SpatialIndex } from '../src/ui/SpatialIndex'
import expect from 'expect';


describe('SpatialIndex', () => {
    const spatialIndex = new SpatialIndex();

    spatialIndex.addPoint(0,    0,      {name: 'A'});
    spatialIndex.addPoint(10,   10,     {name: 'B'});
    spatialIndex.addPoint(-10, -10,     {name: 'C'});
    spatialIndex.addPoint(4,    6,      {name: 'D'});
    spatialIndex.addPoint(5,    7,      {name: 'E'});
    spatialIndex.addPoint(5,    11,      {name: 'F'});

    const findPointsInRange = (x1, y1, x2, y2) => {
        const points = [];
        spatialIndex.forEachInRange(x1, y1, x2, y2, (value, point) => {
            points.push({
                x: point.x,
                y: point.y,
                value
            });
        });

        return points;
    }

    it('should query range 1', () => {
        const points = findPointsInRange(0, 0, 10, 10);
        expect(points).toStrictEqual([{
            x: 0, y: 0, value: {name: 'A'},
        }, {
            x: 10, y: 10, value: {name: 'B'},
        }, {
            x: 4, y: 6, value: {name: 'D'},
        }, {
            x: 5, y: 7, value: {name: 'E'},
        }]);
    });

    it('should query range 2', () => {
        const points = findPointsInRange(5, 5, 11, 11);
        expect(points).toStrictEqual([{
            x: 10, y: 10, value: {name: 'B'},
        }, {
            x: 5, y: 11, value: {name: 'F'},
        }, {
            x: 5, y: 7, value: {name: 'E'},
        }]);
    });
});
