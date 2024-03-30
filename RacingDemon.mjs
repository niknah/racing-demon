/* global cards */

import {CardStackDroppable, CardStackDraggable, CardStackElement} from './CardDragDrop.mjs';
import {cardNumbers,CardNumbers} from './CardNumbers.mjs';
import NetworkClient from './NetworkClient.mjs';
import Card from './Card.mjs';
import CardStack from './CardStack.mjs';
import TimerCount from './TimerCount.mjs';

const config = {
  robotTest: null,
  debugPlayer: false,
  hintMove: false
};
window.config = config;



class CardStackWeb extends CardStack {
  constructor(playerId) {
    super(playerId);
    this.elem = null;
  }

  setElement(elem) {
    this.elem = elem;
  }

  push(card) {
    super.push(card);
    if(this.elem) {
      CardStackDroppable.addCard(this.elem, this.playerId, card.getCardCode());
    }
  }

  popArray(amount) {
    const arr = super.popArray(amount);
    for(let a = arr.length-1; a>=0; --a) {
      const topCardElem = CardStackDroppable.getTopNonBlankCard(this.elem);
//      console.assert(topCardElem.getAttribute('data-card-code') == arr[a].getCardCode());
      topCardElem.remove();
    }
    return arr;
  }

  pop() {
    if(this.cards.length===0) {
      return null;
    }
    if(this.elem) {
      const topCardElem = CardStackDroppable.getTopNonBlankCard(this.elem);
      topCardElem.remove();
    }
    return super.pop();
  }
}

class RacingDemonPlayer {
  constructor(playerId) {
    this.playerId = playerId;
    this.cards=new CardStack(playerId);
    this.poppedCards = new CardStack(playerId);
    this.timerCounts = {};
    for(const n of ['main','ace','drop']) {
      this.timerCounts[n] = new TimerCount(n);
    }
    this.lastCardEvent = null;
    this.startTime = new Date().getTime();
    this.finishTime = null;

    this.robotMoves = {};
    if(config.robotTest!==null) {
      this.randomRobotSpeed = 1;
      this.randomRobotMoveTopToStack = CardNumbers.KingNumber - config.robotTest;
    } else {
      this.randomRobotSpeed = 0.9 + (Math.random()*0.7);
//      const randomMoveTopToStack = Math.floor(Math.random()*4)-1;
      const randomMoveTopToStack = Math.floor(Math.random()*4);
      if(randomMoveTopToStack >= 0) {
        this.randomRobotMoveTopToStack = CardNumbers.KingNumber - randomMoveTopToStack;
      } else {
        this.randomRobotMoveTopToStack = -1;
      }
    }
    // Whether we move 10, J, Q, K when there is a blank spot

    this.$onFinish = $.Callbacks();
    this.hasFinished = false;
  }

  increaseRobotMove(type) {
    const count = this.robotMoves[type];
    if(count===undefined) {
      this.robotMoves[type]=1;
    } else {
      ++this.robotMoves[type];
    }
  }

  mSecsSinceCardEvent() {
    return (new Date().getTime()) - this.lastCardEvent;
  }

  static mSecsToTimeStr(gameMSecs) {
    const mSecs = gameMSecs % 1000;
    const secs = gameMSecs / 1000 % 60;
    const mins = gameMSecs / 1000 / 60;
    function padZero(num, digits) {
      return (Math.floor(num)+"").padStart(digits,'0')
    }
    return `${Math.floor(mins)}:${padZero(secs,2)}.${padZero(mSecs/10,3)}`;
  }

  getRandomTimeout(mSecs) {
    mSecs *= this.randomRobotSpeed;
    const robotTimerMSecs2 = mSecs*0.65;
    return Math.floor(  robotTimerMSecs2 + (Math.random() * (mSecs*0.5) ));
  }

  onFinish(func) {
    this.$onFinish.add(func);
  }

  fireOnFinish() {
    try {
      this.$onFinish.fire(this);
    } catch(e) {
      console.error(e);
    }
  }

  increaseTimerCount(stackType) {
    const now = new Date().getTime();
    if(this.lastCardEvent) {
      const timerCount = this.timerCounts[stackType];
      if(timerCount) {
        timerCount.addEvent(now - this.lastCardEvent);
      }
    }

    this.lastCardEvent = now;
  }

  initCards() {
    this.playerStacks = [];
    for(let s = 0; s < 5; ++s) {
      this.playerStacks.push(new CardStackWeb(this.playerId));
    }

    for(const type of cardNumbers.cardTypes) {
      for(let num = 1; num < cardNumbers.cardNumbers.length; ++num) {
        this.cards.push(new Card(this.playerId, type, num));
      }
    }
    this.cards.shuffle();
  }

  addCardToPlayerStack(stackNumber, card) {
    const playerStack = this.playerStacks[stackNumber];
    playerStack.cards.push(card);
  }

  poppedCardsToCards() {
    this.poppedCards.moveTo(this.cards);
    this.cards.cards.reverse();

    // put one card to top
    const firstCard = this.cards.cards[0];
    this.cards.cards = this.cards.cards.slice(1);
    this.cards.cards.push(firstCard);
  }
}

class RacingDemonPlayerWeb extends RacingDemonPlayer {
  constructor(playerId) {
    super(playerId);
    this.$onMainDragStop = $.Callbacks();
    this.$onFlipMainStack = $.Callbacks();
    this.$onAfterDrop = $.Callbacks();
    this.$onBeforeDrop = $.Callbacks();
  }

