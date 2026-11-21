package main

import (
	"log"
	"net/http"
	"os"

	"github.com/Jakubpoland/ZUS/backend/internal/httpapi"
	"github.com/Jakubpoland/ZUS/backend/internal/params"
)

func main() {
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}
	server := httpapi.New(params.NewStore(params.Default()))
	addr := ":" + port
	log.Printf("Zasiłkowy Przewodnik API listening on %s", addr)
	if err := http.ListenAndServe(addr, server.Handler()); err != nil {
		log.Fatal(err)
	}
}
