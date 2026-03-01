package main

import (
	// "log"
	// "context"
	// "fmt"
	// "go.mongodb.org/mongo-driver/v2/mongo/readpref"
	"context"
	// "fmt"
	// "time"

	"github.com/tgonet/peerprep-g14/services/question-service/internal/database"
	"github.com/tgonet/peerprep-g14/services/question-service/question/repository"
	// "go.mongodb.org/mongo-driver/v2/mongo"
	// "go.mongodb.org/mongo-driver/v2/mongo/options"
	// "github.com/gin-gonic/gin"
)

 

func main() {
	// quest_col := "question_collection"
	client := database.ConnectMongo()
	// question_coll := client.Database("questionTestcaseDB").Collection(quest_col)

	title := "Reverse linked list"
	desc := "Use O(n) solution"
	diff := "easy"
	topic := []string{"binary_search", "singly_linked_list"}
	repository.CreateQuestion(&title, &desc, diff, topic, client)
  	// database.ConnectMongo()

	//disconnet db
	client.Disconnect(context.Background())
}