  onFlipMainStack(func) {
    this.$onFlipMainStack.add(func);
  }

  updateDebugRobotMoves() {
    $('.debug-move',this.div).html(
      JSON.stringify(this.robotMoves,Object.keys(this.robotMoves).sort(),4)+
      "\n"+
      TimerCount.timerCountsToStr(this.timerCounts)
    );
  }

  increaseRobotMove(type) {
    super.increaseRobotMove(type);
    if(config.debugPlayer || config.robotTest !== null) {
      this.updateDebugRobotMoves();
    }
  }

//  setCardsElement(elem) {
//    this.cards.setElement(elem);
//  }

  createGui(playArea) {
    const div = document.getElementById('player-template').cloneNode(true);
    div.id = `player-area-${this.playerId}`;
    div.classList.add(div.id);
    $('.player-name',div).html(`Player #${this.playerId+1}`);
    playArea.appendChild(div);
    this.playArea = playArea;

    return this.initGui(div);
  }

  startPlayerRobotTimer(racingDemon) {
    if(RacingDemonRobotTurn.startPlayerTimer(racingDemon, this) !== null) {
      this.div.classList.add('robot-player');
    }
  }

  initGui(div) {
    this.div = div;
    this.dropStacks = this.div.querySelectorAll('.drop-stack');
    this.$takeStack = $('.take-stack', this.div);
    this.$takeStack.get(0).setAttribute('data-player',this.playerId);
    this.aceStackCount = div.querySelector('.ace-stack-count');
    this.dropStackCount = div.querySelector('.drop-stack-count');
    this.totalCount = div.querySelector('.total-count');
    this.aceStackKingCount = div.querySelector('.ace-stack-king-count');
    this.mainStackCount = div.querySelector('.main-stack-count');

    this.cardStackDroppables = [];
    this.cardStackDraggables = [];
    this.flipMainStackEvent = () => {
      this.$onFlipMainStack.fire(this);
      this.flipMainStack();
    };
    this.mainStackDraggable = new CardStackDraggable(this.$takeStack, {
      backCard: CardStackDraggable.redBack,
      stop: () => {
        if(!this.mainStackDraggable.isTopCardBack()) {
          const lastCardElem = this.mainStackDraggable.getTopCard();
          if(lastCardElem && !lastCardElem.classList.contains('ui-draggable')) {
            this.mainStackDraggable.makeCardDraggable(lastCardElem);
            lastCardElem.addEventListener(
              'click', this.flipMainStackEvent
            );
          }
        }

        const mainStackCount = this.getMainStackCount();
        if(mainStackCount === 0 && !this.finishTime) {
          this.finishTime = new Date().getTime();
          this.hasFinished = true;
          this.fireOnFinish();
        }
        this.updateMainStackCount(mainStackCount);
        this.fireOnMainDragStop({player:this});
      },
      clickCardBack: () => this.flipMainStack()
    });
    this.initDropStacks();
    this.flipMainStack();
  }

  getMainStackCount() {
    return this.poppedCards.length() +
      this.cards.length() +
      this.$takeStack.get(0).children.length-1;
  }

  updateStatCount(countElem, count) {
    countElem.innerHTML = count || 0;
    if(count) {
      countElem.parentNode.classList.remove('no-count');
    } else {
      countElem.parentNode.classList.add('no-count');
    }
  }

  updateAceStackKingCount(count) {
    this.updateStatCount(this.aceStackKingCount, count);
  }

  updateAceStackCount(count) {
    this.updateStatCount(this.aceStackCount, count);
  }

  updateDropStackCount(count) {
    this.updateStatCount(this.dropStackCount, count);
  }

  updateTotalCount(count) {
    this.updateStatCount(this.totalCount, count);
  }

  updateMainStackCount(count) {
    this.mainStackCount.innerHTML = count; 
  }

  onMainDragStop(func) {
    this.$onMainDragStop.add(func);
  }

  fireOnMainDragStop(event) {
    try {
      this.$onMainDragStop.fire(this, event);
    } catch(e) {
      console.error(e);
    }
  }

  onAfterDrop(func) {
    this.$onAfterDrop.add(func);
  }

  fireOnAfterDrop(dropStack, dragElement) {
    let stackType=dropStack.getAttribute('data-stack-type');
    this.increaseTimerCount(stackType);
    this.$onAfterDrop.fire(this, {dropStack, dragElement});
  }

  onBeforeDrop(func) {
    this.$onBeforeDrop.add(func);
  }

  fireOnBeforeDrop(dropStack, dragElement) {
    this.$onBeforeDrop.fire(this, {dropStack, dragElement});
  }

  removeCardEvents(cardElement) {
    cardElement.removeEventListener('click', this.flipMainStackEvent);
  }

