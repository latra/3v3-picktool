package websocket

import (
	"net/http"
	"github.com/gorilla/websocket"
)

// Upgrader configures the WebSocket upgrader
var Upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		// Para pruebas aceptamos todo. En producción deberías validar origen.
		return true
	},
}
