# Makefile for picks3-w2a project

.PHONY: build run clean test fmt vet

# Build the application
build:
	go build -o bin/server cmd/server/main.go

# Run the application
run:
	go run cmd/server/main.go

# Clean build artifacts
clean:
	rm -rf bin/

# Format code
fmt:
	go fmt ./...

# Run vet
vet:
	go vet ./...

# Run tests
test:
	go test ./...

# Install dependencies
deps:
	go mod download
	go mod tidy

# Development run with hot reload (requires air)
dev:
	air -c .air.toml
