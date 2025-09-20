package services

import (
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"log"
	"strings"
	"time"
	"picks3w2a/internal/models"
	"github.com/gorilla/websocket"
)

type RoomService struct {
	rooms           map[string]*models.Room
	firebaseService *FirebaseService
}

func NewRoomService(firebaseService *FirebaseService) *RoomService {
	return &RoomService{
		rooms:           make(map[string]*models.Room),
		firebaseService: firebaseService,
	}
}

// generateRandomID genera un ID aleatorio de 8 caracteres
func (s *RoomService) generateRandomID() string {
	bytes := make([]byte, 4)
	rand.Read(bytes)
	return hex.EncodeToString(bytes)
}

// generateUniqueRoomID genera un ID único para la room
func (s *RoomService) generateUniqueRoomID() string {
	for {
		id := s.generateRandomID()
		if _, exists := s.rooms[id]; !exists {
			return id
		}
	}
}

// createEmptyRoom crea una room vacía sin empezar (para espectadores)
func (s *RoomService) createEmptyRoom(roomId string) *models.Room {
	return &models.Room{
		Id:              roomId,
		RedTeamKey:      "",
		BlueTeamKey:     "",
		BlueTeamName:    "Blue Team",
		RedTeamName:     "Red Team",
		BlueTeamHasBans: false,
		RedTeamHasBans:  false,
		TimePerPick:     30,
		TimePerBan:      30,
		CurrentPhase:    models.NoReady,
		BlueTeam: models.Team{
			Name:  "Blue Team",
			Bans:  s.initializeBansArray(),
			Picks: s.initializePicksArray(),
		},
		RedTeam: models.Team{
			Name:  "Red Team",
			Bans:  s.initializeBansArray(),
			Picks: s.initializePicksArray(),
		},
		FearlessBans:  []models.Champion{}, // Lista vacía para rooms de espectadores
		Clients:       make(map[*websocket.Conn]*models.Client),
		TimeRemaining: 0,
		TimerActive:   false,
		TimerCancel:   make(chan bool, 1),
	}
}

// initializeBansArray inicializa el array de bans con 5 posiciones vacías
func (s *RoomService) initializeBansArray() []models.Champion {
	bans := make([]models.Champion, 5)
	for i := range bans {
		bans[i] = models.Champion{Name: "-1"}
	}
	return bans
}

// initializePicksArray inicializa el array de picks con 3 posiciones vacías
func (s *RoomService) initializePicksArray() []models.Champion {
	picks := make([]models.Champion, 3)
	for i := range picks {
		picks[i] = models.Champion{Name: "-1"}
	}
	return picks
}

// initializeFearlessBans convierte la lista de strings en una lista de Champion
func (s *RoomService) initializeFearlessBans(fearlessBansNames []string) []models.Champion {
	if fearlessBansNames == nil {
		return []models.Champion{}
	}
	
	fearlessBans := make([]models.Champion, len(fearlessBansNames))
	for i, name := range fearlessBansNames {
		fearlessBans[i] = models.Champion{Name: name}
	}
	return fearlessBans
}

// CreateRoom crea una nueva room basada en el CreateMessage
func (s *RoomService) CreateRoom(createMsg models.CreateMessage) (*models.CreateResponseMessage, error) {
	// Generar IDs únicos
	roomId := s.generateUniqueRoomID()
	redTeamKey := s.generateRandomID()
	blueTeamKey := s.generateRandomID()
	log.Println("roomId", roomId)
	log.Println("redTeamKey", redTeamKey)
	log.Println("blueTeamKey", blueTeamKey)
	// Determinar la fase inicial basada en si los equipos tienen bans
	initialPhase := models.NoReady

	// Crear la room
	room := &models.Room{
		Id:              roomId,
		RedTeamKey:      redTeamKey,
		BlueTeamKey:     blueTeamKey,
		BlueTeamName:    createMsg.BlueTeamName,
		RedTeamName:     createMsg.RedTeamName,
		BlueTeamHasBans: createMsg.BlueTeamHasBans,
		RedTeamHasBans:  createMsg.RedTeamHasBans,
		TimePerPick:     createMsg.TimePerPick,
		TimePerBan:      createMsg.TimePerBan,
		CurrentPhase:    initialPhase,
		BlueTeam: models.Team{
			Name:  createMsg.BlueTeamName,
			Bans:  s.initializeBansArray(),
			Picks: s.initializePicksArray(),
		},
		RedTeam: models.Team{
			Name:  createMsg.RedTeamName,
			Bans:  s.initializeBansArray(),
			Picks: s.initializePicksArray(),
		},
		FearlessBans: s.initializeFearlessBans(createMsg.FearlessBans),
		Clients: make(map[*websocket.Conn]*models.Client),
		
		// Inicializar campos de timer
		TimeRemaining: 0,
		TimerActive: false,
		TimerCancel: make(chan bool, 1),
	}
	log.Println("room", room)
	// Guardar la room
	s.rooms[roomId] = room

	// Crear la respuesta
	response := &models.CreateResponseMessage{
		Type:        "create_response",
		RoomId:      roomId,
		RedTeamKey:  redTeamKey,
		BlueTeamKey: blueTeamKey,
	}

	return response, nil
}

