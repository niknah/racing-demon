export default class TimerCount {
  constructor(name) {
    this.count=0;
    this.mSecs=0;
    this.name = name;
  }

  assign(obj) {
    Object.assign(this,obj);
  }

  addEvent(mSecs) {
    ++this.count;
    this.mSecs+=mSecs;
  }

  mSecsPerMove() {
    if(!this.count) {
      return 6000;
    }
    return this.mSecs / this.count;
  }

  static totalMSecsPerMove(timerCounts) {
    let count = 0;
    let mSecs = 0;
    for(const timerCount of Object.values(timerCounts)) {
      // Don't count the speed of flipping the main card because 
      if(timerCount.name == 'main') {
        continue;
      }
      count += timerCount.count;
      mSecs += timerCount.mSecs;
    }
    return mSecs / count;
  }

  static timerCountsToStr(timerCounts) {
    let str = '';
    for(const timerCount of Object.values(timerCounts)) {
      str += `${timerCount.name} ${timerCount.mSecsPerMove()}\n`;
    }
    return str;
  }

  static parseObjects(objs) {
    const timerCounts = {};
    for(const obj of Object.values(objs)) {
      const timerCount = timerCounts[obj.name]=new TimerCount(obj.name);
      timerCount.assign(obj);
    }
    return timerCounts;
  }
}

