const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const axios = require('axios');
const fs = require('fs').promises;

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const database = require("./database");
app.use(express.json());
database.createTable();

app.post("/insert", async (req, res) => {//per fare insert
    const poker = req.body.poker;
    try {
      await database.insert(poker);
      res.json({result: "ok"});
    } catch (e) {
      res.status(500).json({result: "ko"});
    }
  })

app.get('/poker', async (req, res) => {//per leggere 
    const list = await database.select();
    res.json(list);
});

app.post("/login", async (req, res) => {
    const { username, password } = req.body;

    try {
        // Controlla se il nome utente esiste nel database
        const result = await database.select();
        const user = result.find((u) => u.username === username);

        if (user && user.password === password) {
            // Se il nome utente e la password sono corretti
            res.json({ success: true });
        } else {
            // Se le credenziali non corrispondono
            res.json({ success: false, message: "Credenziali errate." });
        }
    } catch (error) {
        console.error("Errore nel login:", error);
        res.status(500).json({ success: false, message: "Errore interno del server." });
    }
});

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

// Gestione delle connessioni Socket.IO
io.on("connection", (socket) => {
    console.log("Un nuovo giocatore si è connesso!");
    socket.on("create-room", async (data) => {
        const deck = await createNewDeck();
        if (deck && deck.deck_id) {
            rooms[data] = {
                deckId: deck.deck_id,
                players: [],
                cardsDistributed: {},
                conferma_pescata: [],
                fish: []
            };
            socket.join(data); 
            console.log(rooms)
            console.log(`Stanza ${data} creata con mazzo ID: ${deck.deck_id}`);
            socket.emit('room-created', { roomId: data, success: true });
        }
    });

    socket.on("join-room", (data) => {
        console.log(data)
        if (rooms[data.roomId]) {
            rooms[data.roomId].players.push(data.codice);
            playerConnections[data.codice] = socket;
            rooms[data.roomId].fish.push(250);// sbagliato da sistemare
            socket.join(data.roomId);
            console.log(`${data.codice} si è unito alla stanza ${data.roomId}`, rooms);
            io.to(data.roomId).emit('room-joined', { roomId: data.roomId, players: rooms[data.roomId].players, success: true });
        } else {
            socket.emit('error', { message: 'Stanza non trovata' });
        }
    });

    socket.on("info-room", (data) => {
        if (rooms[data]) {
            socket.emit('room-informed', { roomId: data, players: rooms[data].players, success: true });
        } else {
            socket.emit('error', { message: 'Stanza non trovata' });
        }
    });

    socket.on("confirm-draw", (data) => {
        if (rooms[data.roomId]) {
            rooms[data.roomId].conferma_pescata.push(data.codice);
            if (rooms[data.roomId].conferma_pescata.length === rooms[data.roomId].players.length) {
                io.to(data.roomId).emit('turno-server', { roomId: data.roomId, player: rooms[data.roomId].players[0] });
            }
        } else {
            socket.emit('error', { message: 'Stanza non trovata' });
        }
    });

    socket.on("start-game", (data) => {
        if (rooms[data]) {
            io.to(data).emit('start-game', { roomId: data, success: true });
        } else {
            socket.emit('error', { message: 'Stanza non trovata' });
        }
    });

    socket.on("turno-client", (data) => {
        console.log(data,rooms)
        if (rooms[data.roomId]) {
            const currentPlayer = rooms[data.roomId].players.find(el => el === data.codice);
            const index = rooms[data.roomId].players.indexOf(currentPlayer);
            const nextPlayer = (index + 1) % rooms[data.roomId].players.length;
            io.to(data.roomId).emit('turno-game', {
                roomId: data.roomId,
                player_attuale: data.codice,
                player_next: rooms[data.roomId].players[nextPlayer],
                scelta: data.scelta
            });
        } else {
            socket.emit('error', { message: 'Stanza non trovata' });
        }
    });

    socket.on("distribute-cards", async (data) => {
        const room = rooms[data.roomId];
        if (room) {
            const cardsDataTavolo = await drawCards(room.deckId, 5);
            const cardsData = await drawCards(room.deckId, room.players.length * 2);
            if (cardsData && cardsData.cards) {
                let index = 0;
                room.players.forEach(player => {
                    room.cardsDistributed[player] = cardsData.cards.slice(index, index + 2);
                    index += 2;
                    const playerSocket = playerConnections[player];
                    if (playerSocket) {
                        playerSocket.emit('cards-distributed', {
                            roomId: data.roomId,
                            cards_player: room.cardsDistributed[player],
                            cards_house: cardsDataTavolo.cards,
                            turno: 0,
                            carte_scoperte: [false, false, false, false, false]
                        });
                    }
                });
            }
        } else {
            socket.emit('error', { message: 'Stanza non trovata' });
        }
    });

    socket.on("disconnect", () => {
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
    const PORT = conf.PORTA;
    server.listen(PORT, () => {
        console.log(`Server in ascolto sulla porta ${PORT}`);
    });
}

startServer();
