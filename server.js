const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');
const axios = require('axios');
const { get } = require('https');
const fs = require('fs').promises;

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Serve i file statici dalla cartella 'public'
app.use(express.static(path.join(__dirname, 'public')));

// Homepage
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "home.html"));
});

// Serve i file dalla cartella "assets" (per immagini)
app.use('/assets', express.static(path.join(__dirname, 'assets')));

// Serve i file dalla cartella "componenti" (per script JS)
app.use('/componenti', express.static(path.join(__dirname, 'componenti')));

// Gestione delle stanze e del mazzo di carte
const rooms = {};
const playerConnections = {};

// Crea un nuovo mazzo
async function createNewDeck() {
    try {
        const response = await axios.get('https://deckofcardsapi.com/api/deck/new/shuffle/?deck_count=1');
        return response.data;
    } catch (error) {
        console.error("Errore nella creazione del mazzo:", error);
    }
}

// Pesca le carte
async function drawCards(deckId, count) {
    try {
        const response = await axios.get(`https://deckofcardsapi.com/api/deck/${deckId}/draw/?count=${count}`);
        return response.data;
    } catch (error) {
        console.error("Errore nel pescaggio delle carte:", error);
    }
}

// Gestione delle connessioni WebSocket
wss.on("connection", (ws) => {
    console.log("Un nuovo giocatore si è connesso!");

    ws.on("message", async (message) => {
        const data = JSON.parse(message);
        switch (data.type) {
            case 'create-room':
                const deck = await createNewDeck();
                if (deck && deck.deck_id) {
                    rooms[data.roomId] = {
                        deckId: deck.deck_id,
                        players: [],
                        cardsDistributed: {},
                        conferma_pescata: [],
                        fish: []
                    };
                    console.log(`Stanza ${data.roomId} creata con mazzo ID: ${deck.deck_id}`);
                    ws.send(JSON.stringify({ type: 'room-created', roomId: data.roomId, success: true }));
                }
                break;

            case 'join-room':
                if (rooms[data.roomId]) {
                    rooms[data.roomId].players.push(data.playerName);
                    playerConnections[data.playerName] = ws;
                    rooms[data.roomId].fish.push(250);
                    console.log(`${data.playerName} si è unito alla stanza ${data.roomId}`,rooms);
                    wss.clients.forEach(client => {
                        if (client.readyState === WebSocket.OPEN) {
                            client.send(JSON.stringify({ type: 'room-joined', roomId: data.roomId, players: rooms[data.roomId].players, success:true}));
                        }
                    });
                } else {
                    ws.send(JSON.stringify({ type: 'error', message: 'Stanza non trovata' }));
                }
                break;
            
            case 'info-room':
                console.log(data)
                if (rooms[data.roomId]) {
                    ws.send(JSON.stringify({ type: 'room-informed', roomId: data.roomId, players: rooms[data.roomId].players, success: true }));
                } else {
                    ws.send(JSON.stringify({ type: 'error', message: 'Stanza non trovata' }));
                }
                break;

            case 'confirm-draw':
                console.log(data)
                if (rooms[data.roomId]) {
                    rooms[data.roomId].conferma_pescata.push(data.playerName);
                    console.log("pescato",rooms[data.roomId].conferma_pescata,rooms[data.roomId].players)
                    if (rooms[data.roomId].conferma_pescata.length === rooms[data.roomId].players.length){
                        console.log("ciao")
                        wss.clients.forEach(client => {
                            if (client.readyState === WebSocket.OPEN) {
                                client.send(JSON.stringify({ type: 'turno-server', roomId: data.roomId, player: rooms[data.roomId].players[0]}));
                            }
                        });
                    }
                } else {
                    ws.send(JSON.stringify({ type: 'error', message: 'Stanza non trovata' }));
                }
                break;

            case 'start-game':
                console.log(data)
                if (rooms[data.roomId]) {
                    wss.clients.forEach(client => {
                        if (client.readyState === WebSocket.OPEN) {
                            client.send(JSON.stringify({ type: 'start-game', roomId: data.roomId, success:true}));
                        }
                    });
                } else {
                    ws.send(JSON.stringify({ type: 'error', message: 'Stanza non trovata' }));
                }
                break;

            case 'turno-client':
                console.log(data)
                if (rooms[data.roomId]) {
                    const attuale = rooms[data.roomId].players.find(el => el === data.playerName);
                    const index = rooms[data.roomId].players.indexOf(attuale)
                    const next_player = (index + 1) % rooms[data.roomId].players.length;
                    wss.clients.forEach(client => {
                        if (client.readyState === WebSocket.OPEN) {
                            client.send(JSON.stringify({ type: 'turno-game', roomId: data.roomId, player_attuale:data.playerName, player_next:rooms[data.roomId].players[next_player], scelta:data.scelta}));
                        }
                    });
                } else {
                    ws.send(JSON.stringify({ type: 'error', message: 'Stanza non trovata' }));
                }
                break;

            case 'distribute-cards':
                console.log(data)
                const room = rooms[data.roomId];
                if (room) {
                    const cardsDataTavolo = await drawCards(room.deckId, 5);
                    const cardsData = await drawCards(room.deckId, room.players.length * 2);
                    if (cardsData && cardsData.cards) {
                        let index = 0;
                        room.players.forEach(player => {
                            room.cardsDistributed[player] = cardsData.cards.slice(index, index + 2);
                            index += 2;
                            const playerWs = playerConnections[player];
                            if (playerWs) {
                                console.log(player)
                                playerWs.send(JSON.stringify({
                                    type: 'cards-distributed',
                                    roomId: data.roomId,
                                    cards_player: room.cardsDistributed[player],
                                    cards_house: cardsDataTavolo.cards,
                                    turno: 0,
                                    carte_scoperte: [false,false,false,false,false]
                                }));
                            } else {
                                console.log(`Errore: connessione non trovata per ${playerName}`);
                            }
                        });
                    }
                } else {
                    ws.send(JSON.stringify({ type: 'error', message: 'Stanza non trovata' }));
                }
                break;

            default:
                ws.send(JSON.stringify({ type: 'error', message: 'Tipo di messaggio non valido' }));
        }
    });

    ws.on("close", () => {
        console.log("Un giocatore si è disconnesso");

    });
});

async function getConfiguration() {
    try {
        const conf = await fs.readFile(path.join(__dirname, 'public', 'conf.json'), 'utf-8');
        return JSON.parse(conf);
    } catch (error) {
        console.error("Errore durante il caricamento della configurazione:", error);
    }
}
// Imposta la porta per Heroku
async function startServer() {
    const conf = await getConfiguration();
    const PORT = conf.port;
    server.listen(PORT, () => {
        console.log(`Server in ascolto sulla porta ${PORT}`);
    });
}

startServer()
