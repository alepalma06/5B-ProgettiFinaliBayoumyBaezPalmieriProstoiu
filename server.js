const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const axios = require('axios');
const nodemailer = require("nodemailer");
const fs = require('fs').promises;

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const database = require("./database");
app.use(express.json());
database.createTable();

async function getConfiguration() {
    try {
        const conf = await fs.readFile(path.join(__dirname, 'public', 'conf.json'), 'utf-8');
        return JSON.parse(conf);
    } catch (error) {
        console.error("Errore durante il caricamento della configurazione:", error);
    }
}

async function create_trasporter(){
    const conf = await getConfiguration();
    const transporter = nodemailer.createTransport({
        host: "smtp.ionos.it",     
        port: 587,                      
        secure: false,                   
        auth: {
          user: conf.mail,
          pass: conf.pass
        }
    })
    return transporter
}

app.post("/insert", async (req, res) => {//per fare insert
    const poker = req.body;
    console.log(poker)
    poker.fiches = 500
    poker.password=await generapassword()
    try {
        await database.insert(poker);
        inviaEmail(poker)
        res.json({result: "ok"});
    } catch (e) {
        res.status(500).json({result: "ko"});
    }
  })

  app.post("/delete", async (req, res) => {//per fare remove
    const poker = req.body;
    console.log(poker)
    try {
        await database.delete(poker.username,poker.email);
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
            rooms[data.roomId] = {
                deckId: deck.deck_id,
                nameRoom: data.nomeStanza,
                players: [],
                cardsDistributed: {},
                conferma_pescata: [],
                giocata: [],
                in_gioco: [],
                ultima_puntata: 0,
                piatto: 0,
                avviata: false,
                partite_giocate: 0,
                coperte: [true,true,true],
            };
            socket.join(data.roomId); 
            console.log(rooms)
            console.log(`Stanza ${data.roomId} creata con mazzo ID: ${deck.deck_id}`);
            socket.emit('room-created', { roomId: data.roomId, success: true });
        }
    });

    socket.on("join-room", (data) => {
        console.log(data)
        if (rooms[data.roomId] && rooms[data.roomId].avviata === false) {
            rooms[data.roomId].players.push(data.nome);
            rooms[data.roomId].in_gioco.push(true);
            rooms[data.roomId].giocata.push("none");
            playerConnections[data.nome] = socket;
            socket.join(data.roomId);
            console.log(`${data.nome} si è unito alla stanza ${data.roomId}`, rooms);
            io.to(data.roomId).emit('room-joined', { roomId: data.roomId, nameRoom:rooms[data.roomId].nameRoom, players: rooms[data.roomId].players, success: true });
        } else {
            socket.emit('room-joined-error');
            console.log(`${data.nome} ha tentato di unirsi alla stanza ${data.roomId} ma la partita è già iniziata`);
            socket.emit('error', { message: 'La partita è già iniziata' });
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
            rooms[data].avviata = true;
            const primo_giocatore_index = rooms[data].partite_giocate % rooms[data].players.length;
            io.to(data).emit('start-game', { roomId: data, primo:rooms[data].players[primo_giocatore_index], giocatori:rooms[data].players, success: true });
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
                        });
                    }
                });
            }
        } else {
            socket.emit('error', { message: 'Stanza non trovata' });
        }
    });

    socket.on("giocata", (data) => {
        const room = rooms[data.roomId];
        console.log(room)
        for (let i = 0; i < room.players.length; i++) {
            if (room.players[i] === data.nome) {
                if (data.giocata === "fold") {
                    room.giocata[i] = data.giocata;
                    room.in_gioco[i] = false;
                } else if (data.giocata === "allin") {
                    room.giocata[i] = data.giocata;
                    room.in_gioco[i] = false;
                    if ( data.puntata >= room.ultima_puntata) {
                        room.ultima_puntata = data.puntata;
                    }
                } else {
                    if (data.puntata > room.ultima_puntata) {
                        room.ultima_puntata = data.puntata;
                        room.giocata[i] = data.puntata;
                    }
                }
                room.piatto += data.puntata;
                let prossimo_giocatore = (i + 1) % room.players.length;
                while (room.in_gioco[prossimo_giocatore] === false) {
                    prossimo_giocatore = (prossimo_giocatore + 1) % room.players.length;
                }

                io.to(data.roomId).emit("turno", { nome: room.players[prossimo_giocatore],ultimo:data.nome, ultima_puntata: room.ultima_puntata });

            }
        }
    });


    socket.on("disconnect", () => {
        console.log("Un giocatore si è disconnesso");
    });
});

const generapassword = async ()=>{
    let password = await fetch("https://makemeapassword.ligos.net/api/v1/pronounceable/json?")
    password=await password.json()
    return password.pws[0]
}

const inviaEmail = async (body) =>{
    const transporter = await create_trasporter()
    const mailOptions = {
        from: '"Babapapr.it" <poker@babapapr.it>',
        to: body.email,
        subject: "La tua nuova password",
        text: `Ciao ${body.username}!\n\nEcco la tua nuova password: ${body.password}`
      };
      
      // Invio
      transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
          return console.error("Errore invio:", error);
        }
        console.log("Email inviata:", info.response);
      });
}


async function startServer() {
    const conf = await getConfiguration();
    const PORT = conf.PORTA;
    server.listen(PORT, () => {
        console.log(`Server in ascolto sulla porta ${PORT}`);
    });
}

startServer();
