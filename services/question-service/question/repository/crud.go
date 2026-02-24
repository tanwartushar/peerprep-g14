package main

import (
	"time"
)

type difficulty int
type topic int

const (
	Easy difficulty = iota
	Medium
	Hard
)

const (
	binary_search topic = iota
	depth_first_search
	breadth_first_search
	singly_linked_list
	doubly_linked_list
)

type question struct {
	uid                  string
	question_title       string
	question_description string
	difficulty_level     difficulty
	related_topic        topic
	created_at           time.Time
	// image_url
}

func CreateQuestion() {

}

func main() {

}
