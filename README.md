# Kyber Initial Exchange Offering
In this document, we describe the initial exchange offering specification and implementation,
and give an overview over the smart contracts structure.

## Informal Specification
An initial exchange offering (IEO) is very similar to initial coin offering (ICO), however,
as oppose to standard token generation event (TGE, aka ICO), the tokens are generated before the IEO, and portion of them is transfered to the IEO contract, where user can exchange (buy) them in return to Ether.
It should be noted that in parallel these tokens could also be offered for sale (exchange) in other venues or platforms. Allocation for specific individuals and entities like advisors or pre-sale contributors is not done in the scope of the IEO.

The IEO is open only for registered users.
The list of registered users is not visible to the contract. Instead a dedicated server (that holds a dedicated private key) signs special data to prove to the contract the user has done the registeration process.

The IEO process takes place in two stages.
In the first stage, user ETH contribution is limited by a global per user cap.
In the second stage, (registered) users can make any size of contribution, until token supply is depleted.
It should be noted that the first or the second stage could be of 0 time. I.e., it is possible to execute a sell('exchange') that has only stage one or only stage two.

There is no ETH hard cap on the amount of contributions, however the limited supply of tokens dictates hard cap on number of sold tokens.

As an auxiliary feature, we also implemented a wrapper that allows user to contribute to the IEO with tokens that are tradable at kyber network exchange.
Namely, user can contribute with OMG tokens and receive tokens that are for sale in the IEO.

## Detailed description

### Overview of flow
Denote by T the start time of the IEO.

0. The contract `KyberIEOWrapper.sol` is deployed once and can be used across all of our IEOs.

1. On T - 1 month, users can register in kyber.network website.

1. On T - 5 days, we deploy `KyberIEO.sol` and ask the token project to transfer tokens to that contract.
Two special addresses are set. The first is the `kyberIEO` operator which signs user messages to prove they registered. The second one is the `IEORate` operator which can set token to ETH conversion rate at any time (if the rate is supposed to be fixed along the IEO, the operator can be set to a dummy adddress).

2. On T, the sale starts. At this point users can buy tokens according to the global per user cap.
It is possible to buy several times, as long as cap is not exceeded.
In order to participate in the sale they have to log-in into our website. A dedicated server will sign their contribution address, IEO id, and a user id, and will transmit their contribution transaction to the contract.

4. On T+X, the open sale starts. At this point registered users can buy tokens with any amount.

5. On T+X+Y, the sale ends. Unsold tokens are extracted from the contract.

### Per module description
The system has 3 modules, namely, IEO, Rate and Wrapper.

#### IEO
Implemented in `KyberIEO.sol`.
The module takes care of the token sale process and manages user cap accounting.
In addition, it deploys `IEORate.sol` contract which can set the conversion rate.

Three accounts play special role in this contract, namely, admin, operator and alerter (optional).
The admin account in controlled by a cold wallet (or a multisig) and can extract tokens from the contract. In addition it can assign operators and alerters.
The operator can sign registered user contribution. It will typically be in a hot wallet (server), though it need not hold any funds.
The alerter can only halt the IEO process in case it detects something wrong. 
In this case, only the admin account can resume the IEO.
Multiple alerters and operators can be defined.

#### Rate
Implemented in `IEORate.sol`.
Can set token to ETH conversion rate.
The main role of the admin is to assign operator(s). In addition it can extract any funds (tokens) that were accidentally sent over to the contract.
The operator account can set the rate.

#### Wrapper
Implemented in `KyberIEOWrapper`.
Wrapper is an auxiliary layer that can convert user tokens to ETH and direct the ETH to the IEO contract and make a contribution on behalf of the `msg.sender` (all in one tx).
This contract is planned to be deployed only once.
The concrete addresses of the IEO and kyber network contracts are given as input parameters in every function call.
In this contract, admin role is only to extract tokens that were sent to this contract by mistake.

### Use of zeppelin code
We use open-zeppling code for `SafeMath`.


# Known Issues
## Rate can be adjusted during the token sale
Allowing operator to change rate during the token sale period could lead to front running, where operator set higher (worse) rate after user sent the contribution transaction.
However, in initial token sale is a process that by definition requires a certain degree of trust in the issuing company. Hence, this issue can be mitigated by clearly conveying the rate update policy.

Another potential issue is potnentially giving privilage to a server (hot wallet) to set rates, or invalid rates set by fat finger.
For this purpose, projects who wish to eliminate this option, could set operator to an invalid address no one controls.
# Testrpc commandline
For truffle tests must use
testrpc -m "love is the greatest thing giggle shrivvle chase bicycle render exhaust check"
