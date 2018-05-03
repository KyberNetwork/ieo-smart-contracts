var secp256k1 = require("secp256k1")
var ethUtils = require("ethereumjs-util")

const privateKey = "0x" + ethUtils.keccak256("real men use go to sign (and not javascript)").toString('hex');

module.exports.isRevertErrorMessage = function( error ) {
    if( error.message.search('invalid opcode') >= 0 ) return true;
    if( error.message.search('revert') >= 0 ) return true;
    if( error.message.search('out of gas') >= 0 ) return true;
    return false;
};


module.exports.sendEtherWithPromise = function( sender, recv, amount ) {
    return new Promise(function(fulfill, reject){
            web3.eth.sendTransaction({to: recv, from: sender, value: amount}, function(error, result){
            if( error ) {
                return reject(error);
            }
            else {
                return fulfill(true);
            }
        });
    });
};


module.exports.getBalancePromise = function( account ) {
    return new Promise(function (fulfill, reject){
        web3.eth.getBalance(account,function(err,result){
            if( err ) reject(err);
            else fulfill(result);
        });
    });
};


module.exports.getCurrentBlock = function() {
    return new Promise(function (fulfill, reject){
        web3.eth.getBlockNumber(function(err,result){
            if( err ) reject(err);
            else fulfill(result);
        });
    });
};

module.exports.bytesToHex = function (byteArray) {
    let strNum = toHexString(byteArray);
    let num = '0x' + strNum;
    return num;
};

function toHexString(byteArray) {
  return Array.from(byteArray, function(byte) {
    return ('0' + (byte & 0xFF).toString(16)).slice(-2);
  }).join('')
};

////////////////////////////////////////////////////////////////////////////////

module.exports.sendPromise = function(method, params) {
    return new Promise(function(fulfill, reject){
        web3.currentProvider.sendAsync({
          jsonrpc: '2.0',
          method,
          params: params || [],
          id: new Date().getTime()
        }, function(err,result) {
          if (err) {
            reject(err);
          }
          else {
            fulfill(result);
          }
        });
    });
};



function privateKeyToAddress(key) {
  const privateKey = ethUtils.toBuffer(key);
  const pubKey = ethUtils.privateToPublic(privateKey);
  return "0x" + ethUtils.publicToAddress(pubKey).toString('hex');
}

function ecsign (msgHash, privateKey) {
  const sig = secp256k1.sign(msgHash, ethUtils.toBuffer(privateKey))

  const ret = {}
  ret.r = "0x" + ethUtils.setLength(sig.signature.slice(0, 32),32).toString('hex')
  ret.s = "0x" + ethUtils.setLength(sig.signature.slice(32, 64),32).toString('hex')
  ret.v = "0x" + ethUtils.toBuffer(sig.recovery + 27).toString('hex')
  return ret
}

function getContributionSig(privateKey,contributor,userId,ieoId) {

  const contributorBuffer = ethUtils.setLength(ethUtils.toBuffer(contributor),20);
  const IEOIdBuffer = ethUtils.setLength(ethUtils.toBuffer(ieoId),32);
  const userIdBuffer = ethUtils.setLength(ethUtils.toBuffer(userId),32);
  const message = Buffer.concat([contributorBuffer,userIdBuffer,IEOIdBuffer]);
  const msgHash = ethUtils.keccak256(message);

  const ret = ecsign(msgHash,privateKey);
  return ret;
}

module.exports.getSignerAddress = function() {
  return privateKeyToAddress(privateKey);
}

module.exports.getContributionSignature = function(contributor,userId,ieoId) {
  return getContributionSig(privateKey,contributor,userId,ieoId);
}
