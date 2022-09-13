// exports Deck object
module.exports = {
	Deck
}

// deck settings

// suits in deck
Deck.suits = [
	"Clovers",
	"Diamonds",
	"Hearts",
	"Spades"
];

// cards in each suit
Deck.cardsPerSuit = 13;

// card constructor
Deck.Card = function(id, suit){
	this.id = id;
	this.name = ["Ace", "2", "3", "4", "5", "6", "7", "8", "9", "10", "Jack", "Queen", "King"][id];
	this.minValue = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 10, 10, 10][id];
	this.maxValue = [11, 2, 3, 4, 5, 6, 7, 8, 9, 10, 10, 10, 10][id];
	this.suite = suit;

	// gets human readable name of card
	this.toString = function(showValue){
		// example: Ace of Spades or 5 of Diamonds (worth 5)
		return this.name + "of" + this.suit + (showValue ? `(worth ${this.value})` : "");
	}
}

// gets default cards
Deck.getDefaultCards = function(){
	let defaultCards = [];
	
	// loops for every suit
	for(let i = 0; i < Deck.suits.length; i++){
		// loops for every card in a suit
		for(let j = 0; j < Deck.cardsPerSuit; j++){
			// creates new card with current suit and value and adds to default cards
			defaultCards.push(new Deck.Card(j, Deck.suits[i]));
		}
	}	

	// returns default cards
	return defaultCards;
}
	
// deck constructor
function Deck(){
	this.cards = Deck.getDefaultCards();

	this.shuffle = function(){
		// randomizes order of cards
		this.cards.map(value => ({ value, sort: Math.random() }))
    .sort((a, b) => a.sort - b.sort)
    .map(({ value }) => value);
	}

	this.getRandomCardIndex = function(){
		return Math.floor(Math.random() * this.cards.length);
	}
}