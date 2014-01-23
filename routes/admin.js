var pool;

var pages = function(req, res, next) {
    res.render('admin/pages/pages',{
        title: 'MySite'
    });
}

var tree = function(config,cb){
    
    config.connection.query('select id,classname,created,showinmenus,title,menutitle,parentid from sitetree', function(err, rows, fields) {
        if (err) throw err;
        console.log('The solution is: ', rows);
    });
    
}

var ui = function(req, res, next) {
    pool.getConnection(function(err, connection) {
        //console.log(err);
        if (err){
            res.end('an error occured');
        }else{
            
            //console.log(connection);
            res.render('admin/pages/pages',{
                title: 'MySite'
            });
            connection.release();
        }
    });
    
}

exports.route = function(app){
    pool = app.get('mysql pool');
    app.get(app.get('base path')+'/admin',ui);
    app.get(app.get('base path')+'/admin/pages',ui);
    app.get(app.get('base path')+'/admin/settings',ui);
    app.get(app.get('base path')+'/admin/security',ui);
}