  flipMainStack() {
    const poppedCardsRev = [];
    while(!this.mainStackDraggable.isTopCardBack()) {
      const nonBlankCard = this.mainStackDraggable.getTopCard();
      if(nonBlankCard) {
        nonBlankCard.remove();
        const cardCode = RacingDemon.getCardCodeFromElement(nonBlankCard);

        const cardToPush = Card.cardCodeToCard(this.playerId, cardCode);
        poppedCardsRev.push(cardToPush);
      } else {
        break;
      }
    }
    poppedCardsRev.reverse();
    for(const poppedCard of poppedCardsRev) {
      this.poppedCards.push(poppedCard);
    }

    if(this.cards.length()===0) {
      this.poppedCardsToCards();
    }

    let poppedCards = this.cards.popArray(3);
    const poppedCardCodes = poppedCards.map((poppedCard) => poppedCard.getCardCode());
    const poppedCardElems = this.mainStackDraggable.flipTopCards(this.playerId, poppedCardCodes);
    if(this.cards.length()===0) {
      // replace last card with
      if(this.poppedCards.length()===0) {
        this.$takeStack.addClass('no-card-on-stack');
      } else {
        this.$takeStack.addClass('last-card-on-stack');
      }
    } else {
      this.$takeStack.removeClass('no-card-on-stack');
      this.$takeStack.removeClass('last-card-on-stack');
    }
    if(poppedCardElems.length>0) {
      poppedCardElems[poppedCardElems.length-1].addEventListener(
        'click', this.flipMainStackEvent
      );
    }
    cards.applyStyles(this.$takeStack);
    this.updateMainStackCount(this.getMainStackCount());
    this.increaseTimerCount('main');
  }

  initDropStack(dropStack, stackNum) {
    dropStack.setAttribute('data-drop-stack',stackNum);
    dropStack.setAttribute('data-player',this.playerId);
    const draggable = new CardStackDraggable($(dropStack), {
      stop: (/* dragElement */) => {
        CardStackDroppable.applyStyles($(dropStack));
      }
    });

    const droppable = new CardStackDroppable($(dropStack), {
      drop: (event, dragElement) => {
        this.removeCardEvents(dragElement);
        this.addCardToPlayerStack(stackNum, Card.cardCodeToCard(this.playerId,RacingDemon.getCardCodeFromElement(dragElement)));

        // Without this timeout, the draggable item isn't draggable
        //  Only ui-draggable is set, ui-draggable-handle is not set.
        setTimeout(() => {
          this.makeStackCardDraggable(stackNum, dragElement);
          CardStackDroppable.applyStyles($(dropStack));
          this.fireOnAfterDrop(dropStack, dragElement);
        },0);
      },
      accept: (cardElem) => {
        if(!cardElem || !cardElem.get(0)) {
          return false;
        }

        if(!cardElem.get(0).parentNode) {
          console.error('accept. no parent node', cardElem, cardElem.get(0));
          return false;
        }
        const playerId = cardElem.get(0).parentNode.getAttribute('data-player');
        if(playerId == this.playerId) {
          return true;
        }
        return false;
      },
      isDropAccept: (stack, dragElement) => {
        if(stack.children.length<=1) {
          return true;
        }
        const dragElementPlayerId = dragElement.parentNode.getAttribute('data-player');
        const stackPlayerId = stack.getAttribute('data-player');
        if(dragElementPlayerId!=stackPlayerId) {
          return false;
        }
        const cardCode = RacingDemon.getCardCodeFromElement(dragElement);
        const lastStackElem = CardStackDroppable.getTopNonBlankCard(stack);
        const lastStackCardCode = RacingDemon.getCardCodeFromElement(lastStackElem);
        const lastStackCard = Card.cardCodeToCard(0, lastStackCardCode);
        const lastStackCardColor = lastStackCard.getColor();
        const card = Card.cardCodeToCard(0, cardCode);
        const cardColor = card.getColor();
        if(card.num == (lastStackCard.num-1)
          && cardColor != lastStackCardColor
          && stack.getAttribute('data-drop-stack')!=dragElement.parentNode.getAttribute('data-drop-stack')
          ) {
          return true;
        }
        return false;
      }
    });

    droppable.onBeforeDrop((event) => {
      this.fireOnBeforeDrop(dropStack, event.dragElement);
    });

    return {draggable, droppable};
  }

  makeStackCardDraggable(stackNumber, cardElem) {
    this.cardStackDraggables[stackNumber].makeCardDraggable(cardElem);
  }

  initDropStacks() {
    let stackNum = 0;
    for(const dropStack of this.dropStacks) {
      let {draggable, droppable} = this.initDropStack(dropStack, stackNum);
      const cardStack = this.playerStacks[stackNum];
      cardStack.setElement(dropStack);
      this.cardStackDroppables.push(droppable);
      this.cardStackDraggables.push(draggable);

      const poppedCard = this.cards.pop();
      cardStack.push(poppedCard);
      this.makeStackCardDraggable(stackNum, CardStackDroppable.getTopNonBlankCard(cardStack.elem));

      ++stackNum;
    }
  }

}



class RacingDemonRobotTurn {
  constructor(racingDemon) {
    this.racingDemon = racingDemon;
    this.lastAceStackCards=this.getLastAceStackCard();
    this.player = null;

    // If someone drops on a stack,
    // there needs to be some time for another player to look at it first.
    this.minMSecsBetweenDrop = 2000;
    this.checkTooQuick = true;
  }

  getLastAceStackCard() {
    const lastCards = [];
    let upto = 0;
    for(const aceStack of this.racingDemon.aceStackElems) {
      const lastCardElem = CardStackDroppable.getTopNonBlankCard(aceStack);

      lastCards.push({
        elem:lastCardElem,
        aceStack,
        aceStackDroppable:this.racingDemon.aceStacksDroppable[upto],
        card: lastCardElem ? Card.cardElemToCard(lastCardElem):null
      });
      ++upto;
    }
    return lastCards;
  }

