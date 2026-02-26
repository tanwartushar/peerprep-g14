package main

import (
	// "github.com/tgonet/peerprep-g14/services/question-service/internal/database"
	"github.com/tgonet/peerprep-g14/services/question-service/question/repository"
)

func main() {
	// client := database.ConnectMongo()

	// question_coll := client.Database("questionTestcaseDB").Collection("question_collection")
	// test_coll := client.Database("questionTestcaseDB").Collection("testcase_collection")
	title := "Reverse list"
	desc := "sdlkfjsdlfj"
	diff := "easy"
	topic := []string{"binary search", "singly linked list"}
	repository.CreateQuestion(&title, &desc, diff, topic)

}