// GetRoom obtiene una room por su ID, primero busca en RAM, luego en Firebase
func (s *RoomService) GetRoom(roomId string) (*models.Room, error) {
	// Primero buscar en RAM
	room, exists := s.rooms[roomId]
	if exists {
		return room, nil
	}

	// Si no está en RAM, intentar cargar desde Firebase
	if s.firebaseService != nil {
		firebaseRoom, err := s.firebaseService.LoadRoom(roomId)
		if err == nil {
			// Room encontrada en Firebase, cargarla en RAM
			s.rooms[roomId] = firebaseRoom
			log.Printf("Room %s loaded from Firestore and cached in RAM", roomId)
			return firebaseRoom, nil
		}
		log.Printf("Room %s not found in Firestore: %v", roomId, err)
	}

	return nil, fmt.Errorf("room not found")
}

// GetRooms obtiene todas las rooms (para debugging)
func (s *RoomService) GetRooms() map[string]*models.Room {
	roomsCopy := make(map[string]*models.Room)
	for k, v := range s.rooms {
		roomsCopy[k] = v
	}
	return roomsCopy
}

// JoinRoom añade un cliente a una room y determina su equipo basado en la key
func (s *RoomService) JoinRoom(roomId string, conn *websocket.Conn, key string) (string, error) {
	// Usar GetRoom que maneja tanto RAM como Firebase
	room, err := s.GetRoom(roomId)
	if err != nil {
		// Si no se encuentra la room, crear una nueva room sin empezar
		if key == "" { // Solo espectadores pueden unirse a rooms no existentes
			room = s.createEmptyRoom(roomId)
			s.rooms[roomId] = room
		} else {
			return "", fmt.Errorf("room not found")
		}
	}

	// Determinar el equipo basado en la key
	var team string
	if key == room.BlueTeamKey {
		team = "blue"
	} else if key == room.RedTeamKey {
		team = "red"
	} else if key == "" {
		team = "" // spectator
	} else {
		return "", fmt.Errorf("invalid key")
	}

	// Crear el cliente y añadirlo a la room
	client := &models.Client{
		Conn: conn,
		Team: team,
	}
	room.Clients[conn] = client

	log.Printf("Cliente añadido a la room %s como %s", roomId, team)
	return team, nil
}

// RemoveClient elimina un cliente de una room
func (s *RoomService) RemoveClient(roomId string, conn *websocket.Conn) {
	room, exists := s.rooms[roomId]
	if !exists {
		return
	}

	delete(room.Clients, conn)
	log.Printf("Cliente eliminado de la room %s", roomId)
}

// BroadcastToRoom envía un mensaje a todos los clientes conectados en una room
func (s *RoomService) BroadcastToRoom(roomId string, message interface{}) {
	room, exists := s.rooms[roomId]
	if !exists {
		return
	}

	for conn, _ := range room.Clients {
		if err := conn.WriteJSON(message); err != nil {
			log.Printf("Error enviando mensaje a cliente: %v", err)
			// Eliminar cliente con conexión rota
			delete(room.Clients, conn)
		}
	}
}

