const Game = require("./Game.js");

// exports player constructor
module.exports = {
	Player
}

// player constructor
function Player(name, game, host = false) {
	this.name = name.replace(/[\u00A0-\u9999<>\&]/gim, i => {
		return '&#' + i.charCodeAt(0) + ';'
	}); // removes HTML from name
	// generates random password for player
	this.password = Math.random().toString(36).substring(2) + Math.random().toString(36).substring(2) + Math.random().toString(36).substring(2) + Math.random().toString(36).substring(2) + Math.random().toString(36).substring(2) + Math.random().toString(36).substring(2) + Math.random().toString(36).substring(2) + Math.random().toString(36).substring(2);

	// connections
	this.connections = [];

	this.game = game;
	this.ips = [];
	this.host = host;
	this.bot = false;

	this.gameData = new Game.PlayerGameData();
	this.wins = 0;
	this.losses = 0;

	this.chatSendPermission = "everyone";
	this.chatViewPermissions = [
		{
			name: "everyone", // public messages, where most chat happens
			start: new Date(0), // early date to see messages sent before joining
			end: null
		},
		{
			name: `user:${this.name}`, // private messages to only user, typically from Moderator
			start: new Date(0), // early date to see messages sent before joining
			end: null
		}
	];

	this.leaveGame = function() {
		if (game.inGame && !game.gameEnded) {
			// tells player they can't leave game
			for (let i = 0; i < this.connections.length; i++) {
				this.connections[i].sendUTF(JSON.stringify({
					action: "alert",
					message: `You can't leave a game that's already started!`
				}));
			}
			return;
		}

		if (this.game.players.length > 1) {
			// leaves from frontend
			for (let i = 0; i < this.connections.length; i++) {
				this.connections[i].sendUTF(JSON.stringify({
					action: "gameClosed",
					message: `You left the game. ${this.game.gameEnded ? `Thank you for playing.` : `Use the code "${this.game.code}" if you want to join back.`}`
				}));
			}

			// tells other players they left
			this.game.sendMessage({
				action: "recieveMessage",
				messages: [{
					sender: "Moderator",
					message: `${this.name} has left the game.`,
					date: new Date(),
					permission: "everyone"
				}]
			});

			// checks if game was host
			if (this.host) {
				this.game.players[1].host = true;

				// tells other playes there is a new host
				this.game.sendMessage({
					action: "recieveMessage",
					messages: [{
						sender: "Moderator",
						message: `${this.name} used to be host, but since they left, ${this.game.players[1].name} is now host.`,
						date: new Date(),
						permission: "everyone"
					}]
				});
			}

			// deletes password from game
			this.game.passwords.splice(this.game.passwords.indexOf(this.password), 1);

			// deletes player from game
			this.game.players.splice(this.game.players.indexOf(this), 1);
		} else {
			// leaves from frontend
			for (let i = 0; i < this.connections.length; i++) {
				this.connections[i].sendUTF(JSON.stringify({
					action: "gameClosed",
					message: `You left the game. Since you were the last person in it, the game is now closed.`
				}));
			}

			// closes game since no players are left in it
			this.game.endGame(true, false);
		}
	}

	// kick
	this.kick = function(ipBan = false) {
		// kicks player from frontend
		for (let i = 0; i < this.connections.length; i++) {
			this.connections[i].sendUTF(JSON.stringify({
				action: "gameClosed",
				message: `You were ${ipBan ? "permanently banned" : "kicked"} from the game.`
			}));
		}

		// IP ban
		if (ipBan) {
			this.game.bannedIps = this.game.bannedIps.concat(this.ips);
		}

		// deletes password from game
		this.game.passwords.splice(this.game.passwords.indexOf(this.password), 1);

		// deletes player from game
		this.game.players.splice(this.game.players.indexOf(this), 1);
	}

	// onMessageEvents
	this.onMessageEvents = [
		// leaving game
		function(message, player) {
			if (message.action == "leaveGame") {
				player.leaveGame();
			}
		},

		// sends message
		function(message, player) {
			if (message.action == "sendMessage" && !!message.message) {
				// changes message action
				let alteredMessage = {
					action: "recieveMessage",
					messages: [{
						sender: player.name,
						message: message.message.replace(/[\u00A0-\u9999<>\&]/gim, i => {
							return '&#' + i.charCodeAt(0) + ';'
						}), // removes html from message
						date: new Date(),
						permission: player.chatSendPermission
					}]
				};

				// sends altered message
				player.game.sendMessage(alteredMessage);
			}
		},

		// global commands
		function(message, player) {
			if (message.action == "sendMessage" && !!message.message) {
				// complicated commands with parameters use if statements

				// !ban command
				if (message.message.substring(0, 5) == "!ban ") {
					// checks if game started
					if (player.game.inGame == false) {

						// checks if player is host
						if (player.host) {
							// !ban Moderator easter egg
							if (message.message == "!ban Moderator") {
								player.game.sendMessage({
									action: "recieveMessage",
									messages: [{
										sender: "Moderator",
										message: "I thought we were friends!",
										date: new Date(),
										permission: "everyone"
									}]
								});

								// exits function
								return;
							}

							let target = null;

							// loops through players in game
							for (let i = 0; i < player.game.players.length; i++) {
								// checks if current player name matches target name
								if (player.game.players[i].name == message.message.substring(5)) {
									target = player.game.players[i];
									break;
								}
							}

							// target not found
							if (target == null) {
								player.game.sendMessage({
									action: "recieveMessage",
									messages: [{
										sender: "Moderator",
										message: `There is no player in the game called "${message.message.substring(5)}". Check your spelling or try copy-pasting their name.`,
										date: new Date(),
										permission: "everyone"
									}]
								});

								// exits function
								return;
							}

							// banning a bot
							if (target.bot) {
								player.game.sendMessage({
									action: "recieveMessage",
									messages: [{
										sender: "Moderator",
										message: `Use <c>!bot remove</c> if you want to remove a bot.`,
										date: new Date(),
										permission: "everyone"
									}]
								});

								// exits function
								return;
							}

							// valid target

							// warns player
							player.game.sendMessage({
								action: "recieveMessage",
								messages: [{
									sender: "Moderator",
									message: `Are you sure you want to permanently ban ${message.message.substring(5)} out of the game? They will not be able to join back into the game. Bans cannot be reverted. Type <c>confirm</c> to confirm the ban.`,
									date: new Date(),
									permission: "everyone"
								}]
							});

							// gets index of future onMessage event for self destruction purposes
							var index = player.onMessageEvents.length;
							var timesFired = 0;

							// checks for next message to be "confirm"
							player.onMessageEvents.push(function(message, player) {
								// makes sure second time being called
								timesFired++;
								if (timesFired == 1) return;

								if (message.action == "sendMessage" && !!message.message) {
									if (message.message == "confirm") {
										// sends message confirming kick
										player.game.sendMessage({
											action: "recieveMessage",
											messages: [{
												sender: "Moderator",
												message: `${target.name} was permanently banned by ${player.name}. Ouch.`,
												date: new Date(),
												permission: "everyone"
											}]
										});

										// bans target
										target.kick(true);
									}

									// event listener self destructs (even if not confirmed)
									player.onMessageEvents.splice(index, 1);
								}
							})

						} else {
							player.game.sendMessage({
								action: "recieveMessage",
								messages: [{
									sender: "Moderator",
									message: "You can't ban anyone, lol, you dont have host permissions.",
									date: new Date(),
									permission: "everyone"
								}]
							});
						}
					} else {
						player.game.sendMessage({
							action: "recieveMessage",
							messages: [{
								sender: "Moderator",
								message: "The game already started, too late to ban anyone now.",
								date: new Date(),
								permission: "everyone"
							}]
						});
					}
				}

				// !kick command
				if (message.message.substring(0, 6) == "!kick ") {
					// checks if game started
					if (player.game.inGame == false) {

						// checks if player is host
						if (player.host) {
							// !kick Moderator easter egg
							if (message.message == "!kick Moderator") {
								player.game.sendMessage({
									action: "recieveMessage",
									messages: [{
										sender: "Moderator",
										message: "I thought we were friends!",
										date: new Date(),
										permission: "everyone"
									}]
								});

								// exits function
								return;
							}

							let target = null;

							// loops through players in game
							for (let i = 0; i < player.game.players.length; i++) {
								// checks if current player name matches target name
								if (player.game.players[i].name == message.message.substring(6)) {
									target = player.game.players[i];
									break;
								}
							}

							// target not found
							if (target == null) {
								player.game.sendMessage({
									action: "recieveMessage",
									messages: [{
										sender: "Moderator",
										message: `There is no player in the game called "${message.message.substring(6)}". Check your spelling or try copy-pasting their name.`,
										date: new Date(),
										permission: "everyone"
									}]
								});

								// exits function
								return;
							}

							// kicking a bot
							if (target.bot) {
								player.game.sendMessage({
									action: "recieveMessage",
									messages: [{
										sender: "Moderator",
										message: `Use <c>!bot remove</c> if you want to remove a bot.`,
										date: new Date(),
										permission: "everyone"
									}]
								});

								// exits function
								return;
							}

							// valid target

							// warns player
							player.game.sendMessage({
								action: "recieveMessage",
								messages: [{
									sender: "Moderator",
									message: `Are you sure you want to kick ${message.message.substring(6)} out of the game? They will still be able to join back. Type <c>confirm</c> to kick them out.`,
									date: new Date(),
									permission: "everyone"
								}]
							});

							// gets index of future onMessage event for self destruction purposes
							var index = player.onMessageEvents.length;
							var timesFired = 0;

							// checks for next message to be "confirm"
							player.onMessageEvents.push(function(message, player) {
								// makes sure second time being called
								timesFired++;
								if (timesFired == 1) return;
								if (message.action == "sendMessage" && !!message.message) {
									if (message.message == "confirm") {
										// sends message confirming kick
										player.game.sendMessage({
											action: "recieveMessage",
											messages: [{
												sender: "Moderator",
												message: `${target.name} was kicked by ${player.name}.`,
												date: new Date(),
												permission: "everyone"
											}]
										});

										// kicks out target
										target.kick();
									}
								}

								// event listener self destructs
								player.onMessageEvents.splice(index, 1);
							});

						} else {
							player.game.sendMessage({
								action: "recieveMessage",
								messages: [{
									sender: "Moderator",
									message: "You can't kick anyone out, lmao, you dont have host permissions.",
									date: new Date(),
									permission: "everyone"
								}]
							});
						}
					} else {
						player.game.sendMessage({
							action: "recieveMessage",
							messages: [{
								sender: "Moderator",
								message: "The game already started, too late to kick anyone out now.",
								date: new Date(),
								permission: "everyone"
							}]
						});
					}
				}

				// commands without parameters use switch statement
				switch (message.message) {
					// !bot add command
					case "!bot add": {
						// checks if in game
						if (player.game.inGame) {
							// bots can't be added in game
							player.game.sendMessage({
								action: "recieveMessage",
								messages: [{
									sender: "Moderator",
									message: "You can't add a bot in the middle of a game.",
									date: new Date(),
									permission: "everyone"
								}]
							});
						} else {
							// sends message adding bot
							player.game.sendMessage({
								action: "recieveMessage",
								messages: [{
									sender: "Moderator",
									date: new Date(),
									message: `${play.game.addBot().name} has been added to the game. Use <c>!bot remove<c> at any time to kick them out.`, // getting the name of a new bot adds the bot to the game
									permission: "everyone"
								}]
							});
						}
						break;
					}

					// !bot remove command
					case "!bot remove": {
						// checks if in game
						if (player.game.inGame) {
							// bots can't be removed in game
							player.game.sendMessage({
								action: "recieveMessage",
								messages: [{
									sender: "Moderator",
									message: "Wait till after this game, buddy.",
									date: new Date(),
									permission: "everyone"
								}]
							});
						} else {
							// removes bot from game (messages to player are sent by this function)
							player.game.removeBot();
						}
						break;

					}

					// !hand command
					case "!hand": {
						// makes sure in game
						if (!player.game.inGame) {
							return;
						}

						// makes sure player is still in game
						if (player.gameData.bust) {
							return;
						}

						// stores names of cards
						let cardsString = "";

						// gets value of hand
						let minValue = 0;
						let maxValue = 0;

						// adds min and max values of all cards
						for (let i = 0; i < player.cards.length; i++) {
							// min and max value of regular card is added
							minValue += player.cards[i].minValue;
							maxValue += player.cards[i].maxValue;

							cardsString += player.cards[i].toString();

							// adds comma if not last card
							if (i < player.cards.length - 1) cardsString += ", ";

							// adds and if second to last card
							if (i == player.cards.length - 2) cardsString += "and ";
						}

						// checks if maxValue is over 21
						if (maxValue > 21) {
							maxValue = minValue;
						}

						// tells player their hand
						player.game.sendMessage({
							action: "recieveMessage",
							messages: [{
								sender: "Moderator",
								message: "Your hand: " + cardsString,
								date: new Date().toString(),
								permission: `user:${player.name}`
							}]
						});

						// tells player total value
						player.game.sendMessage({
							action: "recieveMessage",
							messages: [{
								sender: "Moderator",
								message: `The value of your hand is ${maxValue == minValue ? minValue : minValue + " or " + maxValue}.\nUse <c>!stand</c> If you are happy with this value or <c>!hit</c> if you want to risk receiving another card.`,
								date: new Date().toString(),
								permission: `user:${player.name}`
							}]
						});
						break;
					}

					// !hit command
					case "!hit": {
						// makes sure in game
						if (!player.game.inGame) {
							return;
						}

						// makes sure player is still in game
						if (player.gameData.bust) {
							return;
						}

						// makes sure not standing
						if (player.gameData.standing) {
							player.game.sendMessage({
								action: "recieveMessage",
								messages: [{
									sender: "Moderator",
									message: "You already chose to stand and cannot get more cards.",
									date: new Date(),
									permission: "everyone"
								}]
							});

							return;
						}

						// valid usage of command

						// gets random card index
						randomIndex = player.game.deck.getRandomCardIndex();

						let cardName = player.game.deck.cards[randomIndex].toString();

						// deals card to player
						player.cards.push(player.game.deck.cards[randomIndex]);

						// removes card from deck
						player.game.deck.cards.splice(randomIndex, 1);

						// tells player dealt card
						player.game.sendMessage({
							action: "recieveMessage",
							messages: [{
								sender: "Moderator",
								message: "You were dealt a " + cardName,
								date: new Date().toString(),
								permission: `user:${player.name}`
							}]
						});

						// gets value of hand
						let minValue = 0;
						let maxValue = 0;

						// adds min and max values of all cards
						for (let i = 0; i < player.cards.length; i++) {
							// min and max value of regular card is added
							minValue += player.cards[i].minValue;
							maxValue += player.cards[i].maxValue;
						}

						// checks if maxValue is over 21
						if (maxValue > 21) {
							maxValue = minValue;
						}

						// tells player total value
						player.game.sendMessage({
							action: "recieveMessage",
							messages: [{
								sender: "Moderator",
								message: `The value of your hand is ${maxValue == minValue ? minValue : minValue + " or " + maxValue}.\nUse <c>!stand</c> If you are happy with this value or <c>!hit</c> if you want to risk receiving another card.`,
								date: new Date().toString(),
								permission: `user:${player.name}`
							}]
						});

						// checks for bust
						if (minValue > 21) {
							player.gameData.bust = true;

							// tells player they bust
							player.game.sendMessage({
								action: "recieveMessage",
								messages: [{
									sender: "Moderator",
									message: player.name + " has gone over 21 and bust.",
									date: new Date().toString(),
									permission: "everyone"
								}]
							});

							player.game.checkIfOver();
						}

						break;
					}

					// !players command
					case "!players": {
						var playersList = [];

						// gets list of player names
						for (let i = 0; i < player.game.players.length; i++) {
							playersList.push(player.game.players[i].name);
						}

						// sends list of player names
						player.game.sendMessage({
							action: "recieveMessage",
							messages: [{
								sender: "Moderator",
								message: `All players currently in the game: ${playersList.join(", ")}`,
								date: new Date(),
								permission: "everyone"
							}]
						});
						break;
					}

					// !players bust command
					case "!players bust": {
						var playersList = [];

						// gets list of player names
						for (let i = 0; i < player.game.players.length; i++) {
							if (player.game.players[i].bust) playersList.push(player.game.players[i].name);
						}

						if (playersList.length == 0) {
							// tells player nobody has bust
							player.game.sendMessage({
								action: "recieveMessage",
								messages: [{
									sender: "Moderator",
									message: "Nobody has bust yet.",
									date: new Date(),
									permission: "everyone"
								}]
							});
						} else {
							// sends list of player names
							player.game.sendMessage({
								action: "recieveMessage",
								messages: [{
									sender: "Moderator",
									message: `All players who bust: ${playersList.join(", ")}`,
									date: new Date(),
									permission: "everyone"
								}]
							});
						}
						
						break;
					}

					// !players standing command
					case "!players standing": {
						var playersList = [];

						// gets list of player names
						for (let i = 0; i < player.game.players.length; i++) {
							if (player.game.players[i].standing) playersList.push(player.game.players[i].name);
						}

						if (playersList.length == 0) {
							// tells player nobody is standing
							player.game.sendMessage({
								action: "recieveMessage",
								messages: [{
									sender: "Moderator",
									message: "Nobody is standing yet.",
									date: new Date(),
									permission: "everyone"
								}]
							});
						} else {
							// sends list of player names
							player.game.sendMessage({
								action: "recieveMessage",
								messages: [{
									sender: "Moderator",
									message: `All standing players: ${playersList.join(", ")}`,
									date: new Date(),
									permission: "everyone"
								}]
							});
						}
						
						break;
					}

					// !settings command
					case "!settings": {
						player.game.sendMessage({
							action: "recieveMessage",
							messages: [{
								sender: "Moderator",
								message: `Settings: <br> &nbsp; - Allow players to join (<c>!settings allowPlayersToJoin</c>): ${player.game.settings.allowPlayersToJoin} <br> &nbsp; - Public (<c>!settings public</c>): ${player.game.settings.public} <br>`,
								date: new Date(),
								permission: "everyone"
							}]
						});

						// checks if game started
						if (player.game.inGame) {
							player.game.sendMessage({
								action: "recieveMessage",
								messages: [{
									sender: "Moderator",
									message: "Note you cannot change these settings anymore since you are in the middle of a game.",
									date: new Date(),
									permission: "everyone"
								}]
							});
						}

						break;
					}

					// !settings allowPlayersToJoin command
					case "!settings allowPlayersToJoin": {
						// checks if game started
						if (player.game.inGame) {
							return;
						}

						// checks if player is host
						if (player.host == false) {
							player.game.sendMessage({
								action: "recieveMessage",
								messages: [{
									sender: "Moderator",
									message: `You need to have host permissions to change game settings.`,
									date: new Date(),
									permission: "everyone"
								}]
							});

							return;
						}

						// valid usage of command

						// sets variable to opposite
						player.game.settings.allowPlayersToJoin = !player.game.settings.allowPlayersToJoin;

						player.game.sendMessage({
							action: "recieveMessage",
							messages: [{
								sender: "Moderator",
								message: `New players are ${player.game.settings.allowPlayersToJoin ? "now" : "no longer"} able to join the game.`,
								date: new Date(),
								permission: "everyone"
							}]
						});

						break;
					}

					// !settings public command
					case "!settings public": {
						// checks if game started
						if (player.game.inGame) {
							return;
						}

						// checks if player is host
						if (player.host == false) {
							player.game.sendMessage({
								action: "recieveMessage",
								messages: [{
									sender: "Moderator",
									message: `You need to have host permissions to make the game public.`,
									date: new Date(),
									permission: "everyone"
								}]
							});

							return;
						}

						// valid usage of command
						let Game = player.game.constructor;

						// sets to private
						if (player.game.settings.public) {
							player.game.settings.public = false;
							Game.publicGames.splice(Game.publicGames.indexOf(player.game), 1);

							// sets to public
						} else {
							player.game.settings.public = true;
							Game.publicGames.push(player.game);
						}

						player.game.sendMessage({
							action: "recieveMessage",
							messages: [{
								sender: "Moderator",
								message: `The game was now set to ${player.game.settings.public ? "public" : "private"}.`,
								date: new Date(),
								permission: "everyone"
							}]
						});

						break;

					}

					// !stand command
					case "!stand": {
						// makes sure in game
						if (!player.game.inGame) {
							return;
						}

						// makes sure player didn't bust
						if (player.gameData.bust) {
							return;
						}

						// makes sure not already standing
						if (player.gameData.standing) {
							player.game.sendMessage({
								action: "recieveMessage",
								messages: [{
									sender: "Moderator",
									message: "You are already standing.",
									date: new Date(),
									permission: "everyone"
								}]
							});

							return;
						}

						// valid usage of command

						// sets standing to true
						player.gameData.standing = true;

						// gets value of hand
						let minValue = 0;
						let maxValue = 0;

						// adds min and max values of all cards
						for (let i = 0; i < player.cards.length; i++) {
							// min and max value of regular card is added
							minValue += player.cards[i].minValue;
							maxValue += player.cards[i].maxValue;
						}

						// checks if maxValue is over 21
						if (maxValue > 21) {
							maxValue = minValue;
						}

						// records value of hands while standing
						player.gameData.standValue = maxValue;

						player.game.sendMessage({
							action: "recieveMessage",
							messages: [{
								sender: "Moderator",
								message: "You are standing with a value of " + maxValue + ". Good luck.",
								date: new Date(),
								permission: `user:${player.name}`
							}]
						});

						player.game.sendMessage({
							action: "recieveMessage",
							messages: [{
								sender: "Moderator",
								message: player.name + " is choosing to stand.",
								date: new Date(),
								permission: "everyone"
							}]
						});

						player.game.checkIfOver();

						break;
					}

					// !start command
					case "!start": {
						if (player.game.inGame == false) {
							if (player.game.players.length < 3) {
								player.game.sendMessage({
									action: "recieveMessage",
									messages: [{
										sender: "Moderator",
										message: `You need at least 3 people to play the game. You currently only have ${player.game.players.length}. You can invite more people to join with the code "${player.game.code}". If you're a loser and have no friends, use <c>!bot add</c> to add a bot player.`,
										date: new Date(),
										permission: "everyone"
									}]
								});
							} else {
								player.game.startGame(player);
							}
						}
						break;
					}
				}
			}
		}
	];
}