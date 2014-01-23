var path = require('path');
var ui = function(req, res, next) {
    var template = 'simple';
    
    res.render(path.join(template,'index.jade'),{
        title: ''
    });
}

exports.route = function(app){
    app.get("/",ui);
}