// ProcessAction procesa una acción de un equipo y actualiza el estado de la room
func (s *RoomService) ProcessAction(roomId string, conn *websocket.Conn, action models.ActionMessage) error {
	room, exists := s.rooms[roomId]
	if !exists {
		return fmt.Errorf("room not found")
	}

	// Obtener el cliente que envió la acción
	client, exists := room.Clients[conn]
	if !exists {
		return fmt.Errorf("client not found in room")
	}

	// Verificar que el cliente pertenece a un equipo
	if client.Team == "" {
		return fmt.Errorf("spectators cannot perform actions")
	}

	switch action.Action {
	case "ready":
		return s.processReadyAction(room, client.Team)
	case "champ_select":
		return s.processChampSelectAction(room, client.Team, action.Champion)
	case "champ_pick":
		return s.processChampPickAction(room, client.Team, action.Champion)
	default:
		return fmt.Errorf("unknown action type: %s", action.Action)
	}
}

// processReadyAction maneja la acción "ready"
func (s *RoomService) processReadyAction(room *models.Room, team string) error {
	switch room.CurrentPhase {
	case models.NoReady:
		if team == "blue" {
			room.CurrentPhase = models.BlueReady
		} else if team == "red" {
			room.CurrentPhase = models.RedReady
		}
	case models.BlueReady:
		if team == "red" {
			// Determinar la primera fase basado en si hay bans
			if room.BlueTeamHasBans || room.RedTeamHasBans {
				room.CurrentPhase = models.BanBlue1
			} else {
				room.CurrentPhase = models.PickBlue1
			}
			// Iniciar timer para la nueva fase
			s.startTimerForPhase(room)
		}
	case models.RedReady:
		if team == "blue" {
			// Determinar la primera fase basado en si hay bans
			if room.BlueTeamHasBans || room.RedTeamHasBans {
				room.CurrentPhase = models.BanBlue1
			} else {
				room.CurrentPhase = models.PickBlue1
			}
			// Iniciar timer para la nueva fase
			s.startTimerForPhase(room)
		}
	default:
		return fmt.Errorf("ready action not allowed in current phase: %s", room.CurrentPhase)
	}
	return nil
}

// processChampSelectAction maneja la acción "champ_select" (no afecta la fase)
func (s *RoomService) processChampSelectAction(room *models.Room, team string, champion string) error {
	if champion == "" {
		return fmt.Errorf("champion name is required for champ_select action")
	}

	// Verificar si el equipo puede actuar en esta fase
	canAct := false
	if team == "blue" && (s.isBluePhase(room.CurrentPhase)) {
		canAct = true
	} else if team == "red" && (s.isRedPhase(room.CurrentPhase)) {
		canAct = true
	}

	if !canAct {
		return fmt.Errorf("team %s cannot act in phase %s", team, room.CurrentPhase)
	}

	// Verificar que el campeón no esté ya baneado o pickeado (incluso para selección temporal)
	if s.isChampionBanned(room, champion, -1) {
		return fmt.Errorf("champion %s is already banned", champion)
	}
	
	if s.isChampionPicked(room, champion, -1) {
		return fmt.Errorf("champion %s is already picked", champion)
	}
	
	// Verificar que el campeón no esté en los fearless bans
	if s.isChampionInFearlessBans(room, champion) {
		return fmt.Errorf("champion %s is disabled (fearless ban)", champion)
	}
	
	// Obtener la posición correspondiente a la fase actual
	position := s.getPhasePosition(room.CurrentPhase)
	if position == -1 {
		return fmt.Errorf("champ_select not allowed in phase %s", room.CurrentPhase)
	}
	
	newChampion := models.Champion{Name: champion}
	if s.isBanPhase(room.CurrentPhase) {
		if team == "blue" {
			room.BlueTeam.Bans[position] = newChampion
		} else {
			room.RedTeam.Bans[position] = newChampion
		}
	} else if s.isPickPhase(room.CurrentPhase) {
		if team == "blue" {
			room.BlueTeam.Picks[position] = newChampion
		} else {
			room.RedTeam.Picks[position] = newChampion
		}
	} else {
		return fmt.Errorf("champ_select not allowed in phase %s", room.CurrentPhase)
	}
	
	// La acción champ_select modifica el estado temporalmente
	log.Printf("Team %s selected champion %s at position %d (temporary)", team, champion, position)
	return nil
}

