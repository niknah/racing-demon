
import { createNanoEvents } from 'nanoevents';

export default class NetworkClient {
  constructor(gameId) {
    let playerId = localStorage.getItem('playerId');
    if(!playerId) {
      playerId = Math.floor(Math.random()*1000000000);
    }
    this.stepUpto = 1;
    this.playerId = playerId;
    this.onPlayerMoveEvent = createNanoEvents();
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
      const obj = JSON.parse(event.data);
      if(obj.step !== (this.step+1)) {
        // out of sync
        console.error('game out of sync with server');
        return;
      }

      this.step = obj.step;
      this.onPlayerMoveEvent.emit('move', obj);
    };
  }

  onPlayerMove(func) {
    return this.onPlayerMoveEvent.on('move',func);
  }

  sendPlayerMove(obj) {
    obj.step = ++this.step;
    this.webSocket.send(JSON.stringify(obj));
  }
}
