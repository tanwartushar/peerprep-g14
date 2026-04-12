package rediscache

import (
	// "net/http"
	// "log"

	// "github.com/gin-gonic/gin"
	// "github.com/gin-contrib/cors"
	// "github.com/tgonet/peerprep-g14/services/question-service"
	// "github.com/tgonet/peerprep-g14/services/question-service/handler"
	// "github.com/tgonet/peerprep-g14/services/question-service/internal/database"
	// "github.com/tgonet/peerprep-g14/services/question-service/question/repository"
	"go.mongodb.org/mongo-driver/v2/mongo"
	"github.com/redis/go-redis/v9"
)

func CacheTop5Matched(mongoclient *mongo.Client, redisclient *redis.Client)