// processChampPickAction maneja la acción "champ_pick"
func (s *RoomService) processChampPickAction(room *models.Room, team string, champion string) error {
	if champion == "" {
		return fmt.Errorf("champion name is required for champ_pick action")
	}

	// Verificar si el equipo puede actuar en esta fase
	canAct := false
	if team == "blue" && (s.isBluePhase(room.CurrentPhase)) {
		canAct = true
	} else if team == "red" && (s.isRedPhase(room.CurrentPhase)) {
		canAct = true
	}

	if !canAct {
		return fmt.Errorf("team %s cannot act in phase %s", team, room.CurrentPhase)
	}
	position := s.getPhasePosition(room.CurrentPhase)

	// Verificar que el campeón no esté ya baneado o pickeado
	if s.isChampionBanned(room, champion, position) {
		return fmt.Errorf("champion %s is already banned", champion)
	}
	
	if s.isChampionPicked(room, champion, position) {
		return fmt.Errorf("champion %s is already picked", champion)
	}
	
	// Verificar que el campeón no esté en los fearless bans
	if s.isChampionInFearlessBans(room, champion) {
		return fmt.Errorf("champion %s is disabled (fearless ban)", champion)
	}

	// Obtener la posición correspondiente a la fase actual
	if position == -1 {
		return fmt.Errorf("champ_pick not allowed in phase %s", room.CurrentPhase)
	}
	
	// Añadir el campeón al estado del equipo en la posición específica
	newChampion := models.Champion{Name: champion}
	
	if s.isBanPhase(room.CurrentPhase) {
		if team == "blue" {
			room.BlueTeam.Bans[position] = newChampion
		} else {
			room.RedTeam.Bans[position] = newChampion
		}
	} else if s.isPickPhase(room.CurrentPhase) {
		if team == "blue" {
			room.BlueTeam.Picks[position] = newChampion
		} else {
			room.RedTeam.Picks[position] = newChampion
		}
	} else {
		return fmt.Errorf("champ_pick not allowed in phase %s", room.CurrentPhase)
	}

	// Avanzar a la siguiente fase (esto ya incluye parar y reiniciar el timer)
	s.advanceToNextPhase(room)
	return nil
}

// Funciones auxiliares para determinar el tipo de fase
func (s *RoomService) isBluePhase(phase models.Phase) bool {
	bluePhases := []models.Phase{
		models.BanBlue1, models.BanBlue2, models.BanBlue3, models.BanBlue4, models.BanBlue5,
		models.PickBlue1, models.PickBlue2, models.PickBlue3,
	}
	for _, p := range bluePhases {
		if phase == p {
			return true
		}
	}
	return false
}

func (s *RoomService) isRedPhase(phase models.Phase) bool {
	redPhases := []models.Phase{
		models.BanRed1, models.BanRed2, models.BanRed3, models.BanRed4, models.BanRed5,
		models.PickRed1, models.PickRed2, models.PickRed3,
	}
	for _, p := range redPhases {
		if phase == p {
			return true
		}
	}
	return false
}

func (s *RoomService) isBanPhase(phase models.Phase) bool {
	banPhases := []models.Phase{
		models.BanBlue1, models.BanBlue2, models.BanBlue3, models.BanBlue4, models.BanBlue5,
		models.BanRed1, models.BanRed2, models.BanRed3, models.BanRed4, models.BanRed5,
	}
	for _, p := range banPhases {
		if phase == p {
			return true
		}
	}
	return false
}

func (s *RoomService) isPickPhase(phase models.Phase) bool {
	pickPhases := []models.Phase{
		models.PickBlue1, models.PickBlue2, models.PickBlue3,
		models.PickRed1, models.PickRed2, models.PickRed3,
	}
	for _, p := range pickPhases {
		if phase == p {
			return true
		}
	}
	return false
}

// getPhasePosition devuelve la posición del array (0-indexed) para una fase específica
func (s *RoomService) getPhasePosition(phase models.Phase) int {
	switch phase {
	// Ban phases - Blue team
	case models.BanBlue1:
		return 0
	case models.BanBlue2:
		return 1
	case models.BanBlue3:
		return 2
	case models.BanBlue4:
		return 3
	case models.BanBlue5:
		return 4
	// Ban phases - Red team
	case models.BanRed1:
		return 0
	case models.BanRed2:
		return 1
	case models.BanRed3:
		return 2
	case models.BanRed4:
		return 3
	case models.BanRed5:
		return 4
	// Pick phases - Blue team
	case models.PickBlue1:
		return 0
	case models.PickBlue2:
		return 1
	case models.PickBlue3:
		return 2
	// Pick phases - Red team
	case models.PickRed1:
		return 0
	case models.PickRed2:
		return 1
	case models.PickRed3:
		return 2
	default:
		return -1 // Fase no válida para ban/pick
	}
}

