var EventEmitter = require('events').EventEmitter,
    utilities = require('../utilities');

// The `new NavigationTree()` returns an NaviationTree object.
// At the startup that object does nothing. 
// 
// ### Usage
// 
//         navTree = new NavigationTree();
//         navTree.connection = myConnection;
//         navTree.on('ready', function(){
//             var handleTheTree = navTree.tree;
//             // ...
//         });

var NavigationTree = function(){
    this._connection;
    this._tree;
    this._eventCounter=0;
    return this;
}

utilities.inherits(NavigationTree, EventEmitter, {
// Before you can start with, you have to set a connection to a database.
// A [mysql](https://github.com/felixge/node-mysql) connection object will work.
// But you can give any connection object you want, it must provide a 
// `query(sql,argsArray,callback(err,rows))` behavior like the mysql's one.
    get connection () { return this._connection; },
    set connection (v) { this._connection = v; return this; },

// If the `ready` event fired up. The `tree` property will hold the 
// full (sub-) sitemap, depending on your starting point.
    
    get tree () { return this._tree; },
    set tree (v) { this._tree = v; return this; },
    

});

// `childReady` is used internally for detecting, if all sub tree's 
// are ready. After that the `ready` event will be emitted.
NavigationTree.prototype.childReady = function(index){
    var self = this;
    self._eventCounter -= 1;
    
    self.tree[index].tree = self.tree[index]._treeObject.tree;
    delete self.tree[index]._treeObject;
    if ( self._eventCounter == 0){
        self.emit('ready');    
    }
    

}

// With `queryTree(id)` you start the building of the naviagtion tree (sitemap).
// On successfully querying all subtree's the `ready` event will be emitted. If
// an error occours the `error` event will be thrown.

NavigationTree.prototype.queryTree = function(ID){
    var self = this;
    self.connection.query('select ID, URLSegment, Title, MenuTitle, ShowInMenus, ParentID from `SiteTree` where ParentID = ? order by Sort',[ID], function(err, rows, fields) {
        if (err){
            self.emit('error',err);

        }else{
            self._eventCounter = rows.length;
            if ( self._eventCounter == 0 ){
                self.emit('ready');
            }else{
                for (var i in rows){
                    rows[i]._treeObject = new NavigationTree();
                    rows[i]._treeObject.connection = self.connection;
                    rows[i]._treeObject.queryTree(rows[i].ID);
                    rows[i]._treeObject.once('ready',self.childReady.bind(self,i));
                    rows[i]._treeObject.once('error',self.emit.bind('error'));
                }
                self.tree = rows;
            }
        }
    });
}

// The `treeHTML(tree,[option])` is beside the `NavigationTree` constructor the
// only function exported by this module. So you can provide this function 
// in your view compiler's `locals` variable.

// `tree` has to be an `NavigationTree.tree` object. The `option` parameter
// is an optional object. With that parameter you can controll the html output.
// 
// ###options
var treeHTML = exports.treeHTML = function(tree,options){
    try{
        var result = [],
            i,
            item;
        if (typeof options == 'undefined'){
            options = {}; // 
        }
        if (typeof options.inMenues == 'undefined'){
// * `inMenues` defaults to `true`, if you set it to `false` the 
// complete sitemap will be returned, inlcuding hidden pages.
            options.inMenues = true;    
        }
        if (typeof options.listItemStart == 'undefined'){
// * `listItemStart` defaults to `<li>`, set the starting html tag for an item.
            options.listItemStart = '<li>';
        }
        if (typeof options.listItemStop == 'undefined'){
// * `listItemStop` defaults to `</li>`, set the closing html tag for an item.
            options.listItemStop = '</li>';
        }
        if (typeof options.listStart == 'undefined'){
// * `listStart` defaults to `<ul>`, set the starting html tag for the list (or sublist).
            options.listStart = '<ul>';
        }
        if (typeof options.listStop == 'undefined'){
// * `listStop` defaults to `</ul>`, set the closing html tag for the list (or sublist).
            options.listStop = '</ul>';
        }
        for( var i in tree ){
            item = tree[i];
            if ((options.inMenues === false) || (item.ShowInMenus == 1)){
                if (typeof tree[i].tree == 'undefined'){
                    result.push(tree[i].Title)
                }else{
                    result.push(tree[i].Title + treeHTML(tree[i].tree,options));
                }
            }
        }
        return options.listStart+options.listItemStart+result.join(options.listItemStop+options.listItemStart)+options.listItemStop+options.listStop;
    }catch(err){
// 
// If an error occours "Error: in treeHTML" will be returned.
        return "Error: in treeHTML";
    }
}


// example.jade:
//    
//        div
//           - var html = treeHTML(sitemap,{inMenues: false})
//           !{html}
//    
// 

exports.NavigationTree = NavigationTree;