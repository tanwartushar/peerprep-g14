package main

import (
	"context"
	"log"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/tgonet/peerprep-g14/services/question-service/internal/database"
)

func main() {
	// initialize MongoDB connection
	database.ConnectMongo()
	defer func() {
		if err := database.Client.Disconnect(context.Background()); err != nil {
			log.Fatalf("Error disconnecting from MongoDB: %v", err)
		}
	}()

	// initialize gin engine
	r := gin.Default()

	// basic health check route
	api := r.Group("/api/questions")
	{
		api.GET("/health", func(c *gin.Context) {
			c.JSON(http.StatusOK, gin.H{
				"status": "healthy",
				"service": "question-service",
			})
		})
	}

	// start server on port 8080
	log.Println("Starting Question Service on port 8080...")
	if err := r.Run(":8080"); err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}
}
