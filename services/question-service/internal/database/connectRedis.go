package database

import (
	"context"
	"fmt"
	"os"

	"github.com/redis/go-redis/v9"
)

func RedisConnect() *redis.Client{
	ctx := context.Background()

	addr := os.Getenv("REDIS_ADDR")
	username := os.Getenv("REDIS_USERNAME")
	pw := os.Getenv("REDIS_PW")

	rdb := redis.NewClient(&redis.Options{
		Addr:     addr,
		Username: username,
		Password: pw,
		DB:       0,
	})

	rdb.Set(ctx, "foo", "bar", 0)
	result, err := rdb.Get(ctx, "foo").Result()

	if err != nil {
		panic(err)
	}
	defer func() {
        if err := rdb.Close(); err != nil {
            fmt.Printf("Error closing Redis: %v\n", err)
        }
    }()

	fmt.Println(result) // >>> bar
	return rdb
}
