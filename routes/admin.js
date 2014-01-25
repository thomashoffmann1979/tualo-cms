var path = require('path'),
    cms;

var ui = function(req, res, next) {
    res.locals.Page = {
        ID: -1,
        Title: 'Error',
        Content: 'Not found',
        ClassName: 'ErrorPage'
    }; 
    sendResult(req, res, next);
}


var defaults = function(req, res, next) {
    req.originalUrl = '/admin/pages';
    pages(req, res, next);
}

var pages = function(req, res, next) {
    res.locals.Template = 'admin';
    var urlParts = (req.originalUrl.split('/')).slice(3),
        queryPage = (urlParts.length>0)?urlParts[urlParts.length-1]:'';
    
    if (queryPage == ''){
        queryPage = 'home';
    }


    res.locals.Page = {
        ID: -1,
        Title: 'Test',
        Content: 'Not found',
        ClassName: 'Page'
    }; 
    
    sendResult(req, res, next);
}

var sendResult = function(req,res,next){
    res.locals.URLPath = req.path.replace(/\/$/,'');
    return res.render(path.join(res.locals.Template,'pages',res.locals.Page.ClassName));
}

exports.route = function(app){
    cms = app.get('cms');
    app.all(app.get('base path')+'/admin/pages/*',pages);
    app.all(app.get('base path')+'/admin/settings',ui);
    app.all(app.get('base path')+'/admin/security',ui);
    app.all(app.get('base path')+'/admin/*',defaults);
    app.all(app.get('base path')+'/admin',defaults);
}
