
import { createNanoEvents } from 'nanoevents';

export default class NetworkClient {
  constructor(gameId) {
    let playerId = localStorage.getItem('playerId');
    if(!playerId) {
      playerId = Math.floor(Math.random()*1000000000);
    }
    this.gameId = gameId;
    this.stepUpto = 1;
    this.playerId = playerId;
    this.onPlayerMoveEvent = createNanoEvents();
    this.onPlayerJoinEvent = createNanoEvents();

    this.webSocket = new WebSocket('http://localhost:3333/');
    this.webSocket.onopen = (/* event */) => {
      if(this.webSocket.readState == 1) {
        console.log('websocket opened');
        this.connected = true;
        this.webSocket.send(JSON.stringify({
          playerId: playerId,
          gameId
        }));
      }

    };

    this.webSocket.onmessage = (event) => {
      const m = /^([^:]+):(.*)$/.exec(event.data);
      if(!m) {
        const joinObj = JSON.parse(event.data);
        console.assert(joinObj.type=='join', 'Message is not join: '+event.data);
        this.onPlayerJoinEvent.emit('join', joinObj);
        return;
      }

      const obj = JSON.parse(m[2]);
      if(obj.step !== (this.step+1)) {
        // out of sync
        console.error('game out of sync with server');
        return;
      }

      obj.playerId = m[1];

      this.step = obj.step;
      this.onPlayerMoveEvent.emit('move', obj);
    };
  }

  onPlayerJoin(func) {
    return this.onPlayerJoinEvent.on('join',func);
  }

  onPlayerMove(func) {
    return this.onPlayerMoveEvent.on('move',func);
  }

  sendPlayerMove(obj) {
    obj.step = ++this.step;
    this.webSocket.send(JSON.stringify(obj));
  }

  sendPlayerJoin(obj) {
    const sendObj = {type:'join', gameId: this.gameId};
    Object.assign(sendObj, obj);
    this.webSocket.send(JSON.stringify(sendObj));
  }
}
