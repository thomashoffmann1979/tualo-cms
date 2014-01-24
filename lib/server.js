var express = require('express'),
    socketIO = require('socket.io'),
    routes = ['admin','cms'],
    http = require('http'),
    https = require('https'),
    path = require('path'),
    CMS = require('./cms').CMS,
    logger = new (new require('./logger')),
    fs = require('fs');

function initialize(config){
    var app,
        credentials = {},
        httpsServer,
        httpServer,
        io,
        pool,
        cms;

    
    cms = new CMS();
    cms.databaseConfig = config.database;
    cms.logger = logger;
    
    app = express();
    app.configure(function(){
        app.set('views', path.join(__dirname ,'..', 'templates'));
        app.set('view engine', 'jade');
        app.set('base path', config.basePath);
        app.set('mysql pool', pool);
        app.set('cms', cms);
        app.use(express.json());
        app.use(express.urlencoded());
        app.use(express.cookieParser());
        app.use(express.session({ secret: (config.session_secret)?config.session_secret:'set session secret ;)'}));
        app.use(express.static('public'));
        
        app.use(cms.middleware());
    });
    
    
    if ( (typeof config.http!='undefined') && (config.http.active == true)){
        if (typeof config.http.port == 'undefined'){
            config.http.port = 80;
        }
        
        httpServer = http.createServer(app);
        httpServer.listen(config.http.port, function(){
            logger.log('info',"CMS listening on port " + config.http.port);
        });
        
        if (config.socketio === true){
            io = require('socket.io').listen(httpsServer);
        }
        
    }
    
    if ( (typeof config.https!='undefined') && (config.https.active == true)){
        if (typeof config.https.port == 'undefined'){
            config.https.port = 443;
        }

        if (typeof config.privateKey!='undefined'){
            credentials.key = fs.readFileSync(config.privateKey, 'utf8');
        }
        if (typeof config.certificate!='undefined'){
            credentials.cert = fs.readFileSync(config.certificate, 'utf8');
        }
        if (typeof config.ca!='undefined'){
            credentials.ca = fs.readFileSync(config.ca, 'utf8');
        }
        
        httpsServer = https.createServer(credentials, app);
        httpsServer.listen(config.https.port, function(){
            logger.log('info',"CMS listening on port " + config.https.port);
        });
        
        
        if (config.socketio === true){
            io = require('socket.io').listen(httpsServer);
        }
    }
    

    for(var i in routes){
        mod = require('../routes/'+routes[i]);
        logger.log('info','testing route '+routes[i]);
        if (typeof mod.route==='function'){
            mod.route(app);
            logger.log('info','setting route '+routes[i]);
        }
        if (config.socketio === true){
            mod.socketio(app);
        }
    }

}


function findConfiguration(){
    var config;
    fs.exists(path.join(path.sep,'etc','tualo-cms','config.json'),function(exists){
        if (exists){
            try{
                config = require(path.join(path.sep,'etc','tualo-cms','config.json'));
                initialize(config);
            }catch(e){
                logger.log('error','The configuration is invalid *1. '+e);
            }
        }else{
            fs.exists(path.join(__dirname,'..','config','config.json'),function(exists){
                if (exists){
                    try{
                        config = require(path.join(__dirname,'..','config','config.json'));
                        initialize(config);
                    }catch(e){
                        logger.log('error','The configuration is invalid *2.'+e);
                    }
                }else{
                    fs.exists(path.join(__dirname,'..','config','sample.config.json'),function(exists){
                        if (exists){
                            try{
                                config = require(path.join(__dirname,'..','config','sample.config.json'));
                                initialize(config);
                            }catch(e){
                                logger.log('error','The configuration is invalid *3.'+e);
                            }
                        }else{
                            logger.log('error','There is no configuration file.');
                            process.exit();
                        }
                    });
                }
            });
        }
    });
}


function startup(){
    findConfiguration();
}

exports.startup = startup;
