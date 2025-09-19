package models

type Phase string

const (
    NoReady       Phase = "NoReady"
	BlueReady     Phase = "BlueReady"
	RedReady      Phase = "RedReady"
    BanBlue1       Phase = "BanBlue1"
    BanRed1      Phase = "BanRed1"
    BanBlue2       Phase = "BanBlue2"
    BanRed2       Phase = "BanRed2"
    BanBlue3       Phase = "BanBlue3"
    BanRed3       Phase = "BanRed3"
    PickBlue1      Phase = "PickBlue1"
    PickRed1       Phase = "PickRed1"
    PickRed2       Phase = "PickRed2"
    PickBlue2       Phase = "PickBlue2"
    BanRed4       Phase = "BanRed4"
    BanBlue4       Phase = "BanBlue4"
    BanRed5       Phase = "BanRed5"
    BanBlue5        Phase = "BanBlue5"
    PickBlue3       Phase = "PickBlue3"
    PickRed3       Phase = "PickRed3"
	Finished       Phase = "Finished"
)
