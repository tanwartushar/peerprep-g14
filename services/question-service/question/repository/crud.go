// package main
package repository

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/tgonet/peerprep-g14/services/question-service/internal/database"
	// "go.mongodb.org/mongo-driver/v2/mongo"
	// "golang.org/x/text/cases"
)

var quest_col string = "question_collection"
var test_col string = "testcase_collection"

type difficulty int
type topic int

const (
	easy difficulty = iota
	medium
	hard
)

const (
	binary_search topic = iota
	depth_first_search
	breadth_first_search
	singly_linked_list
	doubly_linked_list
)

// Map strings to their corresponding enum values
var stringToTopicMap = map[string]topic{
    "binary search":        binary_search,
    "depth first search":   depth_first_search,
    "breadth first search": breadth_first_search,
    "singly linked list":   singly_linked_list,
    "doubly linked list":   doubly_linked_list,
}

type question struct {
	uid                  string
	question_title       string
	question_description string
	difficulty_level     difficulty
	related_topic        []topic
	created_at           time.Time
	// image_url
}

// Stringer inteface
// func (d difficulty) String() string {
// 	return [...]string{"Easy", "Medium", "Hard"}[d]
// }

func stringToDifficulty(s string) (difficulty, error) {
    switch s {
    case "easy":   return easy, nil
    case "medium": return medium, nil
    case "hard":   return hard, nil
    default:       return 0, errors.New("unknown difficulty level")
    }
}

func convertAndValidateTopics(input []string) ([]topic, error) {
    var result []topic

    for _, s := range input {
        // Check if the string exists in our map
        t, exists := stringToTopicMap[s]
        if !exists {
            return nil, fmt.Errorf("invalid topic: %s", s)
        }
        result = append(result, t)
    }

    return result, nil
}

func CreateQuestion(title *string, desc *string, diff string, topics []string) {
	var doc question

	// validateTitle(title)
	validatedLevel, err := stringToDifficulty(diff)
	if err != nil {
		fmt.Println("Validation Error:", err)
        return // Stop execution if the difficulty is invalid
    }

	validatedTopics, err := convertAndValidateTopics(topics)
	if err != nil {
		fmt.Println("Validation Error:", err)
        return // Stop execution if the difficulty is invalid
    }

	doc.question_title = *title
	doc.question_description = *desc
	doc.difficulty_level = validatedLevel
	doc.related_topic = validatedTopics

	println(doc.question_title)
	println(doc.question_description)
	println(doc.difficulty_level)		//TODO
	println(doc.related_topic)
	
	client := database.ConnectMongo()
	question_coll := client.Database("questionTestcaseDB").Collection(quest_col)
	result, err := question_coll.InsertOne(context.TODO(), doc)
	fmt.Printf("Inserted document with _id: %v\n", result.InsertedID)
}

// func validateDifficulty(diff string, quest_struct *question) (*question, error) {
// 	switch diff {
// 	case "easy":
// 		quest_struct.difficulty_level = easy
// 	case "medium":
// 		quest_struct.difficulty_level = medium
// 	case "hard":
// 		quest_struct.difficulty_level = hard
// 	default:
// 		return nil, errors.New("invalid difficulty: " + diff)
// 	}
// 	return quest_struct, nil
// }



func main() {
	// var diff difficulty = Easy
	// fmt.Printf("%s", diff)
	title := "Reverse list"
	desc := "sdlkfjsdlfj"
	diff := "easy"
	topic := []string{"binary search", "singly linked list"}

	CreateQuestion(&title, &desc, diff, topic)
}
