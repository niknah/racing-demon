export default class CardStack {
  constructor(playerId) {
    this.playerId = playerId;
    this.cards = [];
    this.lastPush = new Date().getTime();
  }

  shuffle() {
    for(const card of this.cards) {
      card.rand = Math.random();
    }
    this.cards = this.cards.sort((a, b) => {
      return a.rand - b.rand;
    });
  }

  length() {
    return this.cards.length;
  }

  moveTo(cardStack) {
    cardStack.cards = this.cards;
    this.cards=[];
  }

  push(card) {
    this.lastPush = new Date().getTime();
    this.cards.push(card);
  }

  mSecsSinceLastPush() {
    return (new Date().getTime())-this.lastPush;
  }

  popArray(amount) {
    let arr=[];
    for(let a = 0; a<amount; ++a) {
      const i = this.cards.pop();
      if(i) {
        arr.push(i);
      }
    }
    return arr;
  }

  lastCard() {
    return this.cards[this.cards.length-1];
  }

  pop() {
    return this.cards.pop();
  }
}

