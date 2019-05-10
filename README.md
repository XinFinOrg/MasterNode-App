## XinFin Governance DApp

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

```
Note: before deploying to XinFin Apothem, make sure you have XDC in the wallet. If not, get free at http://apothem.network/#getTestXDC

## Enable https
``` npm run dev-https```
## Run
- Start mongodb
- Start MasterNode-App
```
npm run dev
```
The site will run at [`http://localhost:3000`](http://localhost:3000)

