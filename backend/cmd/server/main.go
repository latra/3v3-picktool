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

	// Initialize Firebase service
	firebaseService, err := services.NewFirebaseService(cfg)
	if err != nil {
		log.Printf("Warning: Failed to initialize Firebase service: %v", err)
		log.Println("Continuing without Firebase support...")
	}

	// Initialize services
	roomService := services.NewRoomService(firebaseService)

	// Initialize handlers
	wsHandler := handlers.NewWebSocketHandler(roomService)

	// Setup routes
	http.HandleFunc(cfg.WSPath, wsHandler.Handle)

	// Start server
	address := ":" + cfg.Port
	fmt.Printf("Servidor WebSocket en http://%s%s\n", cfg.GetAddress(), cfg.WSPath)
	log.Fatal(http.ListenAndServe(address, nil))
}
