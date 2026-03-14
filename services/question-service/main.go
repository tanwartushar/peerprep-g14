package main

import (
	"context"
	"log"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/tgonet/peerprep-g14/services/question-service/internal/database"
	"github.com/tgonet/peerprep-g14/services/question-service/question/repository"
)

func main() {
    database.ConnectMongo()
    defer func() {
        if err := database.Client.Disconnect(context.Background()); err != nil {
            log.Fatalf("Error disconnecting from MongoDB: %v", err)
        }
    }()

    r := gin.Default()

    h := &Handler{
        QuestSvc: &repository.QuestionService{},
    }

    r.GET("/health", func(c *gin.Context) {
        c.JSON(http.StatusOK, gin.H{"status": "healthy"})
    })

    r.GET("/", h.GetQuestionsRequest)
    r.GET("/:id", h.GetQuestionByIDRequest)

    // admin only routes
    r.POST("/", AdminOnly(), h.PostCreateQuestionRequest)
    r.PUT("/:id", AdminOnly(), h.PutQuestionRequest)
    r.DELETE("/:id", AdminOnly(), h.DeleteQuestionRequest)

    log.Println("Starting Question Service on port 8080...")
    if err := r.Run(":8080"); err != nil {
        log.Fatalf("Failed to start server: %v", err)
    }
}