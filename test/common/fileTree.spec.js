import { deleteEntryFromFileTree, renameEntryInFileTree } from "../../src/common/fs/fileTree";
import expect from 'expect';

describe('fileTree', () => {
    it('renameEntryInFileTree should update path of all children', () => {
        const tree = [{
            name: 'a',
            kind: 'dir',
            path: 'a',
            children: [{
                name: 'b',
                kind: 'dir',
                path: 'a/b',
                children: [{
                    name: 'c1',
                    kind: 'dir',
                    path: 'a/b/c',
                    children: [{
                        name: 'c1_file',
                        kind: 'schemio:doc',
                        path: 'a/b/c1/c1_file'
                    }]
                }, {
                    name: 'c2_file',
                    kind: 'schemio:doc',
                    path: 'a/b/c2_file'
                }]
            }]
        }];
        renameEntryInFileTree(tree, 'a/b', 'e2');

        expect(tree).toStrictEqual([{
            name: 'a',
            kind: 'dir',
            path: 'a',
            children: [{
                name: 'e2',
                kind: 'dir',
                path: 'a/e2',
                children: [{
                    name: 'c1',
                    kind: 'dir',
                    path: 'a/e2/c',
                    children: [{
                        name: 'c1_file',
                        kind: 'schemio:doc',
                        path: 'a/e2/c1/c1_file'
                    }]
                }, {
                    name: 'c2_file',
                    kind: 'schemio:doc',
                    path: 'a/e2/c2_file'
                }]
            }]
        }]);
    });


    it('renameEntryInFileTree should update path of all children 2', () => {
        const tree = [{
            name: 'a',
            kind: 'dir',
            path: 'a',
            children: [{
                name: 'b2',
                kind: 'dir',
                path: 'a/b2',
                children: [{
                    name: 'c1',
                    kind: 'dir',
                    path: 'a/b2/c',
                    children: [{
                        name: 'c1_file',
                        kind: 'schemio:doc',
                        path: 'a/b2/c1/c1_file'
                    }]
                }, {
                    name: 'c2_file',
                    kind: 'schemio:doc',
                    path: 'a/b2/c2_file'
                }]
            }]
        }];
        renameEntryInFileTree(tree, 'a/b2', 'e');

        expect(tree).toStrictEqual([{
            name: 'a',
            kind: 'dir',
            path: 'a',
            children: [{
                name: 'e',
                kind: 'dir',
                path: 'a/e',
                children: [{
                    name: 'c1',
                    kind: 'dir',
                    path: 'a/e/c',
                    children: [{
                        name: 'c1_file',
                        kind: 'schemio:doc',
                        path: 'a/e/c1/c1_file'
                    }]
                }, {
                    name: 'c2_file',
                    kind: 'schemio:doc',
                    path: 'a/e/c2_file'
                }]
            }]
        }]);
    });

    it('deleteEntryFromFileTree should delete directory', () => {
        const tree = [{
            name: 'a',
            kind: 'dir',
            path: 'a',
            children: [{
                name: 'b2',
                kind: 'dir',
                path: 'a/b2',
                children: [{
                    name: 'c1',
                    kind: 'dir',
                    path: 'a/b2/c',
                    children: [{
                        name: 'c1_file',
                        kind: 'schemio:doc',
                        path: 'a/b2/c1/c1_file'
                    }]
                }, {
                    name: 'c2_file',
                    kind: 'schemio:doc',
                    path: 'a/b2/c2_file'
                }]
            }]
        }, {
            name: 'a2',
            kind: 'schemio:doc',
            path: 'a2'
        }];

        deleteEntryFromFileTree(tree, 'a');

        expect(tree).toStrictEqual([{
            name: 'a2',
            kind: 'schemio:doc',
            path: 'a2'
        }]);
    });
});