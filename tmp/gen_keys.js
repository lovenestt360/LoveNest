const crypto = require('crypto');
try {
  const ecdh = crypto.createECDH('prime256v1');
  ecdh.generateKeys();
  const publicKey = ecdh.getPublicKey('base64', 'uncompressed');
  const privateKey = ecdh.getPrivateKey('base64');
  console.log(JSON.stringify({ publicKey, privateKey }));
} catch (e) {
  console.error(e);
  process.exit(1);
}
