var EventEmitter = require('events').EventEmitter,
    utilities = require('../utilities'),
    crypto = require('crypto'),
    Blowfish = require('./blowfish').Blowfish;


var Sessions = function(){
    this._connection;
    this._authenticateCookieName;
    this._sessionSecret;
    this._sessionStore;
    return this;
}

utilities.inherits(Sessions, EventEmitter, {
    
    get logger () { return this._logger; },
    set logger (v) { this._logger = v; return this; },
    
    get authenticateCookieName () { return this._authenticateCookieName; },
    set authenticateCookieName (v) { this._authenticateCookieName = v; return this; },
    
    get sessionSecret () { return this._sessionSecret; },
    set sessionSecret (v) { this._sessionSecret = v; return this; },
    
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

Sessions.prototype.blowfish = function (){
    var self = this,
        algorithm = "bf-ecb";
}

// `authenticateUser(req, res, next)` authenticates the user, by the 
// session or the cookie.
Sessions.prototype.authenticateUser = function(req, res, next) {
    var self = this,
        cookie;
    if (typeof req.session.user !== 'undefined') {
        
        
    }else{
        cookie = req.cookies[self.authenticateCookieName];
        if (typeof cookie == 'undefined'){
            return next();
        }
        try{
            req.session.user = JSON.parse( self.decrypt( cookie, self.sessionSecret ) );
        }catch(e){
        }
        next();
    }
}

// `login()`
Sessions.prototype.login = function(req, res, next){
    var username = req.body.username,
        password = req.body.password,
        self = this,
        algorithm,
        algorithmResult;
    console.log(username,password);
    if ( (typeof username !== 'undefined') && (typeof password !== 'undefined') ){
        self.connection.query('select ID, Email, Password, Salt, PasswordEncryption from `Member` where Email = ?',[username], function(err, rows, fields) {
            if (err){
                console.log(err);
                next();
            }else{
                console.log(rows);
                if ( rows.length == 1 ){
                    algorithm = new Blowfish();
                    algorithmResult = algorithm.encrypt(password,rows[0].Salt);
                    console.log(algorithmResult);
                    next();
                }else{
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