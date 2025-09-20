package models


type CreateMessage struct {
	Type string        `json:"type"`
	BlueTeamName string 	`json:"blue_team_name"`
	RedTeamName string 	`json:"red_team_name"`
	BlueTeamHasBans bool 	`json:"blue_team_has_bans"`
	RedTeamHasBans bool 	`json:"red_team_has_bans"`
	TimePerPick int 					`json:"time_per_pick"`
	TimePerBan int 					`json:"time_per_ban"`
	FearlessBans []string 		`json:"fearless_bans,omitempty"`
}

type CreateResponseMessage struct {
	Type string        `json:"type"`
	RoomId string 	`json:"room_id"`
	RedTeamKey   string `json:"red_team_key"`
	BlueTeamKey   string `json:"blue_team_key"`
}

type JoinMessage struct {
	Type string        `json:"type"`
	RoomId string 	`json:"room_id"`
	Key   string `json:"key,omitempty"`
}

type ActionMessage struct {
	Type string        `json:"type"`
	Action string      `json:"action"` // "ready", "champ_select", "champ_pick"
	Champion string 	`json:"champion,omitempty"`
}

type TeamMessage struct {
	Name string `json:"name"`
	Bans []int `json:"bans"`
	Picks []int `json:"picks"`
}

type TeamStatus struct {
	Name string `json:"name"`
	Bans []string `json:"bans"`
	Picks []string `json:"picks"`
}

type StatusMessage struct {
	Type string          			`json:"type"`
	CurrentPhase  Phase  	`json:"current_phase"`
	TimePerPick int 					`json:"time_per_pick"`
	TimePerBan int 					`json:"time_per_ban"`
	TimeRemaining int         `json:"time_remaining"`
	TimerActive bool          `json:"timer_active"`
	BlueTeam TeamStatus 					`json:"blue_team"`
	RedTeam TeamStatus 					`json:"red_team"`
	FearlessBans []string 		`json:"fearless_bans"`
}

type UserJoinedMessage struct {
	Type string `json:"type"`
	Message string `json:"message"`
	Team string `json:"team,omitempty"` // "blue", "red", or "" for spectator
}