  getFirstLastDropStacks() {
    const firstLast = [];
    for(const dropStack of this.player.dropStacks) {
      const cards = CardStackElement.getCardListFromStackElem(dropStack);
      if(cards.length === 0) {
        firstLast.push({
          dropStack,
          cards,
        });
        continue;
      }
      const firstCard = cards[0];
      const lastCard = cards[cards.length-1];
      firstLast.push({
        dropStack,
        cards,
        firstElem: firstCard.cardElem,
        lastElem: lastCard.cardElem,
        first: Card.cardCodeToCard(firstCard.playerId, firstCard.code),
        last: Card.cardCodeToCard(lastCard.playerId, lastCard.code)
      });
    }
    return firstLast;
  }

  findPreFirstToAceDropStackMove() {
    if(!this.firstEmptyDropStack) {
      return null;
    }
    for(const from of this.firstLast) {
      if(!from.first || from.cards.length < 2) {
        continue;
      }

      if(this.findCardToAceStackMove(from.first, from.firstElem, true)) {
        // we can move the first card to an ace stack
        // Let's move the 2nd card down
        return {
          type: 'PreFirstToAceDropStack',
          fromCard: from.cards[1].cardElem,
          waitMSecs: 500,
          toStack: this.firstEmptyDropStack
        };
      }
    }
    return null;
  }

  findInterDropStackMove() {
    let fromUpto = 0;
    for(const from of this.firstLast) {
      let toUpto = 0;

//        const fromCard = Card.cardElemToCard(cardObj.cardElem);
      const fromCard = from.first;
      for(const to of this.firstLast) {
        if(
          fromCard && to.last
          && toUpto != fromUpto
          && this.canAddCardToDropStack(fromCard, to.last)
        ) {
          // can drag first to last
          return {
            type: 'InterDropStack',
            fromCard: from.firstElem,
            toStack: to.dropStack
          };
        }
        ++toUpto;
      }
      ++fromUpto;
    }
    return null;
  }

  setCheckTooQuick(b) {
    this.checkTooQuick = b;
  }

  isMoveToStackTooQuick(playerId, droppable, lastCard) {
    if(config.robotTest!==null || !this.checkTooQuick) {
      return false;
    }
    const mSecsSinceLastDrop = (new Date().getTime())-droppable.lastCardDrop;
    if(lastCard
      && lastCard.playerId != playerId
      && mSecsSinceLastDrop < this.minMSecsBetweenDrop
    ) {
      // Another player is dropping into the stack
      // don't let them drop too quickly.
//console.log('ace stack too quick',mSecsSinceLastDrop ,'player',playerId);
      return true;
    }
    return false;
  }

  canAddCardToDropStack(card, lastCard ) {
    return (lastCard.num-1) == card.num
      && lastCard.getColor() != card.getColor()
    ;
  }

  findRemainingMainStackToDropMove() {
    if(!this.mainCard) {
      return null;
    }
    // check if we have enough blank spots to move all remaining cards to
    const remainingMainCards = this.player.getMainStackCount();

    if(remainingMainCards <= this.firstLast.length) {
      if(this.emptyDropStacks >= remainingMainCards) {
        let blankDropStack = null;
        for(const fl of this.firstLast) {
          if(!fl.first) {
            blankDropStack = fl.dropStack;
          }
        }
        const move = {
          type:'RemainingMainStackToDropMove',
          fromCard: this.mainCardElem,
          toStack: blankDropStack,
          waitMSecs: 500,
        };
        return move;
      }
    }
    return null;
  }

  findMainStackToDropMove() {
    if(!this.mainCard) {
      return null;
    }

    let waitMSecs = null;
    let type = 'MainToDropStack';

    for(const fl of this.firstLast) {
      let moveOk = false;
      if(!fl.first) {
        // Can we move main card to a blank drop stack and put the top of a drop stack there.
        if(this.firstEmptyDropStack !== null) {
          // check stack cards to see if it can go on top of hand card
          for(const fl2 of this.firstLast) {
            if(
              fl2.first
              && this.canAddCardToDropStack(fl2.first, this.mainCard)
            ) {
              // We can move the middle of stack after main card
              type = 'PreInterMoveMainToDropStack';
              waitMSecs = 500;
              moveOk=true;
              break;
            }
          }
        }

        /* eslint-disable-next-line no-empty */
        if(moveOk) {

        } else if(
          // have more than one empty drop stack
          this.emptyDropStacks > 1
          // Don't put 2, king into empty drop stack because we can only add up/down wards not both ways.
          && this.mainCard.num != CardNumbers.KingNumber
          && this.mainCard.num != 2
        ) {
          moveOk = true;
        } else {
          continue;
        }
      } else if(
        this.canAddCardToDropStack(this.mainCard, fl.last)
      ) {
        moveOk = true;
      }

      if(moveOk) {
        const move = {
          type,
          fromCard: this.mainCardElem,
          toStack: fl.dropStack
        };
        if(waitMSecs) {
          // last few cards, move it quickly
          move.waitMSecs = waitMSecs;
        }
        return move;
      }
    }
    return null;
  }

  findMainToAceStackMove() {
    if(!this.mainCard) {
      return null;
    }
    
    return this.findCardToAceStackMove(this.mainCard, this.mainCardElem, true);
  }

