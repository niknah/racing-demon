/* global cards */

/* eslint-disable-next-line no-unused-vars */
export class CardStackDroppable {
  static blankCard = 'EMPTY';

  constructor($stack, options) {
    this.$stack = $stack;
    this.stackElem = this.$stack.get(0);
    this.options = options || {};
    this.$onBeforeDrop = $.Callbacks();
    this.init();
  }

  onBeforeDrop(func) {
    this.$onBeforeDrop.add(func);
  }

  fireOnBeforeDrop(event) {
    this.$onBeforeDrop.fire(event);
  }

  dropCard(dragElement) {
    let dropOk = true;
    if(this.options.isDropAccept) {
      dropOk = this.options.isDropAccept(this.stackElem, dragElement);
    }
//    const fromStack = dragElement.parentNode;
    if(dropOk) {
      this.fireOnBeforeDrop({event, dragElement});
      let dragElementNext=null;
      // Move everything before the blank card
      for( let dragElementUpto = dragElement; dragElementUpto; dragElementUpto = dragElementNext) {
        if(cards.getCardCodeFromElement(dragElementUpto)==CardStackDroppable.blankCard) {
          break;
        }
        dragElementNext=dragElementUpto.nextElementSibling;
        dragElementUpto.setAttribute('data-dropped-target',this.stackElem.id || 'true');
        cards.clearCardStyles(dragElementUpto);
        const dragParent = dragElementUpto.parentNode;
        this.stackElem.insertBefore(dragElementUpto, this.blank);

        CardStackDraggable.destroyDraggable(dragElementUpto);
        $(dragParent).trigger('card-dragged-away',{cardElem:dragElementUpto});
        CardStackDroppable.applyStyles(this.$stack);

        if(this.options.drop)
          this.options.drop(event, dragElementUpto);
      }
    }
  }

  static applyStyles($stack) {
    // remove left / top leftover from card draggable
    $('.card',$stack).css('left','').css('top','');
    cards.applyStyles($stack);
  }

  static addCard(dropStackElem, playerId, cardCode) {
    const isTopBlankCard = CardStackDroppable.isTopBlankCard(dropStackElem);
    const newCard = cards.addCardImages($(dropStackElem), cardCode)[0];
//    const newCard = dropStackElem.lastChild;
    newCard.setAttribute('data-player',playerId);
    if(isTopBlankCard) {
      dropStackElem.insertBefore(newCard, newCard.previousSibling);
      CardStackDroppable.applyStyles($(dropStackElem));
    }
  }


  static isTopBlankCard(dropStackElem) {
    if(dropStackElem.children.length===0) {
      return false;
    }
    const elem = dropStackElem.children[dropStackElem.children.length-1];
    if(cards.getCardCodeFromElement(elem)==CardStackDroppable.blankCard) {
      return true;
    }
    return false;
  }

  static getTopNonBlankCard(dropStackElem) {
    for(let e = dropStackElem.children.length-1; e>=0; --e) {
      const elem = dropStackElem.children[e];
      if(cards.getCardCodeFromElement(elem)!=CardStackDroppable.blankCard) {
        return elem;
      }
    }
    return null;
  }

  getTopNonBlankCard() {
    return CardStackDroppable.getTopNonBlankCard(this.stackElem);
  }

  dropEvent(event) {
    const dragElement=event.originalEvent.target;
    this.dropCard(dragElement);
  }

  init() {
    this.blank = cards.addCardImages(this.$stack, [CardStackDroppable.blankCard])[0];
//    this.blank = this.stackElem.lastElementChild;
    this.blank.classList.add('card-blank');
    const droppableOptions = {
//      over: (event) => event.originalEvent.target.classList.add('card-over-droppable'),
//      // Problem: Out does not get called when we move outside quickly
//      // to outside of body
//      out: (event) => event.originalEvent.target.classList.remove('card-over-droppable'),
      drop: ( event /*, ui */) => {
        this.dropEvent(event);
      }
    };
    for(const o in this.options) {
      if(!droppableOptions[o]) {
       droppableOptions[o] = this.options[o];
      }
    }
    this.$stack.on('drop-to-stack',(event) => this.dropEvent(event))
    $(this.blank)
      .droppable(droppableOptions);
  }
}

/* eslint-disable-next-line no-unused-vars */
export class CardStackElement {
  static serialize(stackElem) {
    const cards=[];
    for(const cardElem of stackElem.children) {
      const obj={className:cardElem.className};
      for (const attr of cardElem.attributes) {
        if(attr.name.substring(0,5)=='data-') {
          obj[attr.name]=attr.value;
        }
      }
      cards.push(obj);
    }
    return cards;
  }

  static deserialize(stackElem, serializedArr) {
    const codes = [];
    for(const cardObj of serializedArr) {
      codes.push(cardObj['data-card-code']);
    }
    const cardElems = cards.replaceCardImages($(stackElem), codes);
    for(let c = 0; c < cardElems.length; ++c) {
      const cardElem = cardElems[c];
      const cardObj = serializedArr[c];
      cardElem.className = cardObj.cardElem;
      for(const n in cardObj) {
        if(n.substring(0,5)=='data-') {
          cardElem.setAttribute(n, cardObj[n]);
        }
      }
    }
  }

