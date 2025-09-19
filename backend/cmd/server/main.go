package main

import (
	"fmt"
	"log"
	"net/http"

	"picks3w2a/internal/config"
	"picks3w2a/internal/handlers"
	"picks3w2a/internal/services"
)

func main() {
	// Initialize configuration
	cfg := config.NewConfig()

	// Initialize services
	roomService := services.NewRoomService()

	// Initialize handlers
	wsHandler := handlers.NewWebSocketHandler(roomService)

	// Setup routes
	http.HandleFunc(cfg.WSPath, wsHandler.Handle)

	// Start server
	address := ":" + cfg.Port
	fmt.Printf("Servidor WebSocket en http://%s%s\n", cfg.GetAddress(), cfg.WSPath)
	log.Fatal(http.ListenAndServe(address, nil))
}
