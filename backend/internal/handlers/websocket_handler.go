package handlers

import (
	"encoding/json"
	"log"
	"net/http"
	"github.com/gorilla/websocket"
	"picks3w2a/internal/services"
	"picks3w2a/internal/models"

	wsUpgrader "picks3w2a/pkg/websocket"
)

// WebSocketHandler handles WebSocket connections
type WebSocketHandler struct {
	roomService *services.RoomService
	userRooms   map[*websocket.Conn]string // Track which room each connection is in
}

// NewWebSocketHandler creates a new WebSocket handler
func NewWebSocketHandler(roomService *services.RoomService) *WebSocketHandler {
	return &WebSocketHandler{
		roomService: roomService,
		userRooms:   make(map[*websocket.Conn]string),
	}
}

// Handle handles WebSocket connections
func (h *WebSocketHandler) Handle(w http.ResponseWriter, r *http.Request) {
	conn, err := wsUpgrader.Upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Println("Error upgrade:", err)
		return
	}
	defer func() {
		// Cleanup when connection closes
		if roomId, exists := h.userRooms[conn]; exists {
			h.roomService.RemoveClient(roomId, conn)
			delete(h.userRooms, conn)
		}
		conn.Close()
	}()

	for {
		_, msgBytes, err := conn.ReadMessage()
		if err != nil {
			break
		}

		// Primero intentamos determinar el tipo de mensaje
		var baseMsg struct {
			Type string `json:"type"`
		}
		if err := json.Unmarshal(msgBytes, &baseMsg); err != nil {
			h.sendErrorResponse(conn, "Invalid message format")
			continue
		}
		log.Println("baseMsg", baseMsg)

		// Procesar según el tipo de mensaje
		switch baseMsg.Type {
		case "create":
			h.handleCreateRoom(conn, msgBytes)
		case "join":
			h.handleJoinRoom(conn, msgBytes)
		case "action":
			h.handleAction(conn, msgBytes)
		default:
			h.sendErrorResponse(conn, "Unknown message type")
		}
	}
}

func (h *WebSocketHandler) handleCreateRoom(conn *websocket.Conn, msgBytes []byte) {
	var createMsg models.CreateMessage
	log.Println("createMsg", createMsg)
	if err := json.Unmarshal(msgBytes, &createMsg); err != nil {
		h.sendErrorResponse(conn, "Invalid create message format")
		return
	}
	log.Println("message OK. unmarshalled")
	// Crear la room usando el servicio
	response, err := h.roomService.CreateRoom(createMsg)
	if err != nil {
		h.sendErrorResponse(conn, "Failed to create room")
		return
	}

	// Enviar la respuesta
	if err := conn.WriteJSON(response); err != nil {
		log.Printf("Error sending create response: %v", err)
	}
}

func (h *WebSocketHandler) handleJoinRoom(conn *websocket.Conn, msgBytes []byte) {
	var joinMsg models.JoinMessage
	if err := json.Unmarshal(msgBytes, &joinMsg); err != nil {
		h.sendErrorResponse(conn, "Invalid join message format")
		return
	}

	// Unirse a la room usando el servicio
	_, err := h.roomService.JoinRoom(joinMsg.RoomId, conn, joinMsg.Key)
	if err != nil {
		h.sendErrorResponse(conn, err.Error())
		return
	}

	// Registrar la conexión en el tracking
	h.userRooms[conn] = joinMsg.RoomId

	// Obtener la room para enviar el estado
	room, err := h.roomService.GetRoom(joinMsg.RoomId)
	if err != nil {
		h.sendErrorResponse(conn, "Room not found")
		return
	}

	// Crear mensaje de estado para enviar al cliente que se une
	room.TimerMutex.RLock()
	statusMsg := models.StatusMessage{
		Type:          "status",
		CurrentPhase:  room.CurrentPhase,
		TimePerPick:   room.TimePerPick,
		TimePerBan:    room.TimePerBan,
		TimeRemaining: room.TimeRemaining,
		TimerActive:   room.TimerActive,
		BlueTeam:      h.convertTeamToTeamStatus(room.BlueTeam),
		RedTeam:       h.convertTeamToTeamStatus(room.RedTeam),
	}
	room.TimerMutex.RUnlock()

	// Enviar el estado actual de la room al cliente que se une
	if err := conn.WriteJSON(statusMsg); err != nil {
		log.Printf("Error sending room status: %v", err)
		return
	}

	// Enviar el estado actualizado de la room a todos los clientes conectados
	room.TimerMutex.RLock()
	updatedStatusMsg := models.StatusMessage{
		Type:          "status",
		CurrentPhase:  room.CurrentPhase,
		TimePerPick:   room.TimePerPick,
		TimePerBan:    room.TimePerBan,
		TimeRemaining: room.TimeRemaining,
		TimerActive:   room.TimerActive,
		BlueTeam:      h.convertTeamToTeamStatus(room.BlueTeam),
		RedTeam:       h.convertTeamToTeamStatus(room.RedTeam),
	}
	room.TimerMutex.RUnlock()

	// Broadcast del estado actual a todos los clientes en la room
	h.roomService.BroadcastToRoom(joinMsg.RoomId, updatedStatusMsg)
}

