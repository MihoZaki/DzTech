# Use the official Golang image as the base image
FROM golang:1.25.5-alpine AS builder

# Install git (required for go mod download in alpine)
RUN apk add --no-cache git

# Set the working directory inside the container
WORKDIR /app

# Copy go.mod and go.sum files
COPY go.mod go.sum ./

# Download dependencies
RUN go mod download

# Copy the rest of the application source code
COPY . .

# Build the Go binary statically
RUN CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -o yc-informatique-backend cmd/server/main.go

# Use a minimal base image for the final stage
FROM alpine:latest

# Install ca-certificates for HTTPS requests
RUN apk --no-cache add ca-certificates


# Set the working directory
WORKDIR /app

# Copy the compiled binary from the builder stage
COPY --from=builder /app/yc-informatique-backend .

# COPY the migrations directory from the builder stage
COPY --from=builder /app/migrations ./migrations


# Expose the port
EXPOSE 8080

# Command to run the application
CMD ["./yc-informatique-backend"]
