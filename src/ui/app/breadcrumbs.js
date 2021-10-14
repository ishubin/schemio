import forEach from 'lodash/forEach';


export function buildBreadcrumbs(path) {
    let currentPath = '';

    const breadcrumbs = [{
        path: '',
        name: 'Home',
        kind: 'home'
    }];

    forEach(path.split('/'), dirName => {
        if (currentPath.length === 0) {
            currentPath = dirName;
        } else {
            currentPath = currentPath + '/' + dirName;
        }

        breadcrumbs.push({
            path: currentPath,
            name: dirName,
            kind: 'dir'
        });
    });

    return breadcrumbs;
}