// isChampionBanned verifica si un campeón ya está baneado por cualquier equipo
func (s *RoomService) isChampionBanned(room *models.Room, championName string, position int) bool {
	championNameLower := strings.ToLower(strings.TrimSpace(championName))
	
	// Verificar bans del equipo azul
	for i, champion := range room.BlueTeam.Bans {
		// Ignorar posiciones vacías
		if champion.Name == "-1" {
			continue
		}
		// Ignorar la posición actual si está especificada
		if position != -1 && i == position {
			continue
		}
		if strings.ToLower(strings.TrimSpace(champion.Name)) == championNameLower {
			return true
		}
	}
	
	// Verificar bans del equipo rojo
	for i, champion := range room.RedTeam.Bans {
		// Ignorar posiciones vacías
		if champion.Name == "-1" {
			continue
		}
		// Ignorar la posición actual si está especificada
		if position != -1 && i == position {
			continue
		}
		if strings.ToLower(strings.TrimSpace(champion.Name)) == championNameLower {
			return true
		}
	}
	
	return false
}

// isChampionPicked verifica si un campeón ya está pickeado por cualquier equipo
func (s *RoomService) isChampionPicked(room *models.Room, championName string, position int) bool {
	championNameLower := strings.ToLower(strings.TrimSpace(championName))
	if championNameLower == "-1" {
		return false
	}
	// Verificar picks del equipo azul
	for i, champion := range room.BlueTeam.Picks {
		// Ignorar posiciones vacías
		if champion.Name == "-1" {
			continue
		}
		// Ignorar la posición actual si está especificada
		if position != -1 && i == position {
			continue
		}
		if strings.ToLower(strings.TrimSpace(champion.Name)) == championNameLower {
			return true
		}
	}
	
	// Verificar picks del equipo rojo
	for i, champion := range room.RedTeam.Picks {
		// Ignorar posiciones vacías
		if champion.Name == "-1" {
			continue
		}
		// Ignorar la posición actual si está especificada
		if position != -1 && i == position {
			continue
		}
		if strings.ToLower(strings.TrimSpace(champion.Name)) == championNameLower {
			return true
		}
	}
	
	return false
}

// isChampionInFearlessBans verifica si un campeón está en la lista de fearless bans
func (s *RoomService) isChampionInFearlessBans(room *models.Room, championName string) bool {
	championNameLower := strings.ToLower(strings.TrimSpace(championName))
	
	for _, champion := range room.FearlessBans {
		if strings.ToLower(strings.TrimSpace(champion.Name)) == championNameLower {
			return true
		}
	}
	
	return false
}

// advanceToNextPhase avanza a la siguiente fase en la secuencia
func (s *RoomService) advanceToNextPhase(room *models.Room) {
	// Parar el timer actual antes de cambiar de fase
	s.stopTimer(room)
	
	// Secuencia completa con bans
	fullPhaseSequence := []models.Phase{
		models.BanBlue1, models.BanRed1, models.BanBlue2, models.BanRed2, models.BanBlue3, models.BanRed3,
		models.PickBlue1, models.PickRed1, models.PickRed2, models.PickBlue2,
		models.BanRed4, models.BanBlue4, models.BanRed5, models.BanBlue5,
		models.PickBlue3, models.PickRed3, models.Finished,
	}

	// Secuencia sin bans (solo picks)
	noBanPhaseSequence := []models.Phase{
		models.PickBlue1, models.PickRed1, models.PickRed2, models.PickBlue2, models.PickBlue3, models.PickRed3, models.Finished,
	}

	var phaseSequence []models.Phase
	
	// Determinar qué secuencia usar basado en si los equipos tienen bans
	if room.BlueTeamHasBans || room.RedTeamHasBans {
		// Si al menos un equipo tiene bans, usar secuencia completa
		phaseSequence = fullPhaseSequence
	} else {
		// Si ningún equipo tiene bans, usar secuencia solo de picks
		phaseSequence = noBanPhaseSequence
	}

	for i, phase := range phaseSequence {
		if room.CurrentPhase == phase && i < len(phaseSequence)-1 {
			room.CurrentPhase = phaseSequence[i+1]
			
			// Si la nueva fase es Finished, guardar en Firebase y limpiar de RAM
			if room.CurrentPhase == models.Finished {
				s.handleFinishedRoom(room)
				return // No iniciar timer para fase terminada
			}
			break
		}
	}
	
	// Iniciar timer para la nueva fase si es una fase de pick/ban
	s.startTimerForPhase(room)
}

