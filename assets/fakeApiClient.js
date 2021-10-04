(() => {
    window.FakeApiClient = {
        createArt(art) {
            return Promise.resolve(null);
        },

        getAllArt() {
            return Promise.resolve(null);
        },

        getGlobalArt() {
            return Promise.resolve(null);
        },

        saveArt(artId, art) {
            return Promise.resolve(null);
        },

        deleteArt(artId) {
        },

        createNewScheme(scheme) {
        },

        saveScheme(schemeId, scheme) {
        },

        deleteScheme(schemeId) {
        },

        findSchemes(filters) {
        },

        getTags() {
        },

        createCategory(categoryName, parentCategoryId) {
        },

        deleteCategory(categoryId) {
        },

        updateCategory(categoryId, category) {
        },

        moveCategory(categoryId, newParentCategoryId) {
        },

        getCategoryTree() {
        },

        ensureCategoryStructure(categories) {
        },

        uploadSchemeSvgPreview(schemeId, svgCode) {
        },

        uploadFile(file) {
        },

        saveStyle(fill, strokeColor, textColor) {
        },

        getStyles() {
        },

        deleteStyle(styleId) {
        },

        /**
         * Returns static resources (html, css, js) for scheme exporting
         */
        getExportHTMLResources() {
        },

        getSchemeEmbeddingLink() {
        }
    };
})();