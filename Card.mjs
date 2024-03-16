/* globals cards */

import {cardNumbers} from './CardNumbers.mjs';

export default class Card {
  constructor(player, type, num) {
    this.player = player;
    const parsedNum = parseInt(num);
    Card.assert(parsedNum < cardNumbers.cardNumbers.length,'Invalid card number:' + num);
    Card.assert(cardNumbers.typeCodeToNumber(type)!==undefined,'Invalid card type:' + type);
    this.type = type;
    this.num = parsedNum;
  }

  static assert(test, mess) {
    if(!test) {
      console.error(mess);
    }
  }

  getColor() {
    return cardNumbers.getTypeColor(this.type);
  }

  static cardElemToCard(elem) {
    Card.assert(elem.classList.contains('card'));
    return Card.cardCodeToCard(elem.getAttribute('data-player'),cards.getCardCodeFromElement(elem));
  }

  static cardCodeToCard(playerId, cardCode) {
    return new Card(
      playerId,
      cardCode.substring(cardCode.length-1),
      cardNumbers.cardCodeToNumber(cardCode.substring(0,cardCode.length-1))
    );
  }

  getCardCode() {
    return `${cardNumbers.cardNumberToCode(this.num)}${this.type}`;
  }
}

