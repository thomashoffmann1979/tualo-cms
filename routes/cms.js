var path = require('path'),
    cms;

var ui = function(req, res, next) {
    var template = 'simple',
        MainNavigation = [],
        urlParts = req.originalUrl.split('/'),
        queryPage = urlParts[1];
    if (queryPage == ''){
        queryPage = 'home';
    }
    cms.once('error',function(err){
        res.render(path.join(template,'pages/single'),{
            Site: {
                Title: cms.config.Title,
                Tagline: cms.config.Tagline,
            },
            Page: {
                Title: 'Error',
                Content: JSON.stringify(err),
            },
            MainNavigation: MainNavigation
        });
    });
    
    cms.once('navigation', function(id,navigation){
        MainNavigation = navigation;
        cms.get(queryPage);
    });
    
    cms.once('page',function(page){
        res.render(path.join(template,'pages/single'),{
            Site: {
                Title: cms.config.Title,
                Tagline: cms.config.Tagline,
            },
            Page: {
                Title: page.Title,
                Content: page.Content,
            },
            MainNavigation: MainNavigation
        });
    });
    
    cms.navigation(0);
}

exports.route = function(app){
    cms = app.get('cms');
    app.get("/*",ui);
}