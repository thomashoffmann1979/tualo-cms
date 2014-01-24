var EventEmitter = require('events').EventEmitter,
    mysql = require('mysql'),
    utilities = require('./utilities'),
    nt = require('./classes/navigationtree');



var CMS = function(){
    this._config;
    this._connection;
    this._databaseConfig;
    this._mainNavigation;
    this._navigationTree;
    return this;
}

utilities.inherits(CMS, EventEmitter, {
    
    get databaseConfig () { return this._databaseConfig; },
    set databaseConfig (v) { this._databaseConfig = v; this.initializeConnection(); return this; },
    
    get config () { return this._config; },
    set config (v) { this._config = v; return this; },
    
    get logger () { return this._logger; },
    set logger (v) { this._logger = v; return this; },
    
    get connection () { return this._connection; },
    set connection (v) { this._connection = v; return this; },
    
    get mainNavigation () { return this._mainNavigation; },
    set mainNavigation (v) { this._mainNavigation = v; return this; },
    
    get navigationTree () { return this._navigationTree; },
    set navigationTree (v) { this._navigationTree = v; return this; }
});



CMS.prototype.navigation = function(id){
    var self = this;
    self.connection.query('select ID, URLSegment, Title, MenuTitle, ShowInMenus from `SiteTree` where ParentID = ? order by Sort',[id], function(err, rows, fields) {
        if (err){
            self.emit('error',err);
        }else{
            self.emit('navigation',id,rows);
        }
    });
}

// getting a single page by the url part
CMS.prototype.get = function(url){
    var self = this;
    try{
        self.connection.query('select * from `SiteTree` where URLSegment = ?',[url], function(err, rows, fields) {
            if (err){
                self.emit('error',err);
            }else{

                if (rows.length==1){
                    self.emit('page',rows[0]);
                }else{
                    self.emit('error','Not found.');
                }
            }
        });
    }catch(err){
        self.emit('error',err);
    }
}

CMS.prototype.initializeConnection = function() {
    var self = this;
    
    self.connection = mysql.createConnection(self.databaseConfig); 
    self.connection.connect(function(err) {               
        if(err) {                                      
            self.logger.log('error','DB Connection (initialization): '+err.code);
            setTimeout(self.initializeConnection.bind(self), 5000);  
        }else{
            self.refresh();
        }
    });
    
    self.connection.on('error', function(err) {
        //console.log('db error', err);
        self.logger.log('error','DB Connection: '+err.code);
        if(err.code === 'PROTOCOL_CONNECTION_LOST') {
            setTimeout(self.initializeConnection.bind(self), 2000);
        } else {
            throw err;
        }
    });

   
}

CMS.prototype.refresh = function(){
    var self = this,
        tree;
    
    self.connection.query('select * from `SiteConfig` where ClassName = ?',['SiteConfig'], function(err, rows, fields) {
        if (err){
            self.emit('error',err);
        }else{
            if (rows.length==1){
                self.config = rows[0];
            }else{
                self.emit('error',{
                    text: 'There is no SiteConfig'
                });
            }
        }
    });
    
    self.once('navigation',function(id,navigation){
        self.mainNavigation = navigation;
        self.emit('refresh');
    });
    self.navigation(0);
    
    tree = new nt.NavigationTree();
    tree.connection = self.connection;
    tree.once('ready',function(){
        //console.log(navigationtree.tree);
        //console.log(nt.treeHTML(navigationtree.tree));
        self.navigationTree = tree.tree;
    })
    tree.queryTree(0);
}

CMS.prototype.middleware = function(){
    var self = this;
    return function(req,res,next){
        res.locals.navigationTree = self.navigationTree;
        res.locals.treeHTML = nt.treeHTML;
        res.locals.Template = 'simple';
        res.locals.MainNavigation = self.mainNavigation;
        next();
    }
}

exports.CMS = CMS;