// startTimerForPhase inicia el timer para una fase específica
func (s *RoomService) startTimerForPhase(room *models.Room) {
	// Solo iniciar timer para fases de pick y ban
	if !s.isBanPhase(room.CurrentPhase) && !s.isPickPhase(room.CurrentPhase) {
		return
	}
	
	room.TimerMutex.Lock()
	defer room.TimerMutex.Unlock()
	
	// Determinar el tiempo inicial basado en la fase
	var initialTime int
	if s.isBanPhase(room.CurrentPhase) {
		initialTime = room.TimePerBan
	} else {
		initialTime = room.TimePerPick
	}
	
	room.TimeRemaining = initialTime
	room.TimerActive = true
	
	// Crear un nuevo canal para cancelar si no existe
	if room.TimerCancel == nil {
		room.TimerCancel = make(chan bool, 1)
	}
	
	// Iniciar el timer en una goroutine
	go s.runTimer(room)
}

// stopTimer detiene el timer actual
func (s *RoomService) stopTimer(room *models.Room) {
	room.TimerMutex.Lock()
	defer room.TimerMutex.Unlock()
	
	if room.TimerActive {
		room.TimerActive = false
		// Enviar señal de cancelación
		select {
		case room.TimerCancel <- true:
		default:
			// Canal ya lleno, no es necesario enviar más señales
		}
	}
}

// resetTimer reinicia el timer al tiempo inicial de la fase actual
func (s *RoomService) resetTimer(room *models.Room) {
	if !s.isBanPhase(room.CurrentPhase) && !s.isPickPhase(room.CurrentPhase) {
		return
	}
	
	room.TimerMutex.Lock()
	defer room.TimerMutex.Unlock()
	
	// Determinar el tiempo inicial basado en la fase
	var initialTime int
	if s.isBanPhase(room.CurrentPhase) {
		initialTime = room.TimePerBan
	} else {
		initialTime = room.TimePerPick
	}
	
	room.TimeRemaining = initialTime
}

// runTimer ejecuta el countdown del timer
func (s *RoomService) runTimer(room *models.Room) {
	ticker := time.NewTicker(1 * time.Second)
	defer ticker.Stop()
	
	for {
		select {
		case <-room.TimerCancel:
			// Timer cancelado
			return
		case <-ticker.C:
			room.TimerMutex.Lock()
			if !room.TimerActive {
				room.TimerMutex.Unlock()
				return
			}
			
			room.TimeRemaining--
			
			if room.TimeRemaining <= 0 {
				// Tiempo agotado, avanzar a la siguiente fase
				room.TimerActive = false
				currentPhase := room.CurrentPhase
				room.TimerMutex.Unlock()
				
				log.Printf("Timer expired for room %s, advancing from phase %s to next phase", room.Id, currentPhase)
				
				// Detener el timer actual antes de avanzar
				s.stopTimer(room)
				
				// Avanzar manualmente (sin llamar a advanceToNextPhase para evitar recursión)
				s.manualAdvanceToNextPhase(room)
				
				// Iniciar timer para la nueva fase
				s.startTimerForPhase(room)
				
				// Enviar actualización a todos los clientes
				s.broadcastRoomUpdate(room)
				return
			}
			room.TimerMutex.Unlock()
			
			// Enviar actualización del timer cada segundo
			s.broadcastRoomUpdate(room)
		}
	}
}

