//Run this file on startup
package api

import (
	// "log"
	// "context"
	// "fmt"
	// "context"
	// "net/http"
	// "fmt"
	// "time"
	
	// "go.mongodb.org/mongo-driver/v2/mongo/readpref"
	"github.com/tgonet/peerprep-g14/services/question-service/internal/database"
	// "github.com/tgonet/peerprep-g14/services/question-service/question/repository"
	// "go.mongodb.org/mongo-driver/v2/mongo"
	// "go.mongodb.org/mongo-driver/v2/mongo/options"
	"github.com/gin-gonic/gin"
)

func main() {
	// quest_col := "question_collection"
	database.ConnectMongo()
	r := gin.Default()
	r.Run(":8080")

	// title := "Reverse linked list"
	// desc := "Use O(n) solution"
	// diff := "easy"
	// topic := []string{"binary_search", "singly_linked_list"}
	// repository.CreateQuestion(&title, &desc, diff, topic, database.Client)
  	// database.ConnectMongo()

	//disconnet db
	// database.Client.Disconnect(context.Background())
}