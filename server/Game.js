const Player = require('./Player.js').Player;
const Bot = require('./Bot.js').Bot;
const Deck = require('./Deck.js').Deck;
const deepClone = require("lodash.clonedeep");

// exports game constructor
module.exports = {
	Game
}

// game constructor
Game.games = [];
Game.codes = [];
Game.publicGames = [];

// constructor for game data for a player or bot
Game.PlayerGameData = function() {
	this.cards = [];
	this.bust = false;
	this.standing = false;
	this.standValue = -1;
}

function Game() {
	// pushes game to static game.games
	Game.games.push(this);

	this.constructor = Game;
	this.dateOpened = new Date();
	this.day = 1;
	this.players = [];
	this.bots = [];
	this.passwords = [];
	this.chat = [];
	this.bannedIps = [];
	this.inGame = false;
	this.gameEnded = false;

	this.lotsOfBotsUnlocked = false;

	this.settings = {
		allowPlayersToJoin: true,
		public: false
	}

	this.gameData = {
		deck: new Deck()
	}

	// generates code
	while (!this.code || Game.codes.includes(this.code)) {
		this.code = Math.round(Math.random() * (999999 - 111111) + 111111);
		this.code = this.code.toString();
	}

	// adds code to list
	Game.codes.push(this.code);

	// join function
	this.join = function(name) {
		// checks if players are allowed to join right now
		if (!this.settings.allowPlayersToJoin) {
			return {
				failed: true,
				reason: "This game is not allowing new players to join right now."
			}
		}

		// checks if name is taken
		for (let i = 0; i < this.players.length; i++) {
			if (this.players[i].name == name) {
				return {
					failed: true,
					reason: "That username is already taken."
				}
			}
		}

		// generates player
		let player = new Player(name, this);
		this.players.push(player);
		this.passwords.push(player.password);

		return player;
	}

	// add bot function
	this.addBot = function() {
		// generates bot
		let bot = new Bot("Bot" + (this.bots.length), this);
		this.players.push(bot);
		this.passwords.push(null);
		this.bots.push(bot);

		// lots of bots easter egg
		if (this.bots.length > 24 && this.game.lotsOfBotsUnlocked) {
			this.sendMessage({
				action: "recieveMessage",
				messages: [{
					sender: "Moderator",
					message: "Bro, what do you need all these bots for? Oh, well.",
					date: new Date().toString(),
					permission: "everyone"
				}]
			});
		}

		return bot;
	}

	// remove bot function
	this.removeBot = function() {

		// makes sure there are bots to remove
		if (bots.length > 0) {
			// gets last bot (this is the one that will be removed)
			let bot = bots[bots.length - 1];
			let botName = bot.name;

			// removes bot from players and passwords
			let playerIndex = this.players.indexOf(bot);
			this.players.splice(playerIndex, 1);
			this.passwords.splice(playerIndex, 1);

			// removes bot from bots
			this.bots.pop();

			// tells players the bot was removed
			this.sendMessage({
				action: "recieveMessage",
				messages: [{
					sender: "Moderator",
					message: botName + " was removed from the game.",
					date: new Date().toString(),
					permission: "everyone"
				}]
			});
		} else {
			// tells players there are no bots
			this.sendMessage({
				action: "recieveMessage",
				messages: [{
					sender: "Moderator",
					message: "You can't remove a bot because there are none.",
					date: new Date().toString(),
					permission: "everyone"
				}]
			});
		}
	}

	// start game function
	this.startGame = function(player) {
		// removes game from public list
		if (Game.publicGames.includes(this)) Game.publicGames.splice(Game.games.indexOf(this), 1);

		// tells players game started
		this.sendMessage({
			action: "recieveMessage",
			messages: [{
				sender: "Moderator",
				message: `${player.name} has started the game.`,
				date: new Date().toString(),
				permission: "everyone"
			}]
		});

		// creates new deck and shuffles
		this.gameData.deck = new Deck();
		this.gameData.deck.shuffle();

		// deals each player two cards
		for (let i = 0; i < this.players.length; i++) {
			// gives player cards

			// repeats once for each card
			for (let j = 0; j < 2; j++) {
				// gets random card index
				randomIndex = this.deck.getRandomCardIndex();

				// deals card to player
				this.players[i].gameData.cards.push(this.deck.cards[randomIndex]);

				// removes card from deck
				this.deck.cards.splice(randomIndex, 1);
			}

			// skips bots
			if (!this.players[i].bot) {
				// tells player the cards they have been dealt
				this.sendMessage({
					action: "recieveMessage",
					messages: [{
						sender: "Moderator",
						message: `You have been dealt a ${this.players[i].cards[0].toString(true)} and ${this.players[i].cards[1].toString(true)}.`,
						date: new Date().toString(),
						permission: `user:${this.players[i].name}`
					}]
				});

				// gets value of hand
				let minValue = 0;
				let maxValue = 0;

				// adds min and max values of all cards
				for (let j = 0; j < this.players[i].cards.length; j++) {
					// min and max value of regular card is added
					minValue += this.players[i].cards[j].minValue;
					maxValue += this.players[i].cards[j].maxValue;
				}

				// checks if maxValue is over 21
				if (maxValue > 21) {
					maxValue = minValue;
				}

				// tells player total value
				this.sendMessage({
					action: "recieveMessage",
					messages: [{
						sender: "Moderator",
						message: `The value of your hand is ${maxValue == minValue ? minValue : minValue + " or " + maxValue}.\nUse <c>!stand</c> If you are happy with this value or <c>!hit</c> if you want to risk receiving another card.`,
						date: new Date().toString(),
						permission: `user:${this.players[i].name}`
					}]
				});
			}
		}

		// bot behavior

		// loops through bots
		for (let i = 0; i < this.bots.length; i++) {
			// random number from 13-18 determines the highest the bot hits at
			let risk = Math.floor(Math.random() * (18 - 13)) + 13;

			let handValue = -1;
			let cardsDrawn = 0;
			updateHandValue();

			// repeats until hand value exceeds risk or bust
			while (handValue < risk && handValue < 21) {
				// gets random card index
				randomIndex = this.deck.getRandomCardIndex();

				// deals card to bots
				this.bots[i].gameData.cards.push(this.deck.cards[randomIndex]);

				// removes card from deck
				this.deck.cards.splice(randomIndex, 1);

				// counts another card as drawn
				cardsDrawn++;

				// updates hand value
				updateHandValue();
			}

			function updateHandValue() {
				// gets value of hand
				let minValue = 0;
				let maxValue = 0;

				// adds min and max values of all cards
				for (let j = 0; j < bots[i].cards.length; j++) {
					// min and max value of regular card is added
					minValue += this.bots[i].cards[j].minValue;
					maxValue += this.bots[i].cards[j].maxValue;
				}

				// checks if maxValue is over 21
				if (maxValue > 21) {
					maxValue = minValue;
				}

				// updates hand value
				handValue = maxValue;
			}

			// checks if bust
			if (handValue > 21) {
				this.bots[i].gameData.bust = true;
				
				this.sendMessage({
					action: "recieveMessage",
					messages: [{
						sender: "Moderator",
						message: `${this.bots[i].name} draws ${cardsDrawn} and busts.`,
						date: new Date().toString(),
						permission: "everyone"
					}]
				});
			} else {
				this.bots[i].gameData.standing = true;
				this.bots[i].gameData.standValue = cardsDrawn;
				
				this.sendMessage({
					action: "recieveMessage",
					messages: [{
						sender: "Moderator",
						message: `${this.bots[i].name} draws ${cardsDrawn} before standing.`,
						date: new Date().toString(),
						permission: "everyone"
					}]
				});
			}
		}

		this.sendMessage({
			action: "recieveMessage",
			messages: [{
				sender: "Moderator",
				message: "Use <c>!hand</c> at any time to view your cards and your total value.",
				date: new Date().toString(),
				permission: "everyone"
			}]
		});

		for (let i = 0; i < this.players.length; i++) {
			this.sendMessage({
				action: "recieveMessage",
				messages: [{
					sender: "Moderator",
					message: `This is a private message to ${this.players[i].name} as an example.`,
					date: new Date().toString(),
					permission: `user:${this.players[i].name}`
				}]
			});
		}
	}

	this.sendMessage = function(message) {
		// adds message to chat list if applicable
		if (message.action == "recieveMessage") {
			this.chat = this.chat.concat(message.messages);
		}

		// loops through all players
		for (let l = 0; l < this.players.length; l++) {

			// loops through all websockets
			for (let i = 0; i < this.players[l].connections.length; i++) {
				// alteredMessage will not contain inaccessible messages
				let alteredMessage = deepClone(message);

				if (message.action == "recieveMessage") {
					for (let j = 0; j < alteredMessage.messages.length; j++) {
						// checks if permissions are appropriate for current message
						let permissionIncluded = false;

						var k = 0;

						// loops through permissions and checks if they match
						for (k = 0; k < this.players[l].connections[i].player.chatViewPermissions.length; k++) {
							if (this.players[l].connections[i].player.chatViewPermissions[k].name == message.messages[j].permission) {
								permissionIncluded = true;
								break;
							}
						}

						// checks if permission was had at the time the message was sent
						if (!permissionIncluded || this.players[l].connections[i].player.chatViewPermissions[k].start > message.messages[j].date || (!!this.players[l].connections[i].player.chatViewPermissions[k].end && this.players[l].connections[i].player.chatViewPermissions[k].end < message.messages[j].date)) {
							// removes current message
							alteredMessage.messages.splice(j, 1);

							// subtracts from j to compensate for removed message
							j--;
						}
					}

					// checks if any messages are to be sent
					if (alteredMessage.messages.length > 0) {
						this.players[l].connections[i].sendUTF(JSON.stringify(alteredMessage));
					}
				} else {
					// sends message without altering
					this.players[l].connections[i].sendUTF(JSON.stringify(alteredMessage));
				}
			}
		}
	}

	this.checkIfOver = function() {
		// checks if all players are standing or busted
		for (let i = 0; i < player.game.players.length; i++) {
			// returns if not standing
			if (!player.game.players[i].gameData.standing && !player.game.players[i].gameData.bust) return;
		}

		// if not returned here, it means all players are standing or busted

		// calls game to end
		this.endGame();
	}

	this.endGame = function(skipWait = false, alert = true) {
		// finds winner
		let highestScore = -1;
		let winners = [];

		let standingPlayersList = "";

		// loops through players
		for (let i = 0; i < this.players.length; i++) {
			// makes sure player didn't bust
			if (this.players[i].gameData.bust) continue;

			// adds player to list of players who are standing
			standingPlayersList += `<li>${this.players[i].name}: ${this.players[i].gameData.standValue}</li>`;

			// checks if score is higher than currently found highest score
			if (this.players[i].gameData.standValue > highestScore) {
				// sets new highest score and winner
				highestScore = this.players[i].gameData.standValue;
				winners = [this.players[i]];
			} else if (this.players[i].gameData.standValue == highestScore) { // checks for tie
				// adds player to array of winners since tied
				winners.push(this.players[i]);
			}
		}

		// prints scores of people who are standing
		this.sendMessage({
			action: "recieveMessage",
			messages: [{
				sender: "Moderator",
				message: "Everyone is now standing. The scores are: \n" + standingPlayersList,
				date: new Date().toString(),
				permission: "everyone"
			}]
		});

		// one winner
		if (winners.length == 1) {
			// announces winner
			this.sendMessage({
				action: "recieveMessage",
				messages: [{
					sender: "Moderator",
					message: `The winner is ${winners[0].name} with a score of ${highestScore}. Congratulations.`,
					date: new Date().toString(),
					permission: "everyone"
				}]
			});
		} else {
			let winnersList = "";

			// loops through winners
			for (let i = 0; i < winners.length; i++) {
				// adds current winner to list
				winnersList += `<li>${winners[i].name}</li>`;
			}

			// announces tied winners
			this.sendMessage({
				action: "recieveMessage",
				messages: [{
					sender: "Moderator",
					message: `The game is tied between ${winners.length} players. The following tied with a score of ${highestScore}:\n${winnersList}`,
					date: new Date().toString(),
					permission: "everyone"
				}]
			});
		}

		// closes game
		this.gameEnded = true;

		this.sendMessage({
			action: "recieveMessage",
			messages: [{
				sender: "Moderator",
				message: "This game is now over. If you want to play again, use <c>!start</c>. Otherwise, the game room will automatically close in 10 minutes. Thank you for playing.",
				date: new Date().toString(),
				permission: "everyone"
			}]
		});

		// closes game in ten minutes (if not reopened)
		setTimeout(() => {
			// makes sure room is still not in game
			if (this.inGame == false) return;

			// kicks out players from frontend
			if (alert) {
				this.sendMessage({
					action: "gameClosed",
					message: "This game was closed since it has been over for 10 minutes. Thank you for playing."
				});
			}

			// clears game data
			let index = Game.codes.indexOf(this.code);
			Game.codes.splice(index, 1);
			Game.games.splice(index, 1);
			if (Game.publicGames.includes(this)) Game.publicGames.splice(index, 1);
		}, skipWait ? 0 : 600000); // 600000 milliseconds = 10 minutes
	}

	// closes game if inactive
	setTimeout(() => {
		if (this.inGame == false) {
			this.sendMessage({
				action: "gameClosed",
				message: "This room was closed since it has been open for 15 minutes while not in game."
			});

			// clears game data
			let index = Game.codes.indexOf(this.code);
			Game.codes.splice(index, 1);
			Game.games.splice(index, 1);
			if (Game.publicGames.includes(this)) Game.publicGames.splice(index, 1);
		}
	}, 900000); // 900000 milliseconds = 15 minutes
}