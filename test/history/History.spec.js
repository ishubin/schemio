import History from '../../src/ui/history/History.js';
import expect from 'expect';
import sinon from 'sinon';



describe('History', () => {
    it('should commit into history and hold only specified amount of checkpoints', () => {
        const history = new History({size: 3});

        for (let i = 0; i < 10; i++) {
            history.commit({index: i});
        }

        expect(history.checkpoints).toStrictEqual([
            {index: 7}, {index: 8}, {index: 9} 
        ]);

        expect(history.current()).toStrictEqual({index: 9});
    });


    it('should undo history', () => {
        const history = new History({size: 3});

        for (let i = 0; i < 10; i++) {
            history.commit({index: i});
        }

        history.undo();

        expect(history.checkpoints).toStrictEqual([
            {index: 7}, {index: 8}, {index: 9} 
        ]);
        expect(history.current()).toStrictEqual({index: 8});

        history.undo();
        history.undo();
        expect(history.current()).toStrictEqual({index: 7});
    });


    it('should redo history', () => {
        const history = new History({size: 3});

        for (let i = 0; i < 10; i++) {
            history.commit({index: i});
        }

        history.undo();
        history.undo();
        history.redo();

        expect(history.checkpoints).toStrictEqual([
            {index: 7}, {index: 8}, {index: 9} 
        ]);
        expect(history.current()).toStrictEqual({index: 8});
    });


    it('should delete irrelevant history when commiting after undo', () => {
        const history = new History({size: 5});

        for (let i = 0; i < 5; i++) {
            history.commit({index: i});
        }

        history.undo();
        history.undo();
        history.commit({index: 1000});

        expect(history.checkpoints).toStrictEqual([
            {index: 0}, {index: 1}, {index: 2}, {index: 1000} 
        ]);
        expect(history.current()).toStrictEqual({index: 1000});

    });


    it('should undo commit two times', () => {
        const history = new History({size: 5});
        history.commit({animal: 'Cat'});
        history.commit({animal: 'Dog'});
        history.undo();
        history.commit({animal: 'Lizzard'});
        history.undo();


        expect(history.checkpoints).toStrictEqual([
            {animal: 'Cat'}, {animal: 'Lizzard'}
        ]);
        expect(history.current()).toStrictEqual({animal: 'Cat'});
    });


    /*
        The following feature is needed so that we don't generate massive amount of checkpoints 
        for each symbol typed inside any property textfield. 
        Since each modification of text triggers a commit, it might make sense to group checkpoints
    */
    it('should overwrite commits if they are specified with the same affinity', () => {
        const history = new History({size: 5});
        history.commit({name: 'John', age: 32});
        history.commit({name: 'John', age:33}, 'person.age');
        history.commit({name: 'John', age:36}, 'person.age');
        history.commit({name: 'Johny', age:36}, 'person.name');
        history.commit({name: 'Jonathan', age:36}, 'person.name');


        expect(history.checkpoints).toStrictEqual([
            {name: 'John', age: 32}, {name: 'John', age: 36}, {name: 'Jonathan', age: 36}
        ]);
        expect(history.current()).toStrictEqual({name: 'Jonathan', age: 36});

    });
});
