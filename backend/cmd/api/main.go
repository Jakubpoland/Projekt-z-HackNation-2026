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
	// HOST puste zostawia nasłuch na wszystkich interfejsach (jak dotychczas).
	// Na serwerze ustaw HOST=127.0.0.1, żeby API było tylko za reverse proxy.
	addr := os.Getenv("HOST") + ":" + port
	log.Printf("Zasiłkowy Przewodnik API listening on %s", addr)
	if err := http.ListenAndServe(addr, server.Handler()); err != nil {
		log.Fatal(err)
	}
}
