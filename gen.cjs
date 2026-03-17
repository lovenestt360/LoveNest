const crypto = require('crypto');
const ecdh = crypto.createECDH('prime256v1');
ecdh.generateKeys();
const publicKey = ecdh.getPublicKey('base64', 'uncompressed');
const privateKey = ecdh.getPrivateKey('base64');
console.log(JSON.stringify({ publicKey, privateKey }));
