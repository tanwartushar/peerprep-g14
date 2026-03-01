// package main
package repository

import (
	"context"
	"errors"
	"fmt"

	// "log"
	"strings"
	"time"

	// "github.com/tgonet/peerprep-g14/services/question-service/internal/database"
	"go.mongodb.org/mongo-driver/v2/mongo"
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

type TopicStore struct {
    topics map[string]struct{}
}

func NewTopicStore() *TopicStore {
    return &TopicStore{
        topics: map[string]struct{}{
            "binary_search":        {},
			"depth_first_search":   {},
			"breadth_first_search": {},
			"singly_linked_list":   {},
			"doubly_linked_list":   {},
        },
    }
}

type question struct {
	Question_title       string		//`bson:"question_title,omitempty"`
	Question_description string		//`bson:"question_description,omitempty"`
	Difficulty_level     string		//`bson:"difficulty_level,omitempty"`
	Related_topic        []string	//`bson:"related_topic,omitempty"`
	Created_at           string
	// image_url
}

// Stringer inteface
// func (d difficulty) String() string {
// 	return [...]string{"Easy", "Medium", "Hard"}[d]
// }

func validateDifficulty(s string) (string, error) {
	validDiff := false
	s = strings.ToLower(s)

    switch s {
    case "easy":   validDiff = true
    case "medium": validDiff = true
    case "hard":   validDiff = true
    default:       validDiff = false
	}

	if validDiff == true {
		return s, nil
	} else {
		return "", errors.New("unknown difficulty level")
	}
}

func validateTopics(input []string, ts *TopicStore) ([]string, error) {
    var result []string
	validTopic := false

    for _, s := range input {
        // Check if the string exists in our list
		if _, ok := ts.topics[s]; ok {
        fmt.Printf("%s exist\n", s)
		result = append(result, s)
		validTopic = true
    	} else {
			validTopic = false
			break
		}
    }
	if validTopic == false {
		return nil, errors.New("unknown topic input")
	}
    return result, nil
}

func initQuestion() question{
	var quest_struct question
	quest_struct.Question_title = ""
	quest_struct.Question_description = ""
	quest_struct.Difficulty_level = ""
	quest_struct.Related_topic = []string{}
	quest_struct.Created_at = ""
	return quest_struct
}

func CreateQuestion(title *string, desc *string, diff string, topics []string, client *mongo.Client) {
	doc := initQuestion()
	topicstore := NewTopicStore()
	// validateTitle(title)
	validatedLevel, err := validateDifficulty(diff)
	if err != nil {
		fmt.Println("Validation Error:", err)
        return // Stop execution if the difficulty is invalid
    }

	validatedTopics, err := validateTopics(topics, topicstore)
	if err != nil {
		fmt.Println("Validation Error:", err)
        return // Stop execution if the difficulty is invalid
    }

	doc.Question_title = *title
	doc.Question_description = *desc
	doc.Difficulty_level = validatedLevel
	doc.Related_topic = validatedTopics
	doc.Created_at = time.Now().Format(time.DateTime)
	
	fmt.Printf("Inserting: \n")
	fmt.Printf("Title: %s\n", doc.Question_title)
	fmt.Printf("Desc: %s\n", doc.Question_description)
	fmt.Printf("Diff: %s\n", doc.Difficulty_level)
	fmt.Printf("Topics: %s\n", doc.Related_topic)
	fmt.Printf("createdAt: %s\n", doc.Created_at)

	// client := database.ConnectMongo()
	question_coll := client.Database("questionTestcaseDB").Collection(quest_col)
	result, err := question_coll.InsertOne(context.TODO(), doc)
	if err != nil {
		panic(err)
	}
	fmt.Printf("Inserted document with _id: %v\n", result.InsertedID)
}
