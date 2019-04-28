/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

const express               = require('express');
const path                  = require('path');
const bodyParser            = require('body-parser');
const cookieParser          = require('cookie-parser');
const middleware            = require('./middleware.js');
const apiUser               = require('./api/apiUser.js');
const apiSchemes            = require('./api/apiSchemes.js');
const apiCategories         = require('./api/apiCategories.js');
const apiImages             = require('./api/apiImages.js');
const apiArt                = require('./api/apiArt.js');
const session               = require('express-session');
const MongoStore            = require('connect-mongo')(session);
const config                = require('./config.js');
const jsonBodyParser        = bodyParser.json({limit: config.api.payloadSize, extended: true});

const app = express();

app.use(session({
    secret: config.session.secret,
    store: new MongoStore({
        url: `${config.mongodb.url}/${config.mongodb.dbName}`,
        ttl: config.mongodb.sessionStore.ttl
    })
}));

app.use(cookieParser());
app.use(express.static('public'));
app.use('/api', [jsonBodyParser, middleware.api]);

var cwd = process.cwd();

app.get('/api/user', [middleware.auth], apiUser.getCurrentUser);
app.post('/api/login', apiUser.login);
app.get('/user/logout', apiUser.logout);

app.get('/api/schemes', apiSchemes.findSchemes);
app.get('/api/schemes/:schemeId', apiSchemes.getScheme);
app.delete('/api/schemes/:schemeId', [middleware.auth], apiSchemes.deleteScheme);
app.post('/api/schemes', [middleware.auth], apiSchemes.createScheme);
app.put('/api/schemes/:schemeId', [middleware.auth], apiSchemes.saveScheme);

app.get('/api/tags',  apiSchemes.getTags);

app.get('/api/shapes',  apiSchemes.getShapes);

app.post('/api/art', [middleware.auth], apiArt.createArt);
app.get('/api/art', apiArt.getArt);

app.post('/images', [middleware.auth], apiImages.uploadImage);
app.get('/images/:fileName', apiImages.getImage);

app.post('/api/scheme-thumnbails/:schemeId', apiImages.uploadSchemeThumbnail);


app.get('/api/categories',  apiCategories.getRootCategory);
app.get('/api/categories/:categoryId',  apiCategories.getCategory);
app.post('/api/categories', [middleware.auth],  apiCategories.createCategory);
app.delete('/api/categories/:categoryId', [middleware.auth],  apiCategories.deleteCategory);
app.put('/api/category-structure', [middleware.auth],  apiCategories.ensureCategoryStructure);


app.get('*', function (req, res) {
    res.sendFile(`${cwd}/public/index.html`)
})

app.set('port', config.serverPort);
var server = app.listen(config.serverPort, () => {
    console.log('Listening on port ' + config.serverPort);
});
