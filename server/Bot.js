const Game = require("./Game.js");

// exports player constructor
module.exports = {
	Bot
}

function Bot(name, game){
	this.name = name;
	this.game = game;
	this.bot = true;

	this.gameData = new Game.PlayerGameData();
	this.wins = 0;
	this.losses = 0;
}