  static getCardListFromStackElem(stackElem) {
    const cardList = [];
    for(const cardElem of stackElem.children) {
      const code=cards.getCardCodeFromElement(cardElem);
      if(code==CardStackDroppable.blankCard) {
        continue;
      }
      if(!cardElem.classList.contains('card')) {
        console.warn('Non card in stack',stackElem.className);
        continue;
      }

      const playerId = cardElem.getAttribute('data-player');

      const obj = {playerId,code,cardElem};
      cardList.push(obj);
    }
    return cardList;
  }
}

export class CardStackAnimations {
  static startDropAnimationElements(dragElement, fromStack, destStack) {
    const fromStackOffset = $(fromStack).offset();
    const destStackOffset = $(destStack).offset();
    dragElement.style.left = `${fromStackOffset.left-destStackOffset.left}px`;
    dragElement.style.top = `${fromStackOffset.top-destStackOffset.top}px`;
    CardStackAnimations.startDropAnimation(dragElement);
  }

  static startDropAnimation(dragElement) {
    // .card-animation-started to make sure we don't run this twice
    if(dragElement.classList.contains('card-animation-started')) {
      return false;
    }
    const left = dragElement.style.left;
    const top = dragElement.style.top;
    dragElement.classList.remove('card-dropped');
    dragElement.classList.add('card-animation-started');
    setTimeout(() => {
      dragElement.style.left = left;
      dragElement.style.top = top;
      dragElement.addEventListener('animationend',() => {
        CardStackAnimations.clearCardLeftTop(dragElement);
        dragElement.classList.remove('card-animation-started');
        dragElement.classList.remove('card-dropped');
        CardStackAnimations.clearCardLeftTop(dragElement);
        CardStackDroppable.applyStyles($(dragElement.parentNode));
      });
      dragElement.classList.add('card-dropped');
    },10);
  }

  static clearCardLeftTop(cardElem) {
    cardElem.style.removeProperty('top');
    cardElem.style.removeProperty('left');
  }

}

export class CardStackDraggable {
  static redBack = 'RED_BACK';

  constructor($stack, options) {
    this.$stack = $stack;
    this.stackElem = $stack.get(0);
    this.options = options || {};
    this.init();
  }

  static destroyDraggable(cardElem) {
    if(cardElem.classList.contains('ui-draggable')) {
      try {
        $(cardElem).draggable('destroy');
      } catch(e) {
        // if we call it twice then there is an error
        console.error(e);
      }
    }
    cardElem.draggable=false;
  }

  // manual drag, used by robot
  static dragCardToStack(cardElem, destStack) {
    const fromStack = cardElem.parentNode;
    const dropCardEvent = $.Event('drop-card', {
      target: cardElem
    });
    const dropToStackEvent = $.Event('drop-to-stack', {
      originalEvent: {
        target: cardElem
      }
    });
    $(cardElem).trigger(dropCardEvent);
    $(destStack).trigger(dropToStackEvent);
    CardStackAnimations.startDropAnimationElements(cardElem, fromStack, destStack );
  }


  stopDragEvent(event) {
    const dragElement=event.target;
    setTimeout(() => {
      const droppedTarget=dragElement.getAttribute('data-dropped-target');
      if(!droppedTarget) {
        // Did not drop on a droppable
//        CardStackAnimations.startDropAnimation(dragElement);
        CardStackAnimations.clearCardLeftTop(dragElement);
      } else {
        dragElement.removeAttribute('data-dropped-target');
      }
      if(this.options.stop) {
        this.options.stop(dragElement, event);
      }
    },0);
  }

  makeCardDraggable(cardElem) {
    cardElem.removeAttribute('draggable');
    $(cardElem).on('drop-card',(e) => this.stopDragEvent(e));
    $(cardElem).draggable({
//      start: () => {
//        cardElem.classList.remove('card-dropped');
//      },
      stop: (event /* , ui */) => {
        // timeout to let card-over-droppable set from another event
        setTimeout(() => {
          this.stopDragEvent(event);
        },0);
      }
    });
  }

  flipTopCards(playerId, cardCodes) {
    const arr = cards.addCardImages(this.$stack, cardCodes);
//    const arr = [];
//    for(let i = this.stackElem.children.length-cardCodes.length-1; i < this.stackElem.children.length; ++i) {
//      const cardElem = this.stackElem.children[i];
    for(const cardElem of arr) {
      cardElem.setAttribute('data-player',playerId);
      // This has to be set because draggable makes the card position relative
      //   and we only make the last card draggable
      cardElem.style.position='relative';
//      arr.push(cardElem);
    }
    if(!this.isTopCardBack()) {
      const lastChild = this.getTopCard(); //this.stackElem.children[this.stackElem.children.length-1]
      this.makeCardDraggable(lastChild);
    }
    return arr;
  }

  removeBackCard() {
    this.cardBack.remove();
  }

  getTopCard() {
    return this.stackElem.lastElementChild;
  }

  isTopCardBack() {
    return this.getTopCard().classList.contains('card-back');
  }

  init() {
    if(this.options.backCard) {
//      this.cardBack = this.stackElem.lastElementChild;
      this.cardBack = cards.addCardImages(this.$stack, [this.options.backCard])[0];
      this.cardBack.classList.add('card-back');
      this.cardBack.addEventListener('click',() => {
        if(this.options.clickCardBack) {
          this.options.clickCardBack();
        }
      });
    }
  }
}

