var EventEmitter = require('events').EventEmitter,
    utilities = require('../utilities'),
    crypto = require('crypto'),
    Blowfish = require('./blowfish').Blowfish;


var Sessions = function(){
    this._connection;
    this._authenticateCookieName;
    this._sessionSecret;
    this._cookieDays = 30;
    this._basePath;
    
    return this;
}

utilities.inherits(Sessions, EventEmitter, {
    
    get logger () { return this._logger; },
    set logger (v) { this._logger = v; return this; },
    
    get cookieDays () { return this._cookieDays; },
    set cookieDays (v) { this._cookieDays = v; return this; },
    
    get authenticateCookieName () { return this._authenticateCookieName; },
    set authenticateCookieName (v) { this._authenticateCookieName = v; return this; },
    
    get sessionSecret () { return this._sessionSecret; },
    set sessionSecret (v) { this._sessionSecret = v; return this; },
    
    get basePath () { return this._basePath; },
    set basePath (v) { this._basePath = v; return this; },
    
    get connection () { return this._connection; },
    set connection (v) { this._connection = v; return this; },

});


// `encrypt(str, secret)` encrypts the given string with the secret by using aes192
Sessions.prototype.encrypt = function (str, secret) {
    var cipher = crypto.createCipher('aes192', secret),
        enc = cipher.update(str, 'utf8', 'hex');
    enc += cipher.final('hex');
    return enc;
}

// `decrypt(str, secret)` decrypts the given string by the secret by using aes192
Sessions.prototype.decrypt = function (str, secret) {
    var decipher = crypto.createDecipher('aes192', secret),
        dec = decipher.update(str, 'hex', 'utf8');
    dec += decipher.final('utf8');
    return dec;
}

Sessions.prototype.pad = function (text) {
    var pad_bytes = 8 - (text.length % 8);
    for (var x=1; x<=pad_bytes;x++){
        text = text + String.fromCharCode(0);
    }
    return text;
}



// `authenticateUser(req, res, next)` authenticates the user, by the 
// session or the cookie.
Sessions.prototype.authenticateUser = function(req, res, next) {
    var self = this,
        cookie;
    
    if (typeof req.session.user !== 'undefined') {
        self.logger.log('debug','session is active');
        next();
    }else{
        cookie = req.cookies[self.authenticateCookieName];
        self.logger.log('debug','checking auth cookie');
        if (typeof cookie == 'undefined'){
            self.logger.log('debug','there is no auth cookie');
            return next();
        }
        try{
            
            req.session.user = self.decrypt( cookie, self.sessionSecret ) ;
            self.logger.log('debug','decrypt auth cookie',req.session.user);
        }catch(e){
            self.logger.log('debug','auth cookie is not valid');
        }
        next();
    }
}

Sessions.prototype.setSessionAndCookie  = function(item,req, res) {
    var self=this,
        auth_token = self.encrypt(item.Email, self.sessionSecret);
    self.logger.log('debug','setting session');
    req.session.user = item.Email;
    res.cookie(self.authenticateCookieName, auth_token, { maxAge: 1000 * 60 * 60 * 24 * self.cookieDays })
    self.logger.log('debug','Set cookie header: '+ [self.authenticateCookieName,item.Email, self.cookieDays,'days'].join(' '));
}

// `login()`
Sessions.prototype.login = function(req, res, next){
    var username = req.body.username,
        password = req.body.password,
        pwhash,
        self = this,
        algorithm,
        algorithmResult;
    if ( (typeof username !== 'undefined') && (typeof password !== 'undefined') ){
        self.connection.query('select ID, Email, Password, Salt, PasswordEncryption from `Member` where Email = ?',[username], function(err, rows, fields) {
            if (err){
                self.logger.log('error','While querying User. '+JSON.stringify(err));
                next();
                
                
            }else{
                if ( rows.length == 1 ){
                    if (rows[0].PasswordEncryption == 'blowfish' ){
                        
                        try{
                            pwhash = rows[0].Password;
                            algorithm = new Blowfish();
                            algorithm.hashpw(password, '$2y$'+rows[0].Salt, function(hash){
                                if (hash == pwhash){
                                    self.logger.log('debug','Login successfully');
                                    self.setSessionAndCookie(rows[0],req,res);
                                    
                                }else{
                                    self.logger.log('warn','The username or password is incorrect. Username: '+username);
                                    res.locals.messages.push({
                                        text: 'The username or password is incorrect.',
                                        type: 'Error'
                                    });
                                }
                                next();
                            });
                        }catch(e){
                            self.logger.log('error',e);
                            res.locals.messages.push({
                                text: 'The username or password is incorrect.',
                                type: 'Error'
                            })
                            next();
                        }
                    }else{
                        self.logger.log('error','The password encryption is not supported. '+rows[0].PasswordEncryption);
                        res.locals.messages.push({
                            text: 'The password encryption is not supported.',
                            type: 'Error'
                        })
                        next();
                    }
                    
                }else{
                    self.logger.log('warn','The username or password is incorrect. Username: '+username);
                    res.locals.messages.push({
                        text: 'The username or password is incorrect.',
                        type: 'Error'
                    })
                    next();
                }

            }
        })
    }else{
        next();
    }
}

exports.Sessions = Sessions;