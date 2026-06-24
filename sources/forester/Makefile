.PHONY: build install test clean cross-build

# Build variables
BINARY_NAME=forester
BUILD_DIR=build
VERSION?=0.8
BUILD_TIME=$(shell date -u '+%Y-%m-%d_%H:%M:%S')
GIT_COMMIT=$(shell git rev-parse --short HEAD 2>/dev/null || echo "unknown")

# Installation paths
ifeq ($(OS),Windows_NT)
	INSTALL_PREFIX?=C:/Program Files/DiffMachine
	BINARY_EXT=.exe
else
	ifeq ($(shell uname),Darwin)
		INSTALL_PREFIX?=/Applications/DiffMachine
	else
		INSTALL_PREFIX?=/opt/DiffMachine
	endif
	BINARY_EXT=
endif

# Build flags
LDFLAGS=-ldflags "-X main.Version=$(VERSION) -X main.BuildTime=$(BUILD_TIME) -X main.GitCommit=$(GIT_COMMIT)"

# Build for current platform
build:
	@echo "Building $(BINARY_NAME)..."
	@mkdir -p $(BUILD_DIR)
	@go build $(LDFLAGS) -o $(BUILD_DIR)/$(BINARY_NAME)$(BINARY_EXT) ./cmd/forester
	@echo "Build complete: $(BUILD_DIR)/$(BINARY_NAME)$(BINARY_EXT)"

# Build C API library
build-lib:
	@echo "Building Forester C API library..."
	@mkdir -p $(BUILD_DIR)
ifeq ($(OS),Windows_NT)
	@go build -buildmode=c-shared -o $(BUILD_DIR)/forester.dll ./api
	@echo "Build complete: $(BUILD_DIR)/forester.dll"
else
ifeq ($(shell uname),Darwin)
	@go build -buildmode=c-shared -o $(BUILD_DIR)/libforester.dylib ./api
	@echo "Build complete: $(BUILD_DIR)/libforester.dylib"
else
	@go build -buildmode=c-shared -o $(BUILD_DIR)/libforester.so ./api
	@echo "Build complete: $(BUILD_DIR)/libforester.so"
endif
endif

# Install to system directory
install: build
	@echo "Installing to $(INSTALL_PREFIX)..."
	@mkdir -p $(INSTALL_PREFIX)/bin
	@cp $(BUILD_DIR)/$(BINARY_NAME)$(BINARY_EXT) $(INSTALL_PREFIX)/bin/$(BINARY_NAME)$(BINARY_EXT)
	@echo "Installation complete: $(INSTALL_PREFIX)/bin/$(BINARY_NAME)$(BINARY_EXT)"

# Run tests
test:
	@echo "Running tests..."
	@go test -v ./...

# Run tests with coverage
test-coverage:
	@echo "Running tests with coverage..."
	@go test -coverprofile=coverage.out ./...
	@go tool cover -html=coverage.out -o coverage.html
	@echo "Coverage report: coverage.html"

# Clean build artifacts
clean:
	@echo "Cleaning..."
	@rm -rf $(BUILD_DIR)
	@rm -rf bin/
	@rm -f coverage.out coverage.html
	@rm -f forester forester.exe
	@go clean -cache -testcache
	@echo "Clean complete"

# Cross-compilation for all platforms
cross-build:
	@echo "Cross-compiling for all platforms..."
	@mkdir -p $(BUILD_DIR)
	@GOOS=linux GOARCH=amd64 go build $(LDFLAGS) -o $(BUILD_DIR)/$(BINARY_NAME)-linux-amd64$(BINARY_EXT) ./cmd/forester
	@GOOS=linux GOARCH=arm64 go build $(LDFLAGS) -o $(BUILD_DIR)/$(BINARY_NAME)-linux-arm64$(BINARY_EXT) ./cmd/forester
	@GOOS=darwin GOARCH=amd64 go build $(LDFLAGS) -o $(BUILD_DIR)/$(BINARY_NAME)-darwin-amd64$(BINARY_EXT) ./cmd/forester
	@GOOS=darwin GOARCH=arm64 go build $(LDFLAGS) -o $(BUILD_DIR)/$(BINARY_NAME)-darwin-arm64$(BINARY_EXT) ./cmd/forester
	@GOOS=windows GOARCH=amd64 go build $(LDFLAGS) -o $(BUILD_DIR)/$(BINARY_NAME)-windows-amd64.exe ./cmd/forester
	@echo "Cross-compilation complete"

# Development: run with live reload (requires air or similar)
dev:
	@go run ./cmd/forester

# Format code
fmt:
	@go fmt ./...

# Lint code
lint:
	@golangci-lint run ./... || echo "Install golangci-lint for linting"

# Download dependencies
deps:
	@go mod download
	@go mod tidy

# Verify dependencies
verify:
	@go mod verify