  findCardToAceStackMove(card, cardElem, checkTooQuick) {
    let aceStackUpto = 0;
    for(const lastAceStack of this.lastAceStackCards) {
      try {
        const droppable = this.racingDemon.aceStacksDroppable[aceStackUpto];
        if(checkTooQuick 
          && this.isMoveToStackTooQuick(this.player.playerId, droppable, lastAceStack.card)
        ) {
          continue;
        }

        if(!lastAceStack.card) {
          // empty ace stack
          if(card.num == CardNumbers.AceNumber) {
            return {
              type: 'MainToEmptyAceStack',
              fromCard: cardElem,
              toStack: lastAceStack.aceStack
            };
          }
          continue;
        }

        if(
          (lastAceStack.card.num+1) == card.num
          && lastAceStack.card.type == card.type
        ) {
          return {
            type: 'MainToAceStack',
            fromCard: cardElem,
            toStack: lastAceStack.aceStack
          };
        }
      } finally {
        ++aceStackUpto;
      }
    }
    return null;
  }

  findDropStackToAceStackMove() {
    for(const fl of this.firstLast) {
      if(!fl.last) {
        continue;
      }
      const move = this.findCardToAceStackMove(fl.last, fl.lastElem, true);
      if(move) {
        move.type = 'DropStackToAceStack';
        return move;
      }
    }
    return null;
  }

  setPlayer(player) {
    this.player = player;
    this.takeStack = player.$takeStack.get(0);
    if(!player.mainStackDraggable.isTopCardBack()) {
      this.mainCardElem = player.mainStackDraggable.getTopCard();
      if(this.mainCardElem) {
        this.mainCard = Card.cardElemToCard(this.mainCardElem);
      }
    } else {
      this.mainCardElem = this.mainCard = null;
    }
    this.firstLast=this.getFirstLastDropStacks();

    this.firstEmptyDropStack = null;
    this.emptyDropStacks = 0;
    for(const fl of this.firstLast) {
      if(!fl.first) {
        this.firstEmptyDropStack = fl.dropStack;
        ++this.emptyDropStacks;
      }
    }
  }

  robotFindNextStep() {
    const remainingMainStackMove = this.findRemainingMainStackToDropMove();
    if(remainingMainStackMove) {
      return remainingMainStackMove;
    }

    const aceStackMove = this.findMainToAceStackMove();
    if(aceStackMove) {
      return aceStackMove;
    }

    // drop stack to ace stack first because we 
    // may have exposed a card with a move PreFirstToAceDropStack earlier.
    const dropToAceMove = this.findDropStackToAceStackMove();
    if(dropToAceMove) {
      return dropToAceMove;
    }

    // can we put drop stack top to drop stack bottom
    // Do this before main to drop stack move 
    //  so that we don't put a card on top of a drop stack here 
    //  which may prevent an inter drop stack move which can free up a drop stack
    //
    const stackMove = this.findInterDropStackMove();
    if(stackMove) {
      return stackMove;
    }

    // can we put main into bottom of drop stack?
    const mainStackMove = this.findMainStackToDropMove();
    if(mainStackMove) {
      return mainStackMove;
    }

    const firstToAceDropStackMove = this.findPreFirstToAceDropStackMove();
    if(firstToAceDropStackMove) {
      return firstToAceDropStackMove;
    }
  }

  getWaitFromMove(move) {
    // get random timeout for player
    const player = this.player;
    const racingDemon = this.racingDemon;

    let randomTimeout = null;
    if(move) {
      if(move.waitMSecs) {
        randomTimeout = player.getRandomTimeout(move.waitMSecs);
      } else if(/DropStack$/.exec(move.name)) {
        randomTimeout = player.getRandomTimeout(racingDemon.timerCounts.drop.mSecsPerMove());
      } else if(/AceStack$/.exec(move.name)) {
        randomTimeout = player.getRandomTimeout(racingDemon.timerCounts.ace.mSecsPerMove());
      }
    } 

    if(!randomTimeout && racingDemon.timerCounts) {
      const mainMSecsPerMove=racingDemon.timerCounts.main.mSecsPerMove();
      if(mainMSecsPerMove<500) {
        // ???? Sometimes the player may have clicked it the stack back and forth lots for fidgetting or at the end of the of the game.
        randomTimeout = player.getRandomTimeout(racingDemon.robotTimerMSecs);
      } else {
        randomTimeout = player.getRandomTimeout(mainMSecsPerMove);
      }
    } else {
      randomTimeout = 6000;
    }
    return randomTimeout;
  }

  robotDoNextStep() {
    const move = this.robotFindNextStep();
    if(move) {
console.log('playerMove', this.player.playerId, move);
      CardStackDraggable.dragCardToStack(move.fromCard, move.toStack);
    } else {
      // flip main stack
      this.player.flipMainStack();
    }
    this.player.increaseRobotMove(move ? move.type : 'FlipMainStack');

    return move;
  }

  static getNextMove(racingDemon, player) {
    const racingDemonRobotTurn = new RacingDemonRobotTurn(racingDemon);
    racingDemonRobotTurn.setPlayer(player);
    racingDemonRobotTurn.setCheckTooQuick(false);
    return racingDemonRobotTurn.robotFindNextStep();
  }

