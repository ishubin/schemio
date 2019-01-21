const express               = require('express');
const path                  = require('path');
const bodyParser            = require('body-parser');
const jsonBodyParser        = bodyParser.json();
const middleware            = require('./middleware.js');
const apiSchemes            = require('./api/apiSchemes.js');
const apiCategories         = require('./api/apiCategories.js');
const apiImages             = require('./api/apiImages.js');

const app = express();

app.use(express.static('public'));
app.use('/api', [jsonBodyParser, middleware.api]);

var cwd = process.cwd();

app.get('/api/schemes', apiSchemes.findSchemes);
app.get('/api/schemes/:schemeId', apiSchemes.getScheme);
app.delete('/api/schemes/:schemeId', apiSchemes.deleteScheme);
app.post('/api/schemes',  apiSchemes.createScheme);
app.put('/api/schemes/:schemeId',  apiSchemes.saveScheme);

app.get('/api/tags',  apiSchemes.getTags);

app.get('/api/shapes',  apiSchemes.getShapes);

app.post('/images', apiImages.uploadImage);
app.get('/images/:fileName', apiImages.getImage);

app.post('/api/categories',  apiCategories.createCategory);
app.get('/api/categories',  apiCategories.getRootCategory);
app.get('/api/categories/:categoryId',  apiCategories.getCategory);
app.delete('/api/categories/:categoryId',  apiCategories.deleteCategory);
app.put('/api/category-structure',  apiCategories.ensureCategoryStructure);


app.get('*', function (req, res) {
    res.sendFile(`${cwd}/public/index.html`)
})

var port = process.env.PORT || 4010;
app.set('port', port);
var server = app.listen(port, () => {
    console.log('Listening on port ' + port);
});
