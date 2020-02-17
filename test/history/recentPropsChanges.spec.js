import recentPropsChanges from '../../src/ui/history/recentPropsChanges';
import expect from 'expect';


describe('recentPropsChanges', () => {
    it('should record changes for items and apply them', () => {
        recentPropsChanges.registerItemProp('rect', 'shapeProps.strokeSize', 4);
        recentPropsChanges.registerItemProp('rect', 'shapeProps.strokePattern', 'solid');
        recentPropsChanges.registerItemProp('ellipse', 'shapeProps.fillColor', '#fff');


        const item = {
            id: 'qwe',
            shapeProps: {
                strokeSize: 1,
                strokePattern: 'dashed',
                fillColor: '#000'
            }
        };
        recentPropsChanges.applyItemProps(item, 'rect');

        expect(item).toStrictEqual({
            id: 'qwe',
            shapeProps: {
                strokeSize: 4,
                strokePattern: 'solid',
                fillColor: '#000'
            }
        })
    });
});
