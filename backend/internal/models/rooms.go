package models

import (
	"sync"
	"github.com/gorilla/websocket"
)

type Champion struct {
	Name string `json:"name"`
	LockedAt int `json:"locked_at,omitempty"`
}

type Client struct {
	Conn *websocket.Conn `json:"-"`
	Team string `json:"team"` // "blue", "red", or "" for spectator
}

type Team struct {
	Name string `json:"name"`
	Bans []Champion `json:"bans"`
	Picks []Champion `json:"picks"`
}

type Room struct {
	Id string `json:"id"`
	RedTeamKey string `json:"red_team_key"`
	BlueTeamKey string `json:"blue_team_key"`
	BlueTeamName string `json:"blue_team_name"`
	RedTeamName string `json:"red_team_name"`
	BlueTeamHasBans bool `json:"blue_team_has_bans"`
	RedTeamHasBans bool `json:"red_team_has_bans"`
	TimePerPick int `json:"time_per_pick"`
	TimePerBan int `json:"time_per_ban"`
	CurrentPhase Phase `json:"current_phase"`
	BlueTeam Team `json:"blue_team"`
	RedTeam Team `json:"red_team"`
	Clients map[*websocket.Conn]*Client `json:"-"` // Connected clients
	
	// Timer fields
	TimeRemaining int `json:"time_remaining"` // Tiempo restante en segundos
	TimerActive bool `json:"timer_active"` // Si el timer está activo
	TimerCancel chan bool `json:"-"` // Canal para cancelar el timer
	TimerMutex sync.RWMutex `json:"-"` // Mutex para operaciones de timer
}