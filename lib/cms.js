var EventEmitter = require('events').EventEmitter,
    mysql = require('mysql'),
    utilities = require('./utilities'),
    nt = require('./classes/navigationtree'),
    Sessions = require('./classes/sessions').Sessions;


// `new CMS()` creates the CMS object. The CMS object inherits the 
// functions from EventEmitter.

var CMS = function(){
    this._config;
    this._siteConfig;
    this._connection;
    this._mainNavigation;
    this._navigationTree;
    this._sessions; // = new Sessions();
    this._logger;
    this.test = "hello";
    return this;
}

utilities.inherits(CMS, EventEmitter, {
   
    // `config` keeps the data from the configuration file
    get config () { return this._config; },
    set config (v) { this._config = v; this.initializeConnection(); return this; },
    
    
    get siteConfig () { return this._siteConfig; },
    set siteConfig (v) { this._siteConfig = v; return this; },
    
    // `logger` is a reference to an logger object. That object needs only the `log(level,message)` function.
    get logger () { return this._logger; },
    set logger (v) { this._logger = v; return this; },
    
    // `connection` will be set by the object itselfs it keeps the reference to the currently database connection.
    get connection () { return this._connection; },
    set connection (v) { this._connection = v; return this; },
    
    // `mainNavigation` is an array of all visible top-level menue items
    get mainNavigation () { return this._mainNavigation; },
    set mainNavigation (v) { this._mainNavigation = v; return this; },
    
    // `navigationTree` is an nested array, that holds the hole sitemap
    get navigationTree () { return this._navigationTree; },
    set navigationTree (v) { this._navigationTree = v; return this; },
    
    // `sessions` is the refernce to the sessions objects
    get sessions () { return this._sessions; },
    set sessions (v) { this._sessions = v; return this; }
});


// `navigation(id)` can be used for retriving all direct child menu entries for the 
// page-id id. The event `navigation` will be emitted with the id and array of entries for id.
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

    self.connection = mysql.createConnection(self.config.database); 
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
    
    
    if ( typeof self.sessions == 'undefined' ){
        self.logger.log('debug','initialize session');
        self.sessions = new Sessions();
        self.sessions.authenticateCookieName = self.config.cookieName;
        self.sessions.cookieDays = self.config.cookieDays;
        self.sessions.sessionSecret = self.config.sessionSecret;
        self.sessions.logger = self.logger;
    }
    
    self.logger.log('debug','set sessions connection');
    self.sessions.connection = self.connection;
    
    
    self.connection.query('select * from `SiteConfig` where ClassName = ?',['SiteConfig'], function(err, rows, fields) {
        if (err){
            self.logger.log('error','on querying the siteconfig '+JSON.stringify(err));
            self.emit('error',err);
        }else{
            if (rows.length==1){
                self.logger.log('debug','siteConfig loaded');
                self.siteConfig = rows[0];
            }else{
                self.logger.log('error','on querying the siteconfig, no entry');
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
        // `locals.messages` keeps message objects from all modules/ middlewares.
        // That objects, contain at least the `text` and `type` property. You can 
        // use that objects to display the messages whitin your themplate engine.
        res.locals.messages = [];
        // `locals.navigationTree` holds the sitemap tree object.
        res.locals.navigationTree = self.navigationTree;
        res.locals.treeHTML = nt.treeHTML;
        res.locals.Template = 'simple';
        res.locals.basePath = self.config.basePath;
        res.locals.MainNavigation = self.mainNavigation;
        res.locals.Site = {
            Title: self.siteConfig.Title,
            Tagline: self.siteConfig.Tagline,
        };
        
        
        self.sessions.authenticateUser(req,res,function(){
            self.sessions.login(req,res,function(){
                self.sessions.logout(req,res,function(){
                    self.sessions.sessionsLocals(req,res,function(){
                        next();
                    });
                });
            });
        });
        
    }
}

exports.CMS = CMS;
