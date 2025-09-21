package services

import (
	"context"
	"fmt"
	"log"
	"time"
	"picks3w2a/internal/config"
	"picks3w2a/internal/models"

	firebase "firebase.google.com/go/v4"
	"cloud.google.com/go/firestore"
	"github.com/gorilla/websocket"
	"google.golang.org/api/option"
)

type FirebaseService struct {
	client *firestore.Client
	ctx    context.Context
}

// RoomData represents the structure saved to Firebase
type RoomData struct {
	Id              string             `json:"id"`
	BlueTeamName    string             `json:"blue_team_name"`
	RedTeamName     string             `json:"red_team_name"`
	BlueTeamHasBans bool               `json:"blue_team_has_bans"`
	RedTeamHasBans  bool               `json:"red_team_has_bans"`
	TimePerPick     int                `json:"time_per_pick"`
	TimePerBan      int                `json:"time_per_ban"`
	CurrentPhase    models.Phase       `json:"current_phase"`
	BlueTeam        models.Team        `json:"blue_team"`
	RedTeam         models.Team        `json:"red_team"`
	FearlessBans    []models.Champion  `json:"fearless_bans"`
	CreatedAt       int64              `json:"created_at"`
	CompletedAt     int64              `json:"completed_at,omitempty"`
}

// NewFirebaseService creates a new Firebase service instance
func NewFirebaseService(cfg *config.Config) (*FirebaseService, error) {
	ctx := context.Background()
	
	log.Printf("Initializing Firebase with credentials: %s, project: %s", cfg.FirebaseCredentialsPath, cfg.FirebaseProjectID)
	
	// If no credentials path is provided, return nil (Firebase disabled)
	if cfg.FirebaseCredentialsPath == "" || cfg.FirebaseProjectID == "" {
		log.Println("Firebase credentials not configured, Firebase service disabled")
		return nil, nil
	}

	// Initialize Firebase app for Firestore
	opt := option.WithCredentialsFile(cfg.FirebaseCredentialsPath)
	
	config := &firebase.Config{
		ProjectID: cfg.FirebaseProjectID,
	}
	
	app, err := firebase.NewApp(ctx, config, opt)
	if err != nil {
		return nil, fmt.Errorf("error initializing Firebase app: %v", err)
	}

	// Get Firestore client
	client, err := app.Firestore(ctx)
	if err != nil {
		return nil, fmt.Errorf("error getting Firestore client: %v", err)
	}

	log.Println("Firebase service initialized successfully")
	return &FirebaseService{
		client: client,
		ctx:    ctx,
	}, nil
}

// SaveRoom saves a completed room to Firebase
func (fs *FirebaseService) SaveRoom(room *models.Room) error {
	if fs == nil || fs.client == nil {
		log.Println("Firebase service not initialized, skipping save")
		return nil // Firebase not configured, skip saving
	}
	
	log.Printf("Attempting to save room %s to Firebase", room.Id)

	// Convert room to RoomData for Firebase storage
	roomData := RoomData{
		Id:              room.Id,
		BlueTeamName:    room.BlueTeamName,
		RedTeamName:     room.RedTeamName,
		BlueTeamHasBans: room.BlueTeamHasBans,
		RedTeamHasBans:  room.RedTeamHasBans,
		TimePerPick:     room.TimePerPick,
		TimePerBan:      room.TimePerBan,
		CurrentPhase:    room.CurrentPhase,
		BlueTeam:        room.BlueTeam,
		RedTeam:         room.RedTeam,
		FearlessBans:    room.FearlessBans,
		CreatedAt:       getCurrentTimestamp(), // Timestamp de cuando se creó la room
		CompletedAt:     getCurrentTimestamp(), // Timestamp de cuando se completó
	}

	// Save to Firestore under collection "rooms" with document ID = roomId
	log.Printf("Saving to Firestore collection: rooms, document: %s", room.Id)
	
	_, err := fs.client.Collection("rooms").Doc(room.Id).Set(fs.ctx, roomData)
	if err != nil {
		log.Printf("Error saving room to Firestore: %v", err)
		return fmt.Errorf("error saving room to Firestore: %v", err)
	}

	log.Printf("Room %s saved to Firestore successfully", room.Id)
	return nil
}

// LoadRoom loads a room from Firestore
func (fs *FirebaseService) LoadRoom(roomId string) (*models.Room, error) {
	if fs == nil || fs.client == nil {
		return nil, fmt.Errorf("Firestore not configured")
	}

	// Load from Firestore
	doc, err := fs.client.Collection("rooms").Doc(roomId).Get(fs.ctx)
	if err != nil {
		return nil, fmt.Errorf("error loading room from Firestore: %v", err)
	}

	// Check if document exists
	if !doc.Exists() {
		return nil, fmt.Errorf("room not found in Firestore")
	}

	// Convert document data to RoomData
	var roomData RoomData
	err = doc.DataTo(&roomData)
	if err != nil {
		return nil, fmt.Errorf("error parsing room data from Firestore: %v", err)
	}

	// Convert RoomData back to Room
	room := &models.Room{
		Id:              roomData.Id,
		RedTeamKey:      "", // Keys are not stored for security
		BlueTeamKey:     "", // Keys are not stored for security
		BlueTeamName:    roomData.BlueTeamName,
		RedTeamName:     roomData.RedTeamName,
		BlueTeamHasBans: roomData.BlueTeamHasBans,
		RedTeamHasBans:  roomData.RedTeamHasBans,
		TimePerPick:     roomData.TimePerPick,
		TimePerBan:      roomData.TimePerBan,
		CurrentPhase:    roomData.CurrentPhase,
		BlueTeam:        roomData.BlueTeam,
		RedTeam:         roomData.RedTeam,
		FearlessBans:    roomData.FearlessBans,
		Clients:         make(map[*websocket.Conn]*models.Client), // Empty clients map
		TimeRemaining:   0,
		TimerActive:     false,
		TimerCancel:     make(chan bool, 1),
	}

	log.Printf("Room %s loaded from Firestore successfully", roomId)
	return room, nil
}

// RoomExists checks if a room exists in Firestore
func (fs *FirebaseService) RoomExists(roomId string) (bool, error) {
	if fs == nil || fs.client == nil {
		return false, nil // Firestore not configured
	}

	doc, err := fs.client.Collection("rooms").Doc(roomId).Get(fs.ctx)
	if err != nil {
		return false, fmt.Errorf("error checking room existence: %v", err)
	}

	return doc.Exists(), nil
}

// DeleteRoom removes a room from Firestore
func (fs *FirebaseService) DeleteRoom(roomId string) error {
	if fs == nil || fs.client == nil {
		return nil // Firestore not configured, skip deletion
	}

	_, err := fs.client.Collection("rooms").Doc(roomId).Delete(fs.ctx)
	if err != nil {
		return fmt.Errorf("error deleting room from Firestore: %v", err)
	}

	log.Printf("Room %s deleted from Firestore", roomId)
	return nil
}

// getCurrentTimestamp returns current Unix timestamp
func getCurrentTimestamp() int64 {
	return time.Now().Unix()
}
