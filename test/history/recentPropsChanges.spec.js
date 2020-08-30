import recentPropsChanges from '../../src/ui/history/recentPropsChanges';
import expect from 'expect';


describe('recentPropsChanges', () => {
    it('should record changes for items and apply them', () => {
        recentPropsChanges.registerItemShapeProp('rect', 'strokeSize', 4);
        recentPropsChanges.registerItemShapeProp('rect', 'strokePattern', 'solid');
        recentPropsChanges.registerItemShapeProp('ellipse', 'fillColor', '#fff');

        const item = {
            id: 'qwe',
            shape: 'rect',
            shapeProps: {
                strokeSize: 1,
                strokePattern: 'dashed',
                fillColor: '#000'
            }
        };
        recentPropsChanges.applyItemProps(item);

        expect(item).toStrictEqual({
            id: 'qwe',
            shape: 'rect',
            shapeProps: {
                strokeSize: 4,
                strokePattern: 'solid',
                fillColor: '#000'
            }
        })
    });
});

describe('recentPropsChanges', () => {
    it('should record changes for item text properties and apply them', () => {
        recentPropsChanges.registerItemTextProp('rect', 'body', 'color', '#f0f');
        recentPropsChanges.registerItemTextProp('rect', 'body', 'fontSize', 19);
        recentPropsChanges.registerItemTextProp('ellipse', 'body', 'color', '#000');

        const item = {
            id: 'qwe',
            shape: 'rect',
            textSlots: {
                body: {
                    color: '#aaa',
                    fontSize: 13
                }
            },
            shapeProps: {
                strokeSize: 1,
                strokePattern: 'dashed',
                fillColor: '#000'
            }
        };
        recentPropsChanges.applyItemProps(item);

        expect(item).toStrictEqual({
            id: 'qwe',
            shape: 'rect',
            textSlots: {
                body: {
                    color: '#f0f',
                    fontSize: 19
                }
            },
            shapeProps: {
                strokeSize: 4,
                strokePattern: 'solid',
                fillColor: '#000'
            }
        })
        
    });
});