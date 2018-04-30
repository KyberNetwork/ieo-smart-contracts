import bitcoin
from ethereum import utils
from pycoin.serialize import b2h, h2b
priv = bitcoin.sha256('some big long brainwallet password')
priv = '97aea8fc0856a11859a4df65989ce89495df6106df035759019e09b1129ad336'
print("signer")
print(b2h(utils.privtoaddr(priv)))


IEOId = 0x1234;
contributor = 0x3ee48c714fb8adc5376716c69121009bc13f3045;

hexX = h2b("%0.40x" % contributor)
hexY = h2b("%0.64X" % IEOId)

msghash = b2h(utils.sha3(hexX + hexY))
print("IEOId %x" % IEOId)
print("contributor %x" % contributor)

print("msghash")
print("0x" + msghash)

V, R, S = bitcoin.ecdsa_raw_sign(msghash, priv)
print("V R S")
R = utils.int_to_hex(R)
S = utils.int_to_hex(S)
print("0x%x" % V, R, S)

