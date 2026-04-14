package handler

import (
	// "log"
	// "context"
	// "fmt"
	// "context"
	"net/http"
	"strings"
	
	// "go.mongodb.org/mongo-driver/v2/mongo/readpref"
	// "github.com/tgonet/peerprep-g14/services/question-service/internal/database"
	"github.com/tgonet/peerprep-g14/services/question-service/question/repository"
	"go.mongodb.org/mongo-driver/v2/mongo"
	"github.com/redis/go-redis/v9"
	// "go.mongodb.org/mongo-driver/v2/mongo/options"
	"github.com/gin-gonic/gin"
)

type Handler struct {
	DB *mongo.Client
	Cache *redis.Client
    QuestSvc *repository.QuestionService
}


func (h *Handler) PostCreateQuestionRequest(c *gin.Context) {
	var params repository.CreateQuestionParams

	// Bind JSON from the UI request
    if err := c.ShouldBindJSON(&params); err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request"})
        return
    }

	questID, err := h.QuestSvc.CreateQuestion(
		params,
		h.DB)

	if err != nil {
        c.JSON(http.StatusConflict, gin.H{"message": err.Error()})
        return
    }

	c.JSON(http.StatusOK, gin.H{"question_id": questID})
}

//fetch all qns, or filter by difficulty and topic
func (h *Handler) GetQuestionsRequest(c *gin.Context) {
	difficulty := c.Query("difficulty")
	topic := c.Query("topic")

	questions, err := h.QuestSvc.GetQuestions(difficulty, topic, h.DB)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch questions"})
		return
	}

	c.JSON(http.StatusOK, questions)
}

func (h *Handler) GetQuestionByIDRequest(c *gin.Context) {
	id := c.Param("id")

	question, err := h.QuestSvc.GetQuestionByID(id, h.DB)
	if err != nil {
		if err.Error() == "invalid ID format" || err.Error() == "question not found" {
			c.JSON(http.StatusNotFound, gin.H{"error": "Question not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch question"})
		return
	}

	c.JSON(http.StatusOK, question)
}

func (h *Handler) PutQuestionRequest(c *gin.Context) {
	var params repository.Question
	id := c.Param("id")

	if err := c.ShouldBindJSON(&params); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request payload"})
		return
	}

	err := h.QuestSvc.UpdateQuestion(id, params, h.DB)

	if err != nil {
		if err.Error() == "invalid ID format" || err.Error() == "question not found" {
			c.JSON(http.StatusNotFound, gin.H{"error": "Question not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Question updated successfully"})
}

func (h *Handler) DeleteQuestionRequest(c *gin.Context) {
	id := c.Param("id")

	err := h.QuestSvc.DeleteQuestion(id, h.DB)
	if err != nil {
		if err.Error() == "invalid ID format" || err.Error() == "question not found" {
			c.JSON(http.StatusNotFound, gin.H{"error": "Question not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete question"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Question deleted successfully"})
}

// GetAvailableQuestionsRequest returns questions excluding those completed by given users
func (h *Handler) GetAvailableQuestionsRequest(c *gin.Context) {
	difficulty := c.Query("difficulty")
	topic := c.Query("topic")
	user1 := c.Query("user1")
	user2 := c.Query("user2")

	var userIds []string
	if user1 != "" {
		userIds = append(userIds, user1)
	}
	if user2 != "" {
		userIds = append(userIds, user2)
	}

	var excludeIds []string
	if len(userIds) > 0 {
		var err error
		excludeIds, err = h.QuestSvc.GetCompletedQuestionIds(userIds, h.DB)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch completed questions"})
			return
		}
	}

	questions, err := h.QuestSvc.GetAvailableQuestions(difficulty, topic, excludeIds, h.DB)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch questions"})
		return
	}

	c.JSON(http.StatusOK, questions)
}

// PostMarkCompletedRequest marks a question as completed for the given users
func (h *Handler) PostMarkCompletedRequest(c *gin.Context) {
	var params repository.MarkCompletedParams

	if err := c.ShouldBindJSON(&params); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request"})
		return
	}

	if len(params.UserIds) == 0 || params.QuestionId == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "userIds and questionId are required"})
		return
	}

	err := h.QuestSvc.MarkQuestionsCompleted(params.UserIds, params.QuestionId, h.DB)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Questions marked as completed"})
}

// AdminOnly Middleware enforces that the requester has the 'ADMIN' role
func AdminOnly() gin.HandlerFunc {
	return func(c *gin.Context) {
		role := c.GetHeader("X-User-Role")
		
		// Convert to uppercase to handle 'admin', 'Admin', 'SUPERADMIN', 'superadmin', etc.
		roleUpper := strings.ToUpper(role)
		if roleUpper != "ADMIN" && roleUpper != "SUPERADMIN" && roleUpper != "SUPER_ADMIN" {
			c.JSON(http.StatusForbidden, gin.H{"error": "Forbidden: You must be an admin to perform this action"})
			c.Abort()
			return
		}
		
		// If they are an admin, proceed to the actual handler (like PostCreateQuestionRequest)
		c.Next()
	}
}
