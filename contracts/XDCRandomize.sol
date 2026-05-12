pragma solidity ^0.8.0;

contract XDCRandomize {

    mapping (address=>bytes32[]) randomSecret;
    mapping (address=>bytes32) randomOpening;

    constructor () {
    }

    function setSecret(bytes32[] memory _secret) public {
        uint secretPoint =  block.number % 900;
        require(secretPoint >= 800);
        require(secretPoint < 850);
        randomSecret[msg.sender] = _secret;
    }

    function setOpening(bytes32 _opening) public {
        uint openingPoint =  block.number % 900;
        require(openingPoint >= 850);
        randomOpening[msg.sender] = _opening;
    }

    function getSecret(address _validator) public view returns(bytes32[] memory) {
        return randomSecret[_validator];
    }

    function getOpening(address _validator) public view returns(bytes32) {
        return randomOpening[_validator];
    }
}
