var path = require('path'),
    cms;

var ui = function(req, res, next) {
    
    var urlParts = req.path.split('/'),
        queryPage = urlParts[urlParts.length - 1];
    
    /* if a tailing slash is in the url, and it not the basePath the requested page is the predecessor*/
    if (queryPage == ''){
        if ( (cms.config.basePath.split('/')).length < (urlParts.length-1) ){
            if (urlParts.length>1){
                queryPage = urlParts[urlParts.length - 2]
            }
        }
    }
    if (queryPage == ''){
        queryPage = 'home';
    }
    
    
    res.locals.Page = {
        ID: -1,
        Title: 'Error',
        Content: 'Not found',
        ClassName: 'ErrorPage'
    };

    cms.once('error',function(err){
        res.locals.Page = {
            Title: 'Error',
            Content: JSON.stringify(err),
            ClassName: 'ErrorPage'
        };
        if (typeof err == 'string'){
            res.locals.Page.Content = err;
        }
        return sendResult(req,res,next);
    });
    
    cms.once('navigation', function(id,navigation){
        if (id == res.locals.Page.ID){
            res.locals.Navigation = navigation;
            return sendResult(req,res,next);
        }
    });
    
    cms.once('page',function(page){
        res.locals.Page = {
            ID: page.ID,
            Title: page.Title,
            Content: page.Content,
            ClassName: page.ClassName
        };
        cms.navigation(page.ID);
    });
    
    cms.get(queryPage);
    
}

var sendResult = function(req,res,next){
    res.locals.URLPath = req.path.replace(/\/$/,'');
    return res.render(path.join(res.locals.Template,'pages',res.locals.Page.ClassName));
}

exports.route = function(app){
    cms = app.get('cms');
    app.all("/*",ui);
}