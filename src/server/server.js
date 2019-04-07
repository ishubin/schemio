const express               = require('express');
const path                  = require('path');
const bodyParser            = require('body-parser');
const jsonBodyParser        = bodyParser.json({limit: '50mb', extended: true});
const cookieParser          = require('cookie-parser');
const middleware            = require('./middleware.js');
const apiUser               = require('./api/apiUser.js');
const apiSchemes            = require('./api/apiSchemes.js');
const apiCategories         = require('./api/apiCategories.js');
const apiImages             = require('./api/apiImages.js');
const apiArt                = require('./api/apiArt.js');
const session               = require('express-session');
const MongoStore            = require('connect-mongo')(session);

const app = express();

app.use(session({
    secret: 'somesessionsecret',
    store: new MongoStore({
        url: 'mongodb://localhost:27017/myproject',
        ttl: 14 * 24 * 60 * 60
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

var port = process.env.PORT || 4010;
app.set('port', port);
var server = app.listen(port, () => {
    console.log('Listening on port ' + port);
});
