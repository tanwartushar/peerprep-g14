package main

import (
	"github.com/tgonet/peerprep-g14/services/question-service/internal/database"
)

func main() {
	database.ConnectMongo()

}
