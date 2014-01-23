var EventEmitter = require('events').EventEmitter;

var inherits=function(ctor, superCtor, proto) {

    var props = {
        constructor: { value: ctor, writable: true, configurable: true }
    };
    Object.getOwnPropertyNames(proto).forEach(function(name) {
        props[name] = Object.getOwnPropertyDescriptor(proto, name);
    });
    ctor.prototype = Object.create(superCtor.prototype, props);
    ctor.super_ = superCtor;
}

var CMS = function(){
    this._pool;
    this._config;
    return this;
}

inherits(CMS, EventEmitter, {
    get pool () { return this._pool; },
    set pool (v) { this._pool = v; this.queryConfig(); return this; },
    get config () { return this._config; },
    set config (v) { this._config = v; return this; },
});

CMS.prototype.navigation = function(id){
    var self = this;
    self.pool.getConnection(function(err, connection) {
        if (err){
            self.emit('error',err);
        }else{
            connection.query('select ID, URLSegment, Title, MenuTitle, ShowInMenus from `SiteTree` where ParentID = ? order by Sort',[id], function(err, rows, fields) {
                if (err){
                    self.emit('error',err);
                }else{
                    self.emit('navigation',id,rows);
                }
                connection.release();
            });
        }
    });
}

// getting a single page by the url part
CMS.prototype.get = function(url){
    var self = this;
    self.pool.getConnection(function(err, connection) {
        if (err){
            self.emit('error',err);
        }else{
            connection.query('select * from `SiteTree` where URLSegment = ?',[url], function(err, rows, fields) {
                if (err){
                    self.emit('error',err);
                }else{
                    
                    if (rows.length==1){
                        self.emit('page',rows[0]);
                    }else{
                        self.emit('error',{
                            text: 'There is no SiteConfig'
                        });
                    }
                }
                connection.release();
            });
        }
    });
}

CMS.prototype.queryConfig = function() {
    var self = this;
    self.pool.getConnection(function(err, connection) {
        if (err){
            self.emit('error',err);
        }else{
            connection.query('select * from `SiteConfig` where ClassName = ?',['SiteConfig'], function(err, rows, fields) {
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
                    //console.log('The solution is: ', rows);
                }
            });
            connection.release();
        }
    });
}

exports.CMS = CMS;