// broadcastRoomUpdate envía el estado actualizado de la room a todos los clientes
func (s *RoomService) broadcastRoomUpdate(room *models.Room) {
	room.TimerMutex.RLock()
	
	// Convert team data to only include champion names
	blueTeamStatus := models.TeamStatus{
		Name:  room.BlueTeam.Name,
		Bans:  s.extractChampionNames(room.BlueTeam.Bans),
		Picks: s.extractChampionNames(room.BlueTeam.Picks),
	}
	
	redTeamStatus := models.TeamStatus{
		Name:  room.RedTeam.Name,
		Bans:  s.extractChampionNames(room.RedTeam.Bans),
		Picks: s.extractChampionNames(room.RedTeam.Picks),
	}
	
	statusMsg := models.StatusMessage{
		Type:          "status",
		CurrentPhase:  room.CurrentPhase,
		TimePerPick:   room.TimePerPick,
		TimePerBan:    room.TimePerBan,
		TimeRemaining: room.TimeRemaining,
		TimerActive:   room.TimerActive,
		BlueTeam:      blueTeamStatus,
		RedTeam:       redTeamStatus,
		FearlessBans:  s.extractChampionNames(room.FearlessBans),
	}
	room.TimerMutex.RUnlock()
	
	s.BroadcastToRoom(room.Id, statusMsg)
}

// extractChampionNames extrae solo los nombres de los campeones de una lista de Champion
// Mantiene la estructura del array pero convierte "-1" a cadenas vacías
func (s *RoomService) extractChampionNames(champions []models.Champion) []string {
	names := make([]string, len(champions))
	for i, champion := range champions {
		if champion.Name == "-1" {
			names[i] = "" // Posición vacía
		} else {
			names[i] = champion.Name
		}
	}
	return names
}

// manualAdvanceToNextPhase avanza a la siguiente fase sin manejar timers (para uso interno)
func (s *RoomService) manualAdvanceToNextPhase(room *models.Room) {
	// Secuencia completa con bans
	fullPhaseSequence := []models.Phase{
		models.BanBlue1, models.BanRed1, models.BanBlue2, models.BanRed2, models.BanBlue3, models.BanRed3,
		models.PickBlue1, models.PickRed1, models.PickRed2, models.PickBlue2,
		models.BanRed4, models.BanBlue4, models.BanRed5, models.BanBlue5,
		models.PickBlue3, models.PickRed3, models.Finished,
	}

	// Secuencia sin bans (solo picks)
	noBanPhaseSequence := []models.Phase{
		models.PickBlue1, models.PickRed1, models.PickRed2, models.PickBlue2, models.PickBlue3, models.PickRed3, models.Finished,
	}

	var phaseSequence []models.Phase
	
	// Determinar qué secuencia usar basado en si los equipos tienen bans
	if room.BlueTeamHasBans || room.RedTeamHasBans {
		// Si al menos un equipo tiene bans, usar secuencia completa
		phaseSequence = fullPhaseSequence
	} else {
		// Si ningún equipo tiene bans, usar secuencia solo de picks
		phaseSequence = noBanPhaseSequence
	}

	for i, phase := range phaseSequence {
		if room.CurrentPhase == phase && i < len(phaseSequence)-1 {
			room.CurrentPhase = phaseSequence[i+1]
			log.Printf("Advanced to phase: %s", room.CurrentPhase)
			
			// Si la nueva fase es Finished, guardar en Firebase y limpiar de RAM
			if room.CurrentPhase == models.Finished {
				s.handleFinishedRoom(room)
			}
			break
		}
	}
}

// handleFinishedRoom maneja una room que ha terminado el draft
func (s *RoomService) handleFinishedRoom(room *models.Room) {
	log.Printf("Draft finished for room %s, saving to Firestore and cleaning from RAM", room.Id)
	
	// Guardar en Firebase si está configurado
	if s.firebaseService != nil {
		log.Printf("Firebase service available, attempting to save room %s", room.Id)
		if err := s.firebaseService.SaveRoom(room); err != nil {
			log.Printf("Error saving room %s to Firestore: %v", room.Id, err)
			return
		}
		log.Printf("Room %s saved to Firestore successfully", room.Id)
	} else {
		log.Printf("Firebase service not available, skipping save for room %s", room.Id)
	}
	
	// Programar limpieza de RAM después de un breve delay para permitir que los clientes reciban el estado final
	go func() {
		time.Sleep(5 * time.Second) // Esperar 5 segundos antes de limpiar
		s.removeRoomFromRAM(room.Id)
	}()
}

// removeRoomFromRAM elimina una room de la memoria RAM
func (s *RoomService) removeRoomFromRAM(roomId string) {
	delete(s.rooms, roomId)
	log.Printf("Room %s removed from RAM", roomId)
}