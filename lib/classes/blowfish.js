var crypto = require('crypto'),
    algorithm = "bf-ecb";



function Blowfish() {
  var self = this;
  self.algorithm = "bf-ecb";
}

Blowfish.prototype.pad = function (text) {
  var pad_bytes = 8 - (text.length % 8),
      x;
    for (x=1; x<=pad_bytes;x++){
    text = text + String.fromCharCode(0);
    }
  return text;
}

Blowfish.prototype.encrypt = function(data, key) {
    var self = this,
        cipher = crypto.createCipheriv(self.algorithm, Buffer(key), '');
    cipher.setAutoPadding(false);
    try {
        return Buffer(cipher.update(self.pad(data), 'utf8', 'binary') + cipher.final('binary'), 'binary').toString('base64');
    } catch (e) {
        return null;
    }
}

Blowfish.prototype.decrypt = function(data, key) {
    var self = this,
        decipher = crypto.createDecipheriv(self.algorithm, Buffer(key), '');
    
    decipher.setAutoPadding(false);
    try {
      return (decipher.update(Buffer(data, 'base64').toString('binary'), 'binary', 'utf8')+ decipher.final('utf8')).replace(/\x00+$/g, '');
    } catch (e) {
      return null;
    }
  }

exports.Blowfish = Blowfish;