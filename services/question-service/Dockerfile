FROM golang:1.26-alpine AS builder

WORKDIR /app

# Copy go mod files
COPY go.mod go.sum ./
RUN go mod download

# Copy the source code
COPY . .

# Build the application
RUN CGO_ENABLED=0 GOOS=linux go build -o /question-service .

# Use a lightweight alpine image for running
FROM alpine:latest

WORKDIR /

# Copy the pre-built binary
COPY --from=builder /question-service /question-service

EXPOSE 8080

# Run the executable
CMD ["/question-service"]