func (h *WebSocketHandler) handleAction(conn *websocket.Conn, msgBytes []byte) {
	var actionMsg models.ActionMessage
	if err := json.Unmarshal(msgBytes, &actionMsg); err != nil {
		h.sendErrorResponse(conn, "Invalid action message format")
		return
	}

	// Obtener la room del cliente
	roomId, exists := h.userRooms[conn]
	if !exists {
		h.sendErrorResponse(conn, "You are not in a room")
		return
	}

	// Procesar la acción usando el servicio de room
	err := h.roomService.ProcessAction(roomId, conn, actionMsg)
	if err != nil {
		h.sendErrorResponse(conn, err.Error())
		return
	}

	// Obtener el estado actualizado de la room
	room, err := h.roomService.GetRoom(roomId)
	if err != nil {
		h.sendErrorResponse(conn, "Failed to get room state")
		return
	}

	// Crear mensaje de estado actualizado
	room.TimerMutex.RLock()
	statusMsg := models.StatusMessage{
		Type:          "status",
		CurrentPhase:  room.CurrentPhase,
		TimePerPick:   room.TimePerPick,
		TimePerBan:    room.TimePerBan,
		TimeRemaining: room.TimeRemaining,
		TimerActive:   room.TimerActive,
		BlueTeam:      h.convertTeamToTeamStatus(room.BlueTeam),
		RedTeam:       h.convertTeamToTeamStatus(room.RedTeam),
	}
	room.TimerMutex.RUnlock()

	// Broadcast del nuevo estado a todos los clientes en la room
	h.roomService.BroadcastToRoom(roomId, statusMsg)
}

func (h *WebSocketHandler) sendErrorResponse(conn *websocket.Conn, message string) {
	response := map[string]string{
		"type":  "error",
		"message": message,
	}
	if err := conn.WriteJSON(response); err != nil {
		log.Printf("Error sending error response: %v", err)
	}
}

func (h *WebSocketHandler) sendSuccessResponse(conn *websocket.Conn, message string) {
	response := map[string]string{
		"type":  "success",
		"message": message,
	}
	if err := conn.WriteJSON(response); err != nil {
		log.Printf("Error sending success response: %v", err)
	}
}

// convertTeamToTeamStatus converts a Team object to TeamStatus with only champion names
func (h *WebSocketHandler) convertTeamToTeamStatus(team models.Team) models.TeamStatus {
	return models.TeamStatus{
		Name:  team.Name,
		Bans:  h.extractChampionNames(team.Bans),
		Picks: h.extractChampionNames(team.Picks),
	}
}

// extractChampionNames extracts only the names from a slice of Champion objects
func (h *WebSocketHandler) extractChampionNames(champions []models.Champion) []string {
	names := make([]string, len(champions))
	for i, champion := range champions {
		names[i] = champion.Name
	}
	return names
}
