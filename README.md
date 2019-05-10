## XinFin Governance DApp

This is Governance Dapp for XinFin. Full-Node can apply to become a candidate for masternode. Coin Holder can vote for candidates to become masternodes. See the detail from technical Whitepaper: https://docs.xinfin.network/whitepaper/](https://docs.xinfin.network/whitepaper/)

## Requirements
- NodeJS (If you get EACCES permission issue, please see: https://docs.npmjs.com/resolving-eacces-permissions-errors-when-installing-packages-globally)
- MongoDB
- Truffle Framework

## Config
```
cp config/default.json config/local.json
```
- Update `local.json` file to support your environment
  - Update mnemonic
  - Update mongodb configuration:
      - For docker:
      `  "db": {
      "uri": "mongodb://mongodb:27017/governance"
      },
    `
      - For localhost: 
      `
      "db": {
      "uri": "mongodb://localhost:27017/governance"
    },
    `

## Install
```
npm install
truffle deploy --reset --network XDC # only use this command if you want to connect to a private network
cp abis/*json build/contracts/
```
Note: before deploying to XinFin testnet, make sure you have XDC in the wallet. If not, get free at [https://faucet.xinfin.network](https://faucet.testnet.xinfin.network)

## Enable https
``` npm run dev-https```
## Run
- Start mongodb
- Start MasterNode-App
```
npm run dev
```
The site will run at [`http://localhost:3000`](http://localhost:3000)

## Test
```
npm run test
```
Or run command
```
truffle test
``` 



#### Test a special file
```
npm run test path_to_file/file.js
```
Or run command
```
truffle test path_to_file/file.js
```