  static doPlayerTurn(racingDemon, player) {
    if(racingDemon.gameFinished || player.hasFinished) {
      return null;
    }
    const racingDemonRobotTurn = new RacingDemonRobotTurn(racingDemon);
    racingDemonRobotTurn.setPlayer(player);

    const move = racingDemonRobotTurn.robotFindNextStep();
    let randomTimeout = racingDemonRobotTurn.getWaitFromMove(move);
    if(config.robotTest!==null) {
      randomTimeout = 100;
    }
    player.robotTimeoutId = setTimeout(
      () => {
        try {
          const racingDemonRobotTurn = new RacingDemonRobotTurn(racingDemon);
          racingDemonRobotTurn.setPlayer(player);
          racingDemonRobotTurn.robotDoNextStep();
        } finally {
          RacingDemonRobotTurn.doPlayerTurn(racingDemon, player);
        }
      }, randomTimeout);
  }

  static startPlayerTimer(racingDemon, player) {
    if(config.robotTest===null && racingDemon.playerId == player.playerId) {
      return null;
    }
    if(player.robotTimeoutId) {
      return null;
    }

    let firstTimeout;
    if(config.robotTest!==null) {
      firstTimeout = 100;
    } else {
      firstTimeout = player.getRandomTimeout(racingDemon.robotTimerMSecs);
    }
    player.robotTimeoutId = setTimeout(() => RacingDemonRobotTurn.doPlayerTurn(racingDemon, player), firstTimeout);
    return player.robotTimeoutId;
  }

}


class RacingDemon {
  constructor(playersCount) {
    this.players = [];
    this.robotPlayers = [];
    this.playerId = 0;
    this.robotTimerMSecs = 10000;

    this.gameFinished = false;
    this.continuePlaying = false;

    this.gameStartTime = new Date().getTime();
    this.networkClient = null;
    this.setupNetworkClient();

    if(!playersCount) {
      playersCount = 2;
    }
    for(let p = 0; p < playersCount; ++p ) {
      const player = this.addPlayer(p);
      if(p == this.playerId) {
        player.randomRobotMoveTopToStack = -1;
      }
    }
  }

  setupNetworkClient() {
    if(document.location.search) {
      const params = URLSearchParams(document.location.search.substring(1))
      if(params.gameId) {
        this.networkClient = new NetworkClient(params.gameId);

        this.networkClient.onPlayerMove((obj) => this.onRemotePlayerMove(obj));
      }
    }
  }

  onRemotePlayerMove(obj) {
    // TODO:
    // obj.fromCard, obj.toStack
    console.log('remote player move', obj);
  }

  debugNextMove(player, dragElement) {
    if(!config.hintMove) {
      return;
    }

    const $nextMove = $('.next-move',this.div);
    const r = this.getHintNextMove(player, dragElement);
    if(r.status == 'ok') {
      $nextMove.addClass('next-move-ok');
    } else {
      $nextMove.removeClass('next-move-ok');
    }

    $nextMove.html(`${r.status}: ${r.message}`);
  }

  getHintNextMove(player, dragElement) {
    const move = RacingDemonRobotTurn.getNextMove(this, player);
    let status = 'ok';
    let message = '';
    if(move) {
      const cardCode = RacingDemon.getCardCodeFromElement(move.fromCard);
      if(dragElement) {
        const draggedCardCode = RacingDemon.getCardCodeFromElement(dragElement);
        if(draggedCardCode != cardCode) {
          status = 'not same';
        }
      } else {
        status = 'not same';
      }
      const stackType = move.toStack.getAttribute('data-stack-type');
      let stackName = '';
      if(stackType == 'ace') {
        stackName = `Shared stack #${parseInt(move.toStack.getAttribute('data-ace-stack'))+1}`;
      } else {
        stackName = `Personal stack #${parseInt(move.toStack.getAttribute('data-drop-stack'))+1}`;
      }
      message=`${cardCode} -> ${stackName} (${move.type})`;
    } else {
      status = (dragElement === null) ? 'ok' : 'not same';
      message=`flip main stack`;
    }
    return {status, message};
  }

  onPlayerBeforeDrop(player, event) {
    if(this.playerId == player.playerId) {
      this.debugNextMove(player, event.dragElement);
    }
  }

  onPlayerFlipMainStack(player) {
    if(this.playerId == player.playerId) {
      this.debugNextMove(player, null);
    }
  }

  addPlayer(playerId) {
    const cardPlayer = new RacingDemonPlayerWeb(playerId);
    cardPlayer.onFinish((player) => this.onPlayerFinish(player));
    cardPlayer.onBeforeDrop((player, event) => this.onPlayerBeforeDrop(player, event));
    cardPlayer.onFlipMainStack((player, event) => this.onPlayerFlipMainStack(player, event));
    this.players[playerId]=cardPlayer;
    cardPlayer.initCards();
    return cardPlayer;
  }

  hasPlayerWon() {
    for(const player of this.players) {
      if(player.hasFinished) {
        return player;
      }
    }
    return null;
  }

