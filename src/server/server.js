/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

const express               = require('express');
const bodyParser            = require('body-parser');
const cookieParser          = require('cookie-parser');
const middleware            = require('./middleware.js');
const apiUser               = require('./api/apiUser.js');
const apiProjects           = require('./api/apiProjects.js');
const apiSchemes            = require('./api/apiSchemes.js');
const apiCategories         = require('./api/apiCategories.js');
const apiFiles              = require('./api/apiFiles.js');
const apiArt                = require('./api/apiArt.js');
const apiStyles             = require('./api/apiStyles.js');
const session               = require('express-session');
const mongo                 = require('./storage/mongodb/Mongo.js');
const MongoStore            = require('connect-mongo')(session);
const config                = require('./config.js');
const jsonBodyParser        = bodyParser.json({limit: config.api.payloadSize, extended: true});
const mongoMigrate          = require('./storage/mongodb/migrations/migrate.js').migrate;

const metrics               = require('./metrics.js');

const app = express();



app.use(session({
    secret: config.session.secret,
    store: new MongoStore({
        url: `${config.mongodb.url}/${config.mongodb.dbName}`,
        ttl: config.mongodb.sessionStore.ttl
    })
}));

middleware.configureIpFilter(app);

app.use(cookieParser());
app.use('/assets', metrics.routeMiddleware({ routeName: '/assets' }));
app.use('/assets', express.static('public'));
app.use('/v1', [jsonBodyParser, middleware.api]);

app.use(function (err, req, res, next) {
    console.error('Global error handler', err.stack);
    res.status(500).send('Internal Server Error');
})

  
app.get('/',   express.static('public/index.html'));


function routeWithMetrics(method, routePath, middleware, handler) {
    const allMiddleware = [metrics.routeMiddleware({
        routeName: routePath
    })].concat(middleware);

    app[method](routePath, allMiddleware, handler);
}

function $get(routePath, middleware, handler) {
    routeWithMetrics('get', routePath, middleware, handler);
}
function $post(routePath, middleware, handler) {
    routeWithMetrics('post', routePath, middleware, handler);
}
function $delete(routePath, middleware, handler) {
    routeWithMetrics('delete', routePath, middleware, handler);
}
function $patch(routePath, middleware, handler) {
    routeWithMetrics('patch', routePath, middleware, handler);
}
function $put(routePath, middleware, handler) {
    routeWithMetrics('put', routePath, middleware, handler);
}


app.get('/metrics',         metrics.getPrometheusMetrics);

$get('/v1/user',         [middleware.auth], apiUser.getCurrentUser);
$post('/v1/login',       [],                apiUser.login);
$get('/user/logout',     [],                apiUser.logout);

$post('/v1/user/styles',            [middleware.auth], apiStyles.addToStylingPalette);
$get('/v1/user/styles',             [middleware.auth], apiStyles.getStylePalette);
$delete('/v1/user/styles/:styleId', [middleware.auth], apiStyles.deleteStyle);

$post('/v1/projects',               [middleware.auth],                                      apiProjects.createProject);
$get('/v1/projects',                [],                                                     apiProjects.findProjects);
$get('/v1/projects/:projectId',     [middleware.projectReadPermission],                     apiProjects.getProject);
$patch('/v1/projects/:projectId',   [middleware.auth, middleware.projectWritePermission],   apiProjects.patchProject);
$delete('/v1/projects/:projectId',  [middleware.auth, middleware.projectWritePermission],   apiProjects.deleteProject);

$get('/v1/projects/:projectId/schemes',                      [middleware.projectReadPermission],    apiSchemes.findSchemes);
$get('/v1/projects/:projectId/schemes/:schemeId',            [middleware.projectReadPermission],    apiSchemes.getScheme);
$delete('/v1/projects/:projectId/schemes/:schemeId',         [middleware.projectWritePermission],   apiSchemes.deleteScheme);
$post('/v1/projects/:projectId/schemes',                     [middleware.projectWritePermission],   apiSchemes.createScheme);
$put('/v1/projects/:projectId/schemes/:schemeId',            [middleware.projectWritePermission],   apiSchemes.saveScheme);
$post('/v1/projects/:projectId/scheme-preview/:schemeId',    [middleware.projectWritePermission],   apiSchemes.savePreview);
$get('/projects/:projectId/scheme-preview/:schemeId',        [middleware.projectReadPermission],    apiSchemes.getPreview);
$get('/v1/projects/:projectId/tags',                         [middleware.projectReadPermission],    apiSchemes.getTags);

$post('/v1/projects/:projectId/art',         [middleware.projectWritePermission],    apiArt.createArt);
$put('/v1/projects/:projectId/art/:artId',   [middleware.projectWritePermission],    apiArt.saveArt);
$delete('/v1/projects/:projectId/art/:artId',[middleware.projectWritePermission],    apiArt.deleteArt);
$get('/v1/projects/:projectId/art',          [middleware.projectReadPermission],     apiArt.getArt);
$get('/v1/art',                              [],                                     apiArt.getGlobalArt);

$post('/projects/:projectId/files',             [middleware.projectWritePermission], apiFiles.uploadFile);
$get('/projects/:projectId/files/:fileName',    [middleware.projectReadPermission],  apiFiles.downloadFile);


$get('/v1/projects/:projectId/category-tree',                [middleware.projectReadPermission],   apiCategories.getCategoryTree);
$get('/v1/projects/:projectId/categories',                   [middleware.projectReadPermission],   apiCategories.getRootCategory);
$get('/v1/projects/:projectId/categories/:categoryId',       [middleware.projectReadPermission],   apiCategories.getCategory);
$post('/v1/projects/:projectId/categories',                  [middleware.projectWritePermission],  apiCategories.createCategory);
$post('/v1/projects/:projectId/move-category',               [middleware.projectWritePermission],  apiCategories.moveCategory);
$put('/v1/projects/:projectId/categories/:categoryId',       [middleware.projectWritePermission],  apiCategories.updateCategory);
$delete('/v1/projects/:projectId/categories/:categoryId',    [middleware.projectWritePermission],  apiCategories.deleteCategory);
$put('/v1/projects/:projectId/category-structure',           [middleware.projectWritePermission],  apiCategories.ensureCategoryStructure);


const cwd = process.cwd();
app.get('*', function (req, res) {
    res.sendFile(`${cwd}/public/index.html`)
})

app.set('port', config.serverPort);


mongo.connectDb().then(() => {
    return mongoMigrate().catch(err => {
        console.error('Could not execute mongo migrations', err);
        process.exit(1);
    });
}).then(() => {
    app.listen(config.serverPort, () => {
        console.log('Listening on port ' + config.serverPort);
    });
}).catch(err => {
    console.error('Could not connect to Mongodb', err);
    process.exit(1);
});
