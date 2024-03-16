(() => {
  // CardDragDrop.mjs
  var CardStackDroppable = class _CardStackDroppable {
    static blankCard = "EMPTY";
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
    fireOnBeforeDrop(event2) {
      this.$onBeforeDrop.fire(event2);
    }
    dropCard(dragElement) {
      let dropOk = true;
      if (this.options.isDropAccept) {
        dropOk = this.options.isDropAccept(this.stackElem, dragElement);
      }
      if (dropOk) {
        this.fireOnBeforeDrop({ event, dragElement });
        let dragElementNext = null;
        for (let dragElementUpto = dragElement; dragElementUpto; dragElementUpto = dragElementNext) {
          if (cards.getCardCodeFromElement(dragElementUpto) == _CardStackDroppable.blankCard) {
            break;
          }
          dragElementNext = dragElementUpto.nextElementSibling;
          dragElementUpto.setAttribute("data-dropped-target", this.stackElem.id || "true");
          cards.clearCardStyles(dragElementUpto);
          const dragParent = dragElementUpto.parentNode;
          this.stackElem.insertBefore(dragElementUpto, this.blank);
          CardStackDraggable.destroyDraggable(dragElementUpto);
          $(dragParent).trigger("card-dragged-away", { cardElem: dragElementUpto });
          _CardStackDroppable.applyStyles(this.$stack);
          if (this.options.drop)
            this.options.drop(event, dragElementUpto);
        }
      }
    }
    static applyStyles($stack) {
      $(".card", $stack).css("left", "").css("top", "");
      cards.applyStyles($stack);
    }
    static addCard(dropStackElem, playerId, cardCode) {
      const isTopBlankCard = _CardStackDroppable.isTopBlankCard(dropStackElem);
      const newCard = cards.addCardImages($(dropStackElem), cardCode)[0];
      newCard.setAttribute("data-player", playerId);
      if (isTopBlankCard) {
        dropStackElem.insertBefore(newCard, newCard.previousSibling);
        _CardStackDroppable.applyStyles($(dropStackElem));
      }
    }
    static isTopBlankCard(dropStackElem) {
      if (dropStackElem.children.length === 0) {
        return false;
      }
      const elem = dropStackElem.children[dropStackElem.children.length - 1];
      if (cards.getCardCodeFromElement(elem) == _CardStackDroppable.blankCard) {
        return true;
      }
      return false;
    }
    static getTopNonBlankCard(dropStackElem) {
      for (let e = dropStackElem.children.length - 1; e >= 0; --e) {
        const elem = dropStackElem.children[e];
        if (cards.getCardCodeFromElement(elem) != _CardStackDroppable.blankCard) {
          return elem;
        }
      }
      return null;
    }
    getTopNonBlankCard() {
      return _CardStackDroppable.getTopNonBlankCard(this.stackElem);
    }
    dropEvent(event2) {
      const dragElement = event2.originalEvent.target;
      this.dropCard(dragElement);
    }
    init() {
      this.blank = cards.addCardImages(this.$stack, [_CardStackDroppable.blankCard])[0];
      this.blank.classList.add("card-blank");
      const droppableOptions = {
        //      over: (event) => event.originalEvent.target.classList.add('card-over-droppable'),
        //      // Problem: Out does not get called when we move outside quickly
        //      // to outside of body
        //      out: (event) => event.originalEvent.target.classList.remove('card-over-droppable'),
        drop: (event2) => {
          this.dropEvent(event2);
        }
      };
      for (const o in this.options) {
        if (!droppableOptions[o]) {
          droppableOptions[o] = this.options[o];
        }
      }
      this.$stack.on("drop-to-stack", (event2) => this.dropEvent(event2));
      $(this.blank).droppable(droppableOptions);
    }
  };
  var CardStackElement = class {
    static serialize(stackElem) {
      const cards2 = [];
      for (const cardElem of stackElem.children) {
        const obj = { className: cardElem.className };
        for (const attr of cardElem.attributes) {
          if (attr.name.substring(0, 5) == "data-") {
            obj[attr.name] = attr.value;
          }
        }
        cards2.push(obj);
      }
      return cards2;
    }
    static deserialize(stackElem, serializedArr) {
      const codes = [];
      for (const cardObj of serializedArr) {
        codes.push(cardObj["data-card-code"]);
      }
      const cardElems = cards.replaceCardImages($(stackElem), codes);
      for (let c = 0; c < cardElems.length; ++c) {
        const cardElem = cardElems[c];
        const cardObj = serializedArr[c];
        cardElem.className = cardObj.cardElem;
        for (const n in cardObj) {
          if (n.substring(0, 5) == "data-") {
            cardElem.setAttribute(n, cardObj[n]);
          }
        }
      }
    }
    static getCardListFromStackElem(stackElem) {
      const cardList = [];
      for (const cardElem of stackElem.children) {
        const code = cards.getCardCodeFromElement(cardElem);
        if (code == CardStackDroppable.blankCard) {
          continue;
        }
        if (!cardElem.classList.contains("card")) {
          console.warn("Non card in stack", stackElem.className);
          continue;
        }
        const playerId = cardElem.getAttribute("data-player");
        const obj = { playerId, code, cardElem };
        cardList.push(obj);
      }
      return cardList;
    }
  };
  var CardStackAnimations = class _CardStackAnimations {
    static startDropAnimationElements(dragElement, fromStack, destStack) {
      const fromStackOffset = $(fromStack).offset();
      const destStackOffset = $(destStack).offset();
      dragElement.style.left = `${fromStackOffset.left - destStackOffset.left}px`;
      dragElement.style.top = `${fromStackOffset.top - destStackOffset.top}px`;
      _CardStackAnimations.startDropAnimation(dragElement);
    }
    static startDropAnimation(dragElement) {
      if (dragElement.classList.contains("card-animation-started")) {
        return false;
      }
      const left = dragElement.style.left;
      const top = dragElement.style.top;
      dragElement.classList.remove("card-dropped");
      dragElement.classList.add("card-animation-started");
      setTimeout(() => {
        dragElement.style.left = left;
        dragElement.style.top = top;
        dragElement.addEventListener("animationend", () => {
          _CardStackAnimations.clearCardLeftTop(dragElement);
          dragElement.classList.remove("card-animation-started");
          dragElement.classList.remove("card-dropped");
          _CardStackAnimations.clearCardLeftTop(dragElement);
          CardStackDroppable.applyStyles($(dragElement.parentNode));
        });
        dragElement.classList.add("card-dropped");
      }, 10);
    }
    static clearCardLeftTop(cardElem) {
      cardElem.style.removeProperty("top");
      cardElem.style.removeProperty("left");
    }
  };
  var CardStackDraggable = class {
    static redBack = "RED_BACK";
    constructor($stack, options) {
      this.$stack = $stack;
      this.stackElem = $stack.get(0);
      this.options = options || {};
      this.init();
    }
    static destroyDraggable(cardElem) {
      if (cardElem.classList.contains("ui-draggable")) {
        try {
          $(cardElem).draggable("destroy");
        } catch (e) {
          console.error(e);
        }
      }
      cardElem.draggable = false;
    }
    // manual drag, used by robot
    static dragCardToStack(cardElem, destStack) {
      const fromStack = cardElem.parentNode;
      const dropCardEvent = $.Event("drop-card", {
        target: cardElem
      });
      const dropToStackEvent = $.Event("drop-to-stack", {
        originalEvent: {
          target: cardElem
        }
      });
      $(cardElem).trigger(dropCardEvent);
      $(destStack).trigger(dropToStackEvent);
      CardStackAnimations.startDropAnimationElements(cardElem, fromStack, destStack);
    }
    stopDragEvent(event2) {
      const dragElement = event2.target;
      setTimeout(() => {
        const droppedTarget = dragElement.getAttribute("data-dropped-target");
        if (!droppedTarget) {
          CardStackAnimations.clearCardLeftTop(dragElement);
        } else {
          dragElement.removeAttribute("data-dropped-target");
        }
        if (this.options.stop) {
          this.options.stop(dragElement, event2);
        }
      }, 0);
    }
    makeCardDraggable(cardElem) {
      cardElem.removeAttribute("draggable");
      $(cardElem).on("drop-card", (e) => this.stopDragEvent(e));
      $(cardElem).draggable({
        //      start: () => {
        //        cardElem.classList.remove('card-dropped');
        //      },
        stop: (event2) => {
          setTimeout(() => {
            this.stopDragEvent(event2);
          }, 0);
        }
      });
    }
    flipTopCards(playerId, cardCodes) {
      const arr = cards.addCardImages(this.$stack, cardCodes);
      for (const cardElem of arr) {
        cardElem.setAttribute("data-player", playerId);
        cardElem.style.position = "relative";
      }
      const lastChild = this.stackElem.children[this.stackElem.children.length - 1];
      this.makeCardDraggable(lastChild);
      return arr;
    }
    removeBackCard() {
      this.cardBack.remove();
    }
    getTopCard() {
      return this.stackElem.lastElementChild;
    }
    isTopCardBack() {
      return this.getTopCard().classList.contains("card-back");
    }
    init() {
      if (this.options.backCard) {
        this.cardBack = cards.addCardImages(this.$stack, [this.options.backCard])[0];
        this.cardBack.classList.add("card-back");
        this.cardBack.addEventListener("click", () => {
          if (this.options.clickCardBack) {
            this.options.clickCardBack();
          }
        });
      }
    }
  };

  // CardNumbers.mjs
  var CardNumbers = class {
    static AceNumber = 1;
    static KingNumber = 13;
    constructor() {
      this.cardNumbers = [null, "A", 2, 3, 4, 5, 6, 7, 8, 9, 10, "J", "Q", "K"];
      this.cardNumbersRev = {};
      this.cardTypes = ["C", "D", "H", "S"];
      this.cardTypesRev = {};
      for (let c = 1; c < this.cardNumbers.length; ++c) {
        let cardNumber = this.cardNumbers[c];
        this.cardNumbersRev[cardNumber] = c;
      }
      for (let c = 0; c < this.cardTypes.length; ++c) {
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
      return type == "H" || type == "D" ? "red" : "black";
    }
  };
  var cardNumbers = new CardNumbers();

  // Card.mjs
  var Card = class _Card {
    constructor(player, type, num) {
      this.player = player;
      const parsedNum = parseInt(num);
      _Card.assert(parsedNum < cardNumbers.cardNumbers.length, "Invalid card number:" + num);
      _Card.assert(cardNumbers.typeCodeToNumber(type) !== void 0, "Invalid card type:" + type);
      this.type = type;
      this.num = parsedNum;
    }
    static assert(test, mess) {
      if (!test) {
        console.error(mess);
      }
    }
    getColor() {
      return cardNumbers.getTypeColor(this.type);
    }
    static cardElemToCard(elem) {
      _Card.assert(elem.classList.contains("card"));
      return _Card.cardCodeToCard(elem.getAttribute("data-player"), cards.getCardCodeFromElement(elem));
    }
    static cardCodeToCard(playerId, cardCode) {
      return new _Card(
        playerId,
        cardCode.substring(cardCode.length - 1),
        cardNumbers.cardCodeToNumber(cardCode.substring(0, cardCode.length - 1))
      );
    }
    getCardCode() {
      return `${cardNumbers.cardNumberToCode(this.num)}${this.type}`;
    }
  };

  // CardStack.mjs
  var CardStack = class {
    constructor(playerId) {
      this.playerId = playerId;
      this.cards = [];
      this.lastPush = (/* @__PURE__ */ new Date()).getTime();
    }
    shuffle() {
      for (const card of this.cards) {
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
      this.cards = [];
    }
    push(card) {
      this.lastPush = (/* @__PURE__ */ new Date()).getTime();
      this.cards.push(card);
    }
    mSecsSinceLastPush() {
      return (/* @__PURE__ */ new Date()).getTime() - this.lastPush;
    }
    popArray(amount) {
      let arr = [];
      for (let a = 0; a < amount; ++a) {
        const i = this.cards.pop();
        if (i) {
          arr.push(i);
        }
      }
      return arr;
    }
    lastCard() {
      return this.cards[this.cards.length - 1];
    }
    pop() {
      return this.cards.pop();
    }
  };

  // TimerCount.mjs
  var TimerCount = class _TimerCount {
    constructor(name) {
      this.count = 0;
      this.mSecs = 0;
      this.name = name;
    }
    assign(obj) {
      Object.assign(this, obj);
    }
    addEvent(mSecs) {
      ++this.count;
      this.mSecs += mSecs;
    }
    mSecsPerMove() {
      if (!this.count) {
        return 6e3;
      }
      return this.mSecs / this.count;
    }
    static totalMSecsPerMove(timerCounts) {
      let count = 0;
      let mSecs = 0;
      for (const timerCount of Object.values(timerCounts)) {
        if (timerCount.name == "main") {
          continue;
        }
        count += timerCount.count;
        mSecs += timerCount.mSecs;
      }
      return mSecs / count;
    }
    static timerCountsToStr(timerCounts) {
      let str = "";
      for (const timerCount of Object.values(timerCounts)) {
        str += `${timerCount.name} ${timerCount.mSecsPerMove()}
`;
      }
      return str;
    }
    static parseObjects(objs) {
      const timerCounts = {};
      for (const obj of Object.values(objs)) {
        const timerCount = timerCounts[obj.name] = new _TimerCount(obj.name);
        timerCount.assign(obj);
      }
      return timerCounts;
    }
  };

  // RacingDemon.mjs
  var config = {
    robotTest: null,
    debugPlayer: false,
    hintMove: false
  };
  window.config = config;
  var CardStackWeb = class extends CardStack {
    constructor(playerId) {
      super(playerId);
      this.elem = null;
    }
    setElement(elem) {
      this.elem = elem;
    }
    push(card) {
      super.push(card);
      if (this.elem) {
        CardStackDroppable.addCard(this.elem, this.playerId, card.getCardCode());
      }
    }
    popArray(amount) {
      const arr = super.popArray(amount);
      for (let a = arr.length - 1; a >= 0; --a) {
        const topCardElem = CardStackDroppable.getTopNonBlankCard(this.elem);
        topCardElem.remove();
      }
      return arr;
    }
    pop() {
      if (this.cards.length === 0) {
        return null;
      }
      if (this.elem) {
        const topCardElem = CardStackDroppable.getTopNonBlankCard(this.elem);
        topCardElem.remove();
      }
      return super.pop();
    }
  };
  var RacingDemonPlayer = class {
    constructor(playerId) {
      this.playerId = playerId;
      this.cards = new CardStack(playerId);
      this.poppedCards = new CardStack(playerId);
      this.timerCounts = {};
      for (const n of ["main", "ace", "drop"]) {
        this.timerCounts[n] = new TimerCount(n);
      }
      this.lastCardEvent = null;
      this.startTime = (/* @__PURE__ */ new Date()).getTime();
      this.finishTime = null;
      this.robotMoves = {};
      if (config.robotTest !== null) {
        this.randomRobotSpeed = 1;
        this.randomRobotMoveTopToStack = CardNumbers.KingNumber - config.robotTest;
      } else {
        this.randomRobotSpeed = 1 + Math.random() * 1;
        const randomMoveTopToStack = Math.floor(Math.random() * 4);
        if (randomMoveTopToStack >= 0) {
          this.randomRobotMoveTopToStack = CardNumbers.KingNumber - randomMoveTopToStack;
        } else {
          this.randomRobotMoveTopToStack = -1;
        }
      }
      this.$onFinish = $.Callbacks();
      this.hasFinished = false;
    }
    increaseRobotMove(type) {
      const count = this.robotMoves[type];
      if (count === void 0) {
        this.robotMoves[type] = 1;
      } else {
        ++this.robotMoves[type];
      }
    }
    mSecsSinceCardEvent() {
      return (/* @__PURE__ */ new Date()).getTime() - this.lastCardEvent;
    }
    static mSecsToTimeStr(gameMSecs) {
      const mSecs = gameMSecs % 1e3;
      const secs = gameMSecs / 1e3 % 60;
      const mins = gameMSecs / 1e3 / 60;
      function padZero(num, digits) {
        return (Math.floor(num) + "").padStart(digits, "0");
      }
      return `${Math.floor(mins)}:${padZero(secs, 2)}.${padZero(mSecs / 10, 3)}`;
    }
    getRandomTimeout(mSecs) {
      mSecs *= this.randomRobotSpeed;
      const robotTimerMSecs2 = mSecs * 0.65;
      return Math.floor(robotTimerMSecs2 + Math.random() * (mSecs * 0.5));
    }
    onFinish(func) {
      this.$onFinish.add(func);
    }
    fireOnFinish() {
      try {
        this.$onFinish.fire(this);
      } catch (e) {
        console.error(e);
      }
    }
    increaseTimerCount(stackType) {
      const now = (/* @__PURE__ */ new Date()).getTime();
      if (this.lastCardEvent) {
        const timerCount = this.timerCounts[stackType];
        if (timerCount) {
          timerCount.addEvent(now - this.lastCardEvent);
        }
      }
      this.lastCardEvent = now;
    }
    initCards() {
      this.playerStacks = [];
      for (let s = 0; s < 5; ++s) {
        this.playerStacks.push(new CardStackWeb(this.playerId));
      }
      for (const type of cardNumbers.cardTypes) {
        for (let num = 1; num < cardNumbers.cardNumbers.length; ++num) {
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
      const firstCard = this.cards.cards[0];
      this.cards.cards = this.cards.cards.slice(1);
      this.cards.cards.push(firstCard);
    }
  };
  var RacingDemonPlayerWeb = class extends RacingDemonPlayer {
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
    increaseRobotMove(type) {
      super.increaseRobotMove(type);
      if (config.debugPlayer || config.robotTest !== null) {
        $(".debug-move", this.div).html(
          JSON.stringify(this.robotMoves, Object.keys(this.robotMoves).sort(), 4) + "\n" + TimerCount.timerCountsToStr(this.timerCounts)
        );
      }
    }
    //  setCardsElement(elem) {
    //    this.cards.setElement(elem);
    //  }
    createGui(playArea) {
      const div = document.getElementById("player-template").cloneNode(true);
      div.id = `player-area-${this.playerId}`;
      div.classList.add(div.id);
      $(".player-name", div).html(`Player #${this.playerId + 1}`);
      playArea.appendChild(div);
      this.playArea = playArea;
      return this.initGui(div);
    }
    initGui(div) {
      this.div = div;
      this.dropStacks = this.div.querySelectorAll(".drop-stack");
      this.$takeStack = $(".take-stack", this.div);
      this.$takeStack.get(0).setAttribute("data-player", this.playerId);
      this.aceStackCount = div.querySelector(".ace-stack-count");
      this.dropStackCount = div.querySelector(".drop-stack-count");
      this.totalCount = div.querySelector(".total-count");
      this.aceStackKingCount = div.querySelector(".ace-stack-king-count");
      this.mainStackCount = div.querySelector(".main-stack-count");
      this.cardStackDroppables = [];
      this.cardStackDraggables = [];
      this.flipMainStackEvent = () => {
        this.$onFlipMainStack.fire(this);
        this.flipMainStack();
      };
      this.mainStackDraggable = new CardStackDraggable(this.$takeStack, {
        backCard: CardStackDraggable.redBack,
        stop: () => {
          const lastCardElem = CardStackDroppable.getTopNonBlankCard(this.$takeStack.get(0));
          if (lastCardElem && !lastCardElem.classList.contains("ui-draggable")) {
            this.mainStackDraggable.makeCardDraggable(lastCardElem);
            lastCardElem.addEventListener(
              "click",
              this.flipMainStackEvent
            );
          }
          const mainStackCount = this.getMainStackCount();
          if (mainStackCount === 0 && !this.finishTime) {
            this.finishTime = (/* @__PURE__ */ new Date()).getTime();
            this.hasFinished = true;
            this.fireOnFinish();
          }
          this.updateMainStackCount(mainStackCount);
          this.fireOnMainDragStop({ player: this });
        },
        clickCardBack: () => this.flipMainStack()
      });
      this.initDropStacks();
      this.flipMainStack();
    }
    getMainStackCount() {
      return this.poppedCards.length() + this.cards.length() + this.$takeStack.get(0).children.length - 1;
    }
    updateStatCount(countElem, count) {
      countElem.innerHTML = count || 0;
      if (count) {
        countElem.parentNode.classList.remove("no-count");
      } else {
        countElem.parentNode.classList.add("no-count");
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
    fireOnMainDragStop(event2) {
      try {
        this.$onMainDragStop.fire(this, event2);
      } catch (e) {
        console.error(e);
      }
    }
    onAfterDrop(func) {
      this.$onAfterDrop.add(func);
    }
    fireOnAfterDrop(dropStack, dragElement) {
      let stackType = dropStack.getAttribute("data-stack-type");
      this.increaseTimerCount(stackType);
      this.$onAfterDrop.fire(this, { dropStack, dragElement });
    }
    onBeforeDrop(func) {
      this.$onBeforeDrop.add(func);
    }
    fireOnBeforeDrop(dropStack, dragElement) {
      this.$onBeforeDrop.fire(this, { dropStack, dragElement });
    }
    removeCardEvents(cardElement) {
      cardElement.removeEventListener("click", this.flipMainStackEvent);
    }
    flipMainStack() {
      const poppedCardsRev = [];
      while (!this.mainStackDraggable.isTopCardBack()) {
        const nonBlankCard = this.mainStackDraggable.getTopCard();
        if (nonBlankCard) {
          nonBlankCard.remove();
          const cardCode = RacingDemon.getCardCodeFromElement(nonBlankCard);
          const cardToPush = Card.cardCodeToCard(this.playerId, cardCode);
          poppedCardsRev.push(cardToPush);
        } else {
          break;
        }
      }
      poppedCardsRev.reverse();
      for (const poppedCard of poppedCardsRev) {
        this.poppedCards.push(poppedCard);
      }
      if (this.cards.length() === 0) {
        this.poppedCardsToCards();
      }
      let poppedCards = this.cards.popArray(3);
      const poppedCardCodes = poppedCards.map((poppedCard) => poppedCard.getCardCode());
      const poppedCardElems = this.mainStackDraggable.flipTopCards(this.playerId, poppedCardCodes);
      if (this.cards.length() === 0) {
        if (this.poppedCards.length() === 0) {
          this.$takeStack.addClass("no-card-on-stack");
        } else {
          this.$takeStack.addClass("last-card-on-stack");
        }
      } else {
        this.$takeStack.removeClass("no-card-on-stack");
        this.$takeStack.removeClass("last-card-on-stack");
      }
      if (poppedCardElems.length > 0) {
        poppedCardElems[poppedCardElems.length - 1].addEventListener(
          "click",
          this.flipMainStackEvent
        );
      }
      CardStackDroppable.applyStyles(this.$takeStack);
      this.updateMainStackCount(this.getMainStackCount());
      this.increaseTimerCount("main");
    }
    initDropStack(dropStack, stackNum) {
      dropStack.setAttribute("data-drop-stack", stackNum);
      dropStack.setAttribute("data-player", this.playerId);
      const draggable = new CardStackDraggable($(dropStack), {
        stop: () => {
          CardStackDroppable.applyStyles($(dropStack));
        }
      });
      const droppable = new CardStackDroppable($(dropStack), {
        drop: (event2, dragElement) => {
          this.removeCardEvents(dragElement);
          this.addCardToPlayerStack(stackNum, Card.cardCodeToCard(this.playerId, RacingDemon.getCardCodeFromElement(dragElement)));
          setTimeout(() => {
            this.makeStackCardDraggable(stackNum, dragElement);
            CardStackDroppable.applyStyles($(dropStack));
            this.fireOnAfterDrop(dropStack, dragElement);
          }, 0);
        },
        accept: (cardElem) => {
          if (!cardElem || !cardElem.get(0)) {
            return false;
          }
          if (!cardElem.get(0).parentNode) {
            console.error("accept. no parent node", cardElem, cardElem.get(0));
            return false;
          }
          const playerId = cardElem.get(0).parentNode.getAttribute("data-player");
          if (playerId == this.playerId) {
            return true;
          }
          return false;
        },
        isDropAccept: (stack, dragElement) => {
          if (stack.children.length <= 1) {
            return true;
          }
          const dragElementPlayerId = dragElement.parentNode.getAttribute("data-player");
          const stackPlayerId = stack.getAttribute("data-player");
          if (dragElementPlayerId != stackPlayerId) {
            return false;
          }
          const cardCode = RacingDemon.getCardCodeFromElement(dragElement);
          const lastStackElem = CardStackDroppable.getTopNonBlankCard(stack);
          const lastStackCardCode = RacingDemon.getCardCodeFromElement(lastStackElem);
          const lastStackCard = Card.cardCodeToCard(0, lastStackCardCode);
          const lastStackCardColor = lastStackCard.getColor();
          const card = Card.cardCodeToCard(0, cardCode);
          const cardColor = card.getColor();
          if (card.num == lastStackCard.num - 1 && cardColor != lastStackCardColor && stack.getAttribute("data-drop-stack") != dragElement.parentNode.getAttribute("data-drop-stack")) {
            return true;
          }
          return false;
        }
      });
      droppable.onBeforeDrop((event2) => {
        this.fireOnBeforeDrop(dropStack, event2.dragElement);
      });
      return { draggable, droppable };
    }
    makeStackCardDraggable(stackNumber, cardElem) {
      this.cardStackDraggables[stackNumber].makeCardDraggable(cardElem);
    }
    initDropStacks() {
      let stackNum = 0;
      for (const dropStack of this.dropStacks) {
        let { draggable, droppable } = this.initDropStack(dropStack, stackNum);
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
  };
  var RacingDemonRobotTurn = class _RacingDemonRobotTurn {
    constructor(racingDemon) {
      this.racingDemon = racingDemon;
      this.lastAceStackCards = this.getLastAceStackCard();
      this.player = null;
      this.minMSecsBetweenDrop = 1500;
      this.checkTooQuick = true;
    }
    getLastAceStackCard() {
      const lastCards = [];
      let upto = 0;
      for (const aceStack of this.racingDemon.aceStackElems) {
        const lastCardElem = CardStackDroppable.getTopNonBlankCard(aceStack);
        lastCards.push({
          elem: lastCardElem,
          aceStack,
          aceStackDroppable: this.racingDemon.aceStacksDroppable[upto],
          card: lastCardElem ? Card.cardElemToCard(lastCardElem) : null
        });
        ++upto;
      }
      return lastCards;
    }
    getFirstLastDropStacks() {
      const firstLast = [];
      for (const dropStack of this.player.dropStacks) {
        const cards2 = CardStackElement.getCardListFromStackElem(dropStack);
        if (cards2.length === 0) {
          firstLast.push({
            dropStack,
            cards: cards2
          });
          continue;
        }
        const firstCard = cards2[0];
        const lastCard = cards2[cards2.length - 1];
        firstLast.push({
          dropStack,
          cards: cards2,
          firstElem: firstCard.cardElem,
          lastElem: lastCard.cardElem,
          first: Card.cardCodeToCard(firstCard.playerId, firstCard.code),
          last: Card.cardCodeToCard(lastCard.playerId, lastCard.code)
        });
      }
      return firstLast;
    }
    findPreFirstToAceDropStackMove() {
      if (!this.firstEmptyDropStack) {
        return null;
      }
      for (const from of this.firstLast) {
        if (!from.first || from.cards.length < 2) {
          continue;
        }
        if (this.findCardToAceStackMove(from.first, from.firstElem, false)) {
          return {
            type: "PreFirstToAceDropStack",
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
      for (const from of this.firstLast) {
        let toUpto = 0;
        const fromCard = from.first;
        for (const to of this.firstLast) {
          if (fromCard && to.last && toUpto != fromUpto && this.canAddCardToDropStack(fromCard, to.last)) {
            return {
              type: "InterDropStack",
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
      if (config.robotTest !== null || !this.checkTooQuick) {
        return false;
      }
      const mSecsSinceLastDrop = (/* @__PURE__ */ new Date()).getTime() - droppable.lastCardDrop;
      if (lastCard && lastCard.playerId != playerId && mSecsSinceLastDrop < this.minMSecsBetweenDrop) {
        return true;
      }
      return false;
    }
    canAddCardToDropStack(card, lastCard) {
      return lastCard.num - 1 == card.num && lastCard.getColor() != card.getColor();
    }
    findMainStackToDropMove() {
      if (!this.mainCard) {
        return null;
      }
      let type = "MainToDropStack";
      let moveLastCards = false;
      const remainingMainCards = this.player.getMainStackCount();
      let waitMSecs = null;
      if (remainingMainCards <= this.firstLast.length) {
        if (this.emptyDropStacks >= remainingMainCards) {
          moveLastCards = true;
          type = "LastMainToDropStack";
          waitMSecs = 500;
        }
      }
      for (const fl of this.firstLast) {
        let moveOk = false;
        if (!fl.first) {
          if (this.firstEmptyDropStack !== null) {
            for (const fl2 of this.firstLast) {
              if (fl2.first && this.canAddCardToDropStack(fl2.first, this.mainCard)) {
                type = "PreInterMoveMainToDropStack";
                waitMSecs = 500;
                moveOk = true;
                break;
              }
            }
          }
          if (moveOk) {
          } else if (moveLastCards || // have more than one empty drop stack
          this.emptyDropStacks > 1 && this.mainCard.num != CardNumbers.KingNumber && this.mainCard.num != 2) {
            moveOk = true;
          } else {
            continue;
          }
        } else if (this.canAddCardToDropStack(this.mainCard, fl.last)) {
          moveOk = true;
        }
        if (moveOk) {
          const move = {
            type,
            fromCard: this.mainCardElem,
            toStack: fl.dropStack
          };
          if (waitMSecs) {
            move.waitMSecs = waitMSecs;
          }
          return move;
        }
      }
      return null;
    }
    findMainToAceStackMove() {
      if (!this.mainCard) {
        return null;
      }
      return this.findCardToAceStackMove(this.mainCard, this.mainCardElem, true);
    }
    findCardToAceStackMove(card, cardElem, checkTooQuick) {
      let aceStackUpto = 0;
      for (const lastAceStack of this.lastAceStackCards) {
        try {
          const droppable = this.racingDemon.aceStacksDroppable[aceStackUpto];
          if (checkTooQuick && this.isMoveToStackTooQuick(this.player.playerId, droppable, lastAceStack.card)) {
            continue;
          }
          if (!lastAceStack.card) {
            if (card.num == CardNumbers.AceNumber) {
              return {
                type: "MainToEmptyAceStack",
                fromCard: cardElem,
                toStack: lastAceStack.aceStack
              };
            }
            continue;
          }
          if (lastAceStack.card.num + 1 == card.num && lastAceStack.card.type == card.type) {
            return {
              type: "MainToAceStack",
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
      for (const fl of this.firstLast) {
        if (!fl.last) {
          continue;
        }
        const move = this.findCardToAceStackMove(fl.last, fl.lastElem, true);
        if (move) {
          move.type = "DropStackToAceStack";
          return move;
        }
      }
      return null;
    }
    setPlayer(player) {
      this.player = player;
      this.takeStack = player.$takeStack.get(0);
      if (!player.mainStackDraggable.isTopCardBack()) {
        this.mainCardElem = player.mainStackDraggable.getTopCard();
        if (this.mainCardElem) {
          this.mainCard = Card.cardElemToCard(this.mainCardElem);
        }
      } else {
        this.mainCardElem = this.mainCard = null;
      }
      this.firstLast = this.getFirstLastDropStacks();
      this.firstEmptyDropStack = null;
      this.emptyDropStacks = 0;
      for (const fl of this.firstLast) {
        if (!fl.first) {
          this.firstEmptyDropStack = fl.dropStack;
          ++this.emptyDropStacks;
        }
      }
    }
    robotFindNextStep() {
      const dropToAceMove = this.findDropStackToAceStackMove();
      if (dropToAceMove) {
        return dropToAceMove;
      }
      const stackMove = this.findInterDropStackMove();
      if (stackMove) {
        return stackMove;
      }
      const mainStackMove = this.findMainStackToDropMove();
      if (mainStackMove) {
        return mainStackMove;
      }
      const firstToAceDropStackMove = this.findPreFirstToAceDropStackMove();
      if (firstToAceDropStackMove) {
        return firstToAceDropStackMove;
      }
      const aceStackMove = this.findMainToAceStackMove();
      if (aceStackMove) {
        return aceStackMove;
      }
    }
    getWaitFromMove(move) {
      const player = this.player;
      const racingDemon = this.racingDemon;
      let randomTimeout = null;
      if (move) {
        if (move.waitMSecs) {
          randomTimeout = player.getRandomTimeout(move.waitMSecs);
        } else if (/DropStack$/.exec(move.name)) {
          randomTimeout = player.getRandomTimeout(racingDemon.timerCounts.drop.mSecsPerMove());
        } else if (/AceStack$/.exec(move.name)) {
          randomTimeout = player.getRandomTimeout(racingDemon.timerCounts.ace.mSecsPerMove());
        }
      }
      if (!randomTimeout && racingDemon.timerCounts) {
        const mainMSecsPerMove = racingDemon.timerCounts.main.mSecsPerMove();
        if (mainMSecsPerMove < 500) {
          randomTimeout = player.getRandomTimeout(racingDemon.robotTimerMSecs);
        } else {
          randomTimeout = player.getRandomTimeout(mainMSecsPerMove);
        }
      } else {
        randomTimeout = 6e3;
      }
      return randomTimeout;
    }
    robotDoNextStep() {
      const move = this.robotFindNextStep();
      if (move) {
        console.log("playerMove", this.player.playerId, move);
        CardStackDraggable.dragCardToStack(move.fromCard, move.toStack);
      } else {
        this.player.flipMainStack();
      }
      this.player.increaseRobotMove(move ? move.type : "FlipMainStack");
      return move;
    }
    static getNextMove(racingDemon, player) {
      const racingDemonRobotTurn = new _RacingDemonRobotTurn(racingDemon);
      racingDemonRobotTurn.setPlayer(player);
      racingDemonRobotTurn.setCheckTooQuick(false);
      return racingDemonRobotTurn.robotFindNextStep();
    }
    static doPlayerTurn(racingDemon, player) {
      if (racingDemon.gameFinished || player.hasFinished) {
        return null;
      }
      const racingDemonRobotTurn = new _RacingDemonRobotTurn(racingDemon);
      racingDemonRobotTurn.setPlayer(player);
      const move = racingDemonRobotTurn.robotFindNextStep();
      let randomTimeout = racingDemonRobotTurn.getWaitFromMove(move);
      if (config.robotTest !== null) {
        randomTimeout = 100;
      }
      player.robotTimeoutId = setTimeout(
        () => {
          try {
            const racingDemonRobotTurn2 = new _RacingDemonRobotTurn(racingDemon);
            racingDemonRobotTurn2.setPlayer(player);
            racingDemonRobotTurn2.robotDoNextStep();
          } finally {
            _RacingDemonRobotTurn.doPlayerTurn(racingDemon, player);
          }
        },
        randomTimeout
      );
    }
    static startPlayerTimer(racingDemon, player) {
      if (config.robotTest === null && racingDemon.playerId == player.playerId) {
        return null;
      }
      if (player.robotTimeoutId) {
        return null;
      }
      let firstTimeout;
      if (config.robotTest !== null) {
        firstTimeout = 100;
      } else {
        firstTimeout = player.getRandomTimeout(racingDemon.robotTimerMSecs);
      }
      player.robotTimeoutId = setTimeout(() => _RacingDemonRobotTurn.doPlayerTurn(racingDemon, player), firstTimeout);
    }
  };
  var RacingDemon = class _RacingDemon {
    constructor(playersCount) {
      this.players = [];
      this.robotPlayers = [];
      this.playerId = 0;
      this.robotTimerMSecs = 1e4;
      this.gameFinished = false;
      this.gameStartTime = (/* @__PURE__ */ new Date()).getTime();
      if (!playersCount) {
        playersCount = 2;
      }
      for (let p = 0; p < playersCount; ++p) {
        const player = this.addPlayer(p);
        if (p == this.playerId) {
          player.randomRobotMoveTopToStack = -1;
        }
      }
    }
    debugNextMove(player, dragElement) {
      if (!config.hintMove) {
        return;
      }
      const $nextMove = $(".next-move", this.div);
      const r = this.getHintNextMove(player, dragElement);
      if (r.status == "ok") {
        $nextMove.addClass("next-move-ok");
      } else {
        $nextMove.removeClass("next-move-ok");
      }
      $nextMove.html(`${r.status}: ${r.message}`);
    }
    getHintNextMove(player, dragElement) {
      const move = RacingDemonRobotTurn.getNextMove(this, player);
      let status = "ok";
      let message = "";
      if (move) {
        const cardCode = _RacingDemon.getCardCodeFromElement(move.fromCard);
        if (dragElement) {
          const draggedCardCode = _RacingDemon.getCardCodeFromElement(dragElement);
          if (draggedCardCode != cardCode) {
            status = "not same";
          }
        } else {
          status = "not same";
        }
        const stackType = move.toStack.getAttribute("data-stack-type");
        let stackName = "";
        if (stackType == "ace") {
          stackName = `Shared stack #${parseInt(move.toStack.getAttribute("data-ace-stack")) + 1}`;
        } else {
          stackName = `Personal stack #${parseInt(move.toStack.getAttribute("data-drop-stack")) + 1}`;
        }
        message = `${cardCode} -> ${stackName} (${move.type})`;
      } else {
        status = dragElement === null ? "ok" : "not same";
        message = `flip main stack`;
      }
      return { status, message };
    }
    onPlayerBeforeDrop(player, event2) {
      if (this.playerId == player.playerId) {
        this.debugNextMove(player, event2.dragElement);
      }
    }
    onPlayerFlipMainStack(player) {
      if (this.playerId == player.playerId) {
        this.debugNextMove(player, null);
      }
    }
    addPlayer(playerId) {
      const cardPlayer = new RacingDemonPlayerWeb(playerId);
      cardPlayer.onFinish((player) => this.onPlayerFinish(player));
      cardPlayer.onBeforeDrop((player, event2) => this.onPlayerBeforeDrop(player, event2));
      cardPlayer.onFlipMainStack((player, event2) => this.onPlayerFlipMainStack(player, event2));
      this.players[playerId] = cardPlayer;
      cardPlayer.initCards();
      RacingDemonRobotTurn.startPlayerTimer(this, cardPlayer);
      return cardPlayer;
    }
    hasPlayerWon() {
      for (const player of this.players) {
        if (player.hasFinished) {
          return player;
        }
      }
      return null;
    }
    saveTimerCounts(playerId) {
      const thisPlayer = this.players[playerId];
      if (thisPlayer) {
        let hasNoCount = false;
        if (thisPlayer.mSecsSinceCardEvent() >= 6e4) {
          return false;
        }
        console.log("save timer counts, average mSecs", thisPlayer.mSecsSinceCardEvent(), TimerCount.timerCountsToStr(thisPlayer.timerCounts));
        for (const timerCount of Object.values(thisPlayer.timerCounts)) {
          if (!timerCount.count) {
            hasNoCount = true;
          }
        }
        if (!hasNoCount) {
          localStorage.setItem("lastTimerCounts", JSON.stringify(thisPlayer.timerCounts));
        }
      }
      return true;
    }
    onPlayerFinish(player) {
      const wonResult = this.hasPlayerWon() ? "finished" : "won";
      if (config.robotTest === null) {
        this.saveTimerCounts(this.playerId);
      }
      const gameMSecs = (/* @__PURE__ */ new Date()).getTime() - this.gameStartTime;
      const timeStr = RacingDemonPlayer.mSecsToTimeStr(gameMSecs);
      this.gameFinished = true;
      this.updatePlayerRanks();
      if (config.robotTest !== null || window.confirm(`Player #${player.playerId + 1} has ${wonResult}
Time taken: ${timeStr}
Continue playing?`)) {
        this.gameFinished = false;
      }
    }
    getLastTimerCounts() {
      const jsonStr = localStorage.getItem("lastTimerCounts");
      if (jsonStr) {
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
      const droppable = new CardStackDroppable($(aceStack), {
        drop: (event2, dragElement) => {
          droppable.lastCardDrop = (/* @__PURE__ */ new Date()).getTime();
          setTimeout(() => {
            CardStackDroppable.applyStyles($(aceStack));
            this.updateStackCounts();
            this.updatePlayerRanks();
            const playerId = dragElement.getAttribute("data-player");
            this.players[playerId].fireOnAfterDrop(aceStack, dragElement);
          }, 0);
        },
        isDropAccept: (stack, dragElement) => {
          const topCardElem = droppable.getTopNonBlankCard();
          const draggedCardCode = _RacingDemon.getCardCodeFromElement(dragElement);
          if (dragElement.parentNode.classList.contains("drop-stack")) {
          } else if (!dragElement.parentNode.classList.contains("take-stack")) {
            return false;
          }
          const card = Card.cardCodeToCard(this.playerId, draggedCardCode);
          let r = false;
          if (!topCardElem) {
            if (card.num == CardNumbers.AceNumber) {
              this.addAceStack();
              r = true;
            }
          } else {
            const topCardCode = _RacingDemon.getCardCodeFromElement(topCardElem);
            const playerId = topCardElem.parentNode.getAttribute("data-player");
            const topCard = Card.cardCodeToCard(playerId, topCardCode);
            if (topCard.num + 1 == card.num && topCard.type == card.type) {
              r = true;
            }
            if (r === true && topCard.num == CardNumbers.KingNumber) {
              aceStack.classList.add("stack-full");
            }
          }
          if (r === true) {
            const playerId = dragElement.parentNode.getAttribute("data-player");
            this.players[playerId].removeCardEvents(dragElement);
          }
          return r;
        }
      });
      droppable.onBeforeDrop((event2) => {
        const playerId = event2.dragElement.getAttribute("data-player");
        this.players[playerId].fireOnBeforeDrop(aceStack, event2.dragElement);
      });
      return droppable;
    }
    updateStackCounts() {
      const byPlayerIds = this.getStackCounts();
      for (const playerId in byPlayerIds) {
        const player = this.players[playerId];
        const stat = byPlayerIds[playerId];
        player.updateAceStackCount(stat.aceStackCount);
        player.updateDropStackCount(stat.dropStackCount);
        player.updateAceStackKingCount(stat.topKings);
      }
    }
    getStackCounts() {
      const byPlayerId = {};
      for (const player of this.players) {
        let dropStackCount = 0;
        for (const dropStack of player.dropStacks) {
          dropStackCount += dropStack.children.length - 1;
        }
        byPlayerId[player.playerId] = { aceStackCount: 0, topKings: 0, dropStackCount, playerId: player.playerId };
      }
      for (const aceStack of this.aceStackElems) {
        const cards2 = CardStackElement.getCardListFromStackElem(aceStack);
        const lastCardElem = CardStackDroppable.getTopNonBlankCard(aceStack);
        for (const card of cards2) {
          let stat = byPlayerId[card.playerId];
          ++stat.aceStackCount;
        }
        if (lastCardElem) {
          const lastCard = Card.cardElemToCard(lastCardElem);
          if (lastCard && lastCard.num == CardNumbers.KingNumber) {
            let kingStat = byPlayerId[lastCard.player];
            ++kingStat.topKings;
          }
        }
      }
      return byPlayerId;
    }
    updatePlayerRanks() {
      const byPlayerIds = this.getStackCounts();
      const arr = Object.values(byPlayerIds);
      arr.sort((a, b) => {
        const aTotal = a.aceStackCount + a.dropStackCount;
        const bTotal = b.aceStackCount + b.dropStackCount;
        let diff = bTotal - aTotal;
        if (diff === 0) {
          diff = b.topKings - a.topKings;
        }
        if (diff === 0) {
          const aTime = a.finishTime - a.startTime;
          const bTime = b.finishTime - b.startTime;
          diff = bTime - aTime;
        }
        return diff;
      });
      for (let rank = 0; rank < arr.length; ++rank) {
        const obj = arr[rank];
        const player = this.players[obj.playerId];
        let finishStr = "";
        if (player.hasFinished) {
          const timeStr = RacingDemonPlayer.mSecsToTimeStr(player.finishTime - player.startTime);
          finishStr = `Took ${timeStr}`;
        }
        $(".player-rank", player.div).html(`Rank #${rank + 1} ${finishStr}`);
      }
    }
    addAceStack() {
      const acesStackDiv = this.div.querySelector(".ace-stacks");
      const origAceStack = this.aceStackElems[0];
      const aceStackElem = origAceStack.cloneNode();
      const aceStackNum = this.aceStacksDroppable.length;
      aceStackElem.setAttribute("data-ace-stack", aceStackNum);
      aceStackElem.classList.add(`ace-stack-${aceStackNum}`);
      acesStackDiv.appendChild(aceStackElem);
      this.aceStacksDroppable.push(this.createAceStackDroppable(aceStackElem));
      this.aceStackElems.push(aceStackElem);
    }
    initTimerCounts() {
      this.timerCounts = this.getLastTimerCounts();
      if (this.timerCounts) {
        const lastMSecsPerMove = TimerCount.totalMSecsPerMove(this.timerCounts);
        if (lastMSecsPerMove) {
          this.robotTimerMSecs = lastMSecsPerMove;
        }
        console.log("lastMSecsPerMove", lastMSecsPerMove, TimerCount.timerCountsToStr(this.timerCounts), this.timerCounts);
      }
    }
    initGui(div) {
      this.div = div;
      this.aceStackElems = [document.querySelector(".ace-stack")];
      this.aceStacksDroppable = [];
      for (let p = 0; p < this.players.length; ++p) {
        const player = this.players[p];
        player.createGui(div);
      }
      $(".add-player").on("click", () => {
        const cardPlayer = this.addPlayer(this.players.length);
        cardPlayer.createGui(div);
        this.updateStackCounts();
        this.updatePlayerRanks();
      });
      this.aceStacksDroppable.push(this.createAceStackDroppable(this.aceStackElems[0]));
      this.initTimerCounts();
      this.updateStackCounts();
      this.updatePlayerRanks();
    }
  };
  var Lobby = class {
    constructor(div) {
      this.div = div;
    }
    initGui() {
      this.div.querySelector(".start-game").addEventListener("click", () => this.startGame());
    }
    startGame() {
      const playersCount = parseInt(this.div.querySelector("#players-count").value);
      if (playersCount <= 0) {
        return false;
      }
      const racingDemon = new RacingDemon(playersCount);
      const playArea = document.querySelector("#play-area");
      this.div.classList.add("hide-area");
      playArea.classList.remove("hide-area");
      racingDemon.initGui(playArea);
      window.racingDemon = racingDemon;
      return true;
    }
  };
  $(() => {
    const lobby = new Lobby(document.querySelector("#lobby-area"));
    lobby.initGui();
  });
})();
