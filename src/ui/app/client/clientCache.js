
const schemeInfoMap = new Map();

export function getCachedSchemeInfo(schemeId, executor) {
    if (schemeInfoMap.has(schemeId)) {
        return Promise.resolve(schemeInfoMap.get(schemeId));
    }

    return executor().then(schemeInfo => {
        schemeInfoMap.set(schemeId, schemeInfo);
        return schemeInfo;
    });
}

export function schemeSearchCacher(response) {
    if (Array.isArray(response.results)) {
        response.results.forEach(scheme => {
            schemeInfoMap.set(scheme.id, {id: scheme.id, name: scheme.name});
        });
    }
    return response;
}