  saveTimerCounts(playerId) {
    const thisPlayer = this.players[playerId];
    if(thisPlayer) {
      let hasNoCount = false;
      if(thisPlayer.mSecsSinceCardEvent() >= 60000) {
        // Player has been idle, let's not record their time.
        return false;
      }

      for(const timerCount of Object.values(thisPlayer.timerCounts)) {
        if(!timerCount.count) {
          hasNoCount = true;
        }
      }
      if(!hasNoCount) {
console.log('save timer counts, average mSecs',thisPlayer.mSecsSinceCardEvent(), TimerCount.timerCountsToStr(thisPlayer.timerCounts));
        const hasSavedTimerCount = localStorage.getItem('lastTimerCounts')?true:false;
        // Save timer counts when player has finished or if they haven't saved before
        if(!hasSavedTimerCount || thisPlayer.hasFinished) {
          localStorage.setItem('lastTimerCounts',JSON.stringify(thisPlayer.timerCounts));
        }
      }
    }
    return true;
  }

  onPlayerFinish(player) {
    const wonResult = this.hasPlayerWon() ? 'finished' : 'won';

    let isHuman = false;
    if(config.robotTest===null) {
      isHuman = player.playerId == this.playerId
      if(
        isHuman
        || !this.players[this.playerId].hasFinished
      ) {
        // is human player that has finished
        // or human is still playing and robot has finished
        this.saveTimerCounts(this.playerId);
      }
    }

    const gameMSecs = new Date().getTime() - this.gameStartTime;
    const timeStr = RacingDemonPlayer.mSecsToTimeStr(gameMSecs);
    this.updatePlayerRanks();
    let askContinue = true;
    if(config.robotTest!==null) {
      askContinue = false;
    } else if(this.continuePlaying) {
      // continue playing till the end, don't ask continue again if the robot player finished
      askContinue = false;
    } 

    if(isHuman) {
      askContinue = true;
    }
console.log('askContinue',askContinue,isHuman, 'player', player.playerId ,this.playerId);


    // To quickly finish a players game, press F12, run... racingDemon.players[1].poppedCards.cards=racingDemon.players[1].cards.cards=[]

    // Mark game as finished so the robot doesn't continue playing while we wait for the player to confirm
    const gameFinished = this.gameFinished;
    this.gameFinished = true;

    const playerName = this.getPlayerName(player.playerId);
    if(askContinue) {
      if(window.confirm(`${playerName} has ${wonResult}\nTime taken: ${timeStr}\nContinue playing?`)) {
        this.continuePlaying = true;
        this.gameFinished = false;
      } else {
        this.continuePlaying = false;
        this.gameFinished = true;
      }
    } else {
      this.gameFinished =  gameFinished;
    }
  }

  getPlayerName(playerId) {
    if(playerId == this.playerId) {
      return 'You';
    }
    return `Player #${playerId+1}`;
  }

  getLastTimerCounts() {
    const jsonStr = localStorage.getItem('lastTimerCounts');
    if(jsonStr) {
      return TimerCount.parseObjects(JSON.parse(jsonStr));
    }
    return null;
  }

//  robotTimer() {
//    const robotTimerMSecs2 = this.robotTimerMSecs*0.65;
//    setTimeout(() => {
//      if(!this.gameFinished) {
//        const racingDemonRobotTurn = new RacingDemonRobotTurn(this);
//        racingDemonRobotTurn.doAllPlayers();
//      }
//      this.robotTimer();
//    }, 
//      Math.floor(  robotTimerMSecs2 + (Math.random() * (this.robotTimerMSecs*0.5) ))
//    );
//  }

  static getCardCodeFromElement(cardElem) {
    return cards.getCardCodeFromElement(cardElem);
  }

  createAceStackDroppable(aceStack) {
    const droppable = new CardStackDroppable($(aceStack),{
      drop: (event, dragElement) => {
        droppable.lastCardDrop = new Date().getTime();

        // Don't know why, the stack occasionally goes funny when card dropped
        setTimeout(() => {
          CardStackDroppable.applyStyles($(aceStack)); 
          this.updateStackCounts();
          this.updatePlayerRanks();
          const playerId = dragElement.getAttribute('data-player');
          this.players[playerId].fireOnAfterDrop(aceStack, dragElement);
        },0);
      },
      isDropAccept: (stack, dragElement) => {
        const topCardElem = droppable.getTopNonBlankCard();
        const draggedCardCode = RacingDemon.getCardCodeFromElement(dragElement);
        if(dragElement.parentNode.classList.contains('drop-stack')) {
//          const dropStackNum = dragElement.parentNode.getAttribute('data-drop-stack');
        } else if(!dragElement.parentNode.classList.contains('take-stack')) {
          return false;
        }

        const card = Card.cardCodeToCard(this.playerId, draggedCardCode);
        let r=false;
        if(!topCardElem) {
          if(card.num == CardNumbers.AceNumber) {
            this.addAceStack();
            r=true;
          }
        } else {
          const topCardCode = RacingDemon.getCardCodeFromElement(topCardElem);
          const playerId = topCardElem.parentNode.getAttribute('data-player');
          const topCard = Card.cardCodeToCard(playerId, topCardCode);
          if((topCard.num + 1) == card.num && topCard.type == card.type) {
            r=true;
          }
          if(r===true && topCard.num==CardNumbers.KingNumber) {
            // king dropped
            aceStack.classList.add('stack-full');
          }
        }
        if(r===true) {
          const playerId = dragElement.parentNode.getAttribute('data-player');
          this.players[playerId].removeCardEvents(dragElement);
        }
        return r;
      }
    });

    droppable.onBeforeDrop((event) => {
      const playerId = event.dragElement.getAttribute('data-player');
      this.players[playerId].fireOnBeforeDrop(aceStack, event.dragElement);
    });

    return droppable;
  }

  updateStackCounts() {
    const byPlayerIds = this.getStackCounts();
    for(const playerId in byPlayerIds) {
      const player = this.players[playerId];
      const stat = byPlayerIds[playerId];
      player.updateAceStackCount(stat.aceStackCount);
      player.updateDropStackCount(stat.dropStackCount);
//      player.updateTotalCount(stat.dropStackCount+stat.aceStackCount);
      player.updateAceStackKingCount(stat.topKings);
    }
  }

  getStackCounts() {
    const byPlayerId = {};
    for(const player of this.players) {
      let dropStackCount = 0;
      for(const dropStack of player.dropStacks) {
        dropStackCount += dropStack.children.length-1;
      }
      byPlayerId[player.playerId]={aceStackCount:0, topKings:0, dropStackCount, playerId: player.playerId};
    }

    for(const aceStack of this.aceStackElems) {
      const cards = CardStackElement.getCardListFromStackElem(aceStack);
      const lastCardElem = CardStackDroppable.getTopNonBlankCard(aceStack);
      for(const card of cards) {
        let stat = byPlayerId[card.playerId];
        ++stat.aceStackCount;
      }
      if(lastCardElem) {
        const lastCard = Card.cardElemToCard(lastCardElem);
        if(lastCard && lastCard.num == CardNumbers.KingNumber) {
          let kingStat = byPlayerId[lastCard.player];
          ++kingStat.topKings;
        }
      }
    }
    return byPlayerId;
  }

  updatePlayerRanks() {
    const byPlayerIds = this.getStackCounts();
    const arr=Object.values(byPlayerIds);
    arr.sort((a,b) => {
      const aTotal = a.aceStackCount + a.dropStackCount;
      const bTotal = b.aceStackCount + b.dropStackCount;
      let diff = bTotal - aTotal;
      if(diff===0) {
        diff = b.topKings - a.topKings;
      }
      if(diff===0) {
        const aTime = (a.finishTime - a.startTime);
        const bTime = (b.finishTime - b.startTime);
        diff = bTime - aTime;
      }
      return diff;
    });

    for(let rank = 0; rank < arr.length; ++rank) {
      const obj = arr[rank];
      const player = this.players[obj.playerId]
      let finishStr='';
      if(player.hasFinished) {
        const timeStr = RacingDemonPlayer.mSecsToTimeStr(player.finishTime - player.startTime);
        finishStr = `Took ${timeStr}`;
      }
      $('.player-rank', player.div).html(`Rank #${rank+1} ${finishStr}`);
    }
  }

  addAceStack() {
    const acesStackDiv = this.div.querySelector('.ace-stacks');
    const origAceStack = this.aceStackElems[0];
    const aceStackElem = origAceStack.cloneNode();

    const aceStackNum = this.aceStacksDroppable.length;
    aceStackElem.setAttribute('data-ace-stack',aceStackNum);
    aceStackElem.classList.add(`ace-stack-${aceStackNum}`);
    acesStackDiv.appendChild(aceStackElem);
    this.aceStacksDroppable.push(this.createAceStackDroppable(aceStackElem));
    this.aceStackElems.push(aceStackElem);
  }

  updateDebugRobotMoves() {
    for(const player of this.players) {
      player.updateDebugRobotMoves();
    }
  }

  initTimerCounts() {
    this.timerCounts = this.getLastTimerCounts();
    if(this.timerCounts) {
      const lastMSecsPerMove = TimerCount.totalMSecsPerMove(this.timerCounts);
      if(lastMSecsPerMove) {
        this.robotTimerMSecs = lastMSecsPerMove;
      }
      console.log('lastMSecsPerMove',lastMSecsPerMove, TimerCount.timerCountsToStr(this.timerCounts), this.timerCounts, );
    }
  }

  initGui(div) {
    this.div = div;
    this.aceStackElems = [document.querySelector('.ace-stack')];
    this.aceStacksDroppable = [];
    for(let p = 0; p < this.players.length; ++p) {
      const player = this.players[p];
      player.createGui(div);
      player.startPlayerRobotTimer(this);
    }

    $('.add-player').on('click',() => {
      const cardPlayer = this.addPlayer(this.players.length)
      cardPlayer.createGui(div);
      cardPlayer.startPlayerRobotTimer(this);
      this.updateStackCounts();
      this.updatePlayerRanks();
    });

    this.aceStacksDroppable.push(this.createAceStackDroppable(this.aceStackElems[0]));
    this.initTimerCounts();
//    RacingDemonRobotTurn.robotTimer(this);
    this.updateStackCounts();
    this.updatePlayerRanks();
  }
}


class Lobby {
  constructor(div) {
    this.div = div;
  }
  
  initGui() {
    this.div.querySelector('.start-game')
      .addEventListener('click',() => this.startGame());
  }

  startGame() {
    const playersCount = parseInt(this.div.querySelector('#players-count').value);
    if(playersCount<=0) {
      return false;
    }
    const racingDemon = new RacingDemon(playersCount);
    const playArea=document.querySelector('#play-area');
    this.div.classList.add('hide-area');
    playArea.classList.remove('hide-area');
    racingDemon.initGui(playArea);

window.racingDemon = racingDemon; // TODO:
    return true;
  }
}

$(() => {
  const lobby = new Lobby(document.querySelector('#lobby-area'));
  lobby.initGui();
});
