package main

import (
	// "log"
	// "context"
	// "fmt"
	// "context"
	"net/http"
	// "fmt"
	// "time"
	
	// "go.mongodb.org/mongo-driver/v2/mongo/readpref"
	"github.com/tgonet/peerprep-g14/services/question-service/internal/database"
	"github.com/tgonet/peerprep-g14/services/question-service/question/repository"
	// "go.mongodb.org/mongo-driver/v2/mongo"
	// "go.mongodb.org/mongo-driver/v2/mongo/options"
	"github.com/gin-gonic/gin"
)

type Handler struct {
    QuestSvc *repository.QuestionService
}


func (h *Handler) PostCreateQuestionRequest(c *gin.Context) {
	var questDoc struct {
        Title   string `json:"title"`
        Description string `json:"description"`
        Difficulty string `json:"difficulty"`
        Topics []string `json:"topics"`
    }

	// Bind JSON from the UI request
    if err := c.ShouldBindJSON(&questDoc); err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request"})
        return
    }

	questID, err := h.QuestSvc.CreateQuestion(
		&questDoc.Title, 
		&questDoc.Description, 
		questDoc.Difficulty, 
		questDoc.Topics, 
		database.Client)

	if err != nil {
        c.JSON(http.StatusConflict, gin.H{"message": err.Error()})
        return
    }

	c.JSON(http.StatusOK, gin.H{"question_id": questID})
}


