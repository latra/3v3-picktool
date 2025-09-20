package config

import (
	"os"
)

// Config holds application configuration
type Config struct {
	Port   string
	Host   string
	WSPath string
	FirebaseCredentialsPath string
	FirebaseProjectID       string
}

// NewConfig creates a new configuration instance
func NewConfig() *Config {
	return &Config{
		Port:                    getEnv("PORT", "8080"),
		Host:                    getEnv("HOST", "localhost"),
		WSPath:                  getEnv("WS_PATH", "/ws"),
		FirebaseCredentialsPath: getEnv("FIREBASE_CREDENTIALS_PATH", ""),
		FirebaseProjectID:       getEnv("FIREBASE_PROJECT_ID", ""),
	}
}

// getEnv gets an environment variable or returns a default value
func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

// GetAddress returns the full server address
func (c *Config) GetAddress() string {
	return c.Host + ":" + c.Port
}
