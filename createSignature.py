import bitcoin
from ethereum import utils
from pycoin.serialize import b2h, h2b
priv = bitcoin.sha256('some big long brainwallet password')
priv = '97aea8fc0856a11859a4df65989ce89495df6106df035759019e09b1129ad336'
print("signer")
print(b2h(utils.privtoaddr(priv)))


IEOId = 0x1234;

userID1 = 0x123456789987654321abcd;
address1User1 = 0x3ee48c714fb8adc5376716c69121009bc13f3045;
address2User1 = 0xcb5595ce20f39c8a8afd103211c68284f931a1fb; #acount 7
address3User1 = 0x24007facc58575d23f0341dc91b41b849cd8259d; #acount 8

userID2 = 0x744456789987654321abcd;
address1User2 = 0x005feb7254ddccfa8b4a4a4a365d13a2a5866075; #account 9


userID3 = 0x744456789983217654321abcd;
address1User3 = 0x0220c2187de0136d738b407d1db5e3c6ab946112; #account 6


hexX = h2b("%0.40x" % address1User3)
hexY = h2b("%0.64X" % userID3)
hexZ = h2b("%0.64X" % IEOId)

msghash = b2h(utils.sha3(hexX + hexY + hexZ))
print("msghash")
print("0x" + msghash)

print("let IEOId = 0x%x" % IEOId)
print("let userID3 = 0x%x" % userID3)
print("let address1User3 = '0x%x';" % address1User3)

V, R, S = bitcoin.ecdsa_raw_sign(msghash, priv)

R = utils.int_to_hex(R)
S = utils.int_to_hex(S)
print("let vU3Add1 = '0x%x'" % V)
print("let rU3Add1 = '",R)
print("let sU3Add1 = '",S)

print("0x%x" % V, R, S)

