package main

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"strings"

	"github.com/gorilla/websocket"
	"github.com/redis/go-redis/v9"
)

func getRoot(w http.ResponseWriter, r *http.Request) {
	fmt.Printf("got / request\n")
	io.WriteString(w, "This is my website!\n")
}

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
}

type PlayerConnection struct {
	WebsocketsConn *websocket.Conn
	PlayerId       string
	GameId         string
}

var rdb *redis.Client = nil
var playerConnections map[string]PlayerConnection
var contextBackground = context.Background()

type Move struct {
	FromCard string `json:"fromCard"`
	ToStack  string `json:"toStack"`
}

type Login struct {
	PlayerId string `json:"playerId"`
	GameId   string `json:"gameId"`
}

func handler(w http.ResponseWriter, r *http.Request) {
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Println(err)
		return
	}

	log.Printf("handler")

	var ok struct {
		Ok bool `json:"ok"`
	}
	ok.Ok = true

	if err := conn.WriteJSON(&ok); err != nil {
		log.Println("write", err)
	}

	var login Login
	hasLogin := false
	var pubsub *redis.PubSub = nil

	defer conn.Close()
	for {
		_, message, err := conn.ReadMessage()
		if err != nil {
			log.Println("read:", err)
			break
		}

		//            var move Move

		if hasLogin == false {
			json.Unmarshal([]byte(message), &login)
			if err := conn.WriteJSON(&ok); err != nil {
				log.Println("write", err)
			}
			if err != nil {
				log.Println("write:", err)
				break
			}

			pubsub = rdb.Subscribe(contextBackground, login.GameId)
			defer pubsub.Close()
			go doSubscribe(login.GameId, pubsub)

			playerConnection := PlayerConnection{
				WebsocketsConn: conn,
				PlayerId:       login.PlayerId,
				GameId:         login.GameId,
			}
			playerConnections[login.PlayerId] = playerConnection
			hasLogin = true
		} else {
			//            log.Printf("recv: %s, type: %s, %s", message, move.FromCard, move.ToStack)
			//            err = conn.WriteMessage(mt, message)
			rdb.Publish(contextBackground, login.GameId, "!"+login.PlayerId+":"+string(message))
		}
	}
}

func incrStep(gameId string) (val int) {
	stepId := "step_" + gameId
//	val, err := rdb.Get(contextBackground, stepId).Result()
//	if err != nil {
//		panic(err)
//	}

	incVal, err := rdb.Incr(contextBackground, stepId).Result()
	if err != nil {
		panic(err)
	}
	return int(incVal)
}

func doSubscribe(gameId string, pubsub *redis.PubSub) {
	ch := pubsub.Channel()

	for msg := range ch {
		fmt.Println(msg.Channel, msg.Payload)
		payLoadArr := strings.SplitN(msg.Payload, ":", 1)

		for _, playerConnection := range playerConnections {
			if playerConnection.PlayerId != payLoadArr[0] {
				playerConnection.WebsocketsConn.WriteMessage(websocket.TextMessage, []byte(msg.Payload))
			}
		}
	}
}

func main() {
	rdb = redis.NewClient(&redis.Options{
		Addr:     "localhost:6379",
		Password: "", // no password set
		DB:       0,  // use default DB
	})

	http.HandleFunc("/", handler)
	upgrader.CheckOrigin = func(r *http.Request) bool {
		return true
	}

	err := http.ListenAndServe(":3333", nil)

	if errors.Is(err, http.ErrServerClosed) {
		fmt.Printf("server closed\n")
	} else if err != nil {
		fmt.Printf("error starting server: %s\n", err)
		os.Exit(1)
	}
}
