const jsdom = require("jsdom");
const { JSDOM } = jsdom;

const dom = new JSDOM(``, {
    url: 'http://localhost',
    referrer: 'http://localhost',
    contentType: "text/html",
    includeNodeLocations: true,
    storageQuota: 10000000
});


// const { window } = new JSDOM('<div></div>');
// const { document } = (new JSDOM('<div></div>')).window;

global.window = dom.window;
global.document = dom.window.document;