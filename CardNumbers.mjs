
export class CardNumbers {
  static AceNumber = 1;
  static KingNumber = 13;

  constructor() {
    this.cardNumbers=[null, 'A',2,3,4,5,6,7,8,9,10,'J','Q','K'];
    this.cardNumbersRev = {};
    this.cardTypes=['C','D','H','S'];
    this.cardTypesRev = {};

    for(let c = 1; c < this.cardNumbers.length; ++c) {
      let cardNumber = this.cardNumbers[c];
      this.cardNumbersRev[cardNumber] = c;
    }
    for(let c = 0; c < this.cardTypes.length; ++c) {
      let cardType = this.cardTypes[c];
      this.cardTypesRev[cardType] = c;
    }
  }

  typeCodeToNumber(code) {
    return this.cardTypesRev[code];
  }

  cardNumberToCode(num) {
    return this.cardNumbers[num];
  }

  cardCodeToNumber(colorCode) {
    return this.cardNumbersRev[colorCode];
  }

  getTypeColor(type) {
    return (type == 'H' || type == 'D') ? 'red' : 'black';
  }
}


export const cardNumbers = new CardNumbers();

