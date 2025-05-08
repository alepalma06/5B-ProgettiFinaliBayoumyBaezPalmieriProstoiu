const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const axios = require('axios');
const nodemailer = require("nodemailer");
const fs = require('fs').promises;
const { Hand } = require('pokersolver');
const bcrypt = require('bcrypt');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const database = require("./database");
app.use(express.json());
database.createTable();

async function vincitore(tavolo,players) {
    const giocatori_in_finale = []
    players.forEach((player,index)=>{
        giocatori_in_finale[index]= Hand.solve([player.cards[0],player.cards[1],tavolo]);
    })
    const winners = Hand.winners(giocatori_in_finale);
    console.log(winners)
}

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
        inviaEmail(poker)
        console.log(poker)
        console.log("spazio")
        console.log(poker.password)
        const password_hash = await bcrypt.hash(poker.password, 10);
        poker.password = password_hash;
        console.log(password_hash)
        await database.insert(poker);
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
        const result = await database.select(); // seleziona tutti gli utenti
        const user = result.find(u => u.username === username); // trova l'utente con quello username

        if (user) {
            const match = await bcrypt.compare(password, user.password); // confronto con bcrypt
            if (match) {
                res.json({ success: true }); // login ok
            } else {
                res.json({ success: false, message: "Password errata." }); // password sbagliata
            }
        } else {
            res.json({ success: false, message: "Utente non trovato." }); // username non trovato
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
                mancaturno:[],
                ultima_puntata: 0,
                piatto: 0,
                avviata: false,
                partite_giocate: 0,
                coperte: 5,
                carte_tavolo:[],
                fiches: [],
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
            rooms[data.roomId].mancaturno.push(true);
            rooms[data.roomId].giocata.push("none");
            rooms[data.roomId].fiches.push(500);
            playerConnections[data.nome] = socket;
            socket.join(data.roomId);
            console.log(`${data.nome} si è unito alla stanza ${data.roomId}`, rooms);
            io.to(data.roomId).emit('room-joined', { roomId: data.roomId, nameRoom:rooms[data.roomId].nameRoom, players: rooms[data.roomId].players, fiches: rooms[data.roomId].fiches, success: true });
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
            io.to(data).emit('start-game', { roomId: data, primo:rooms[data].players[primo_giocatore_index], giocatori:rooms[data].players,movimenti_non_permessi:["check"], success: true });
        } else {
            socket.emit('error', { message: 'Stanza non trovata' });
        }
    });

    socket.on("distribute-cards", async (data) => {
        const room = rooms[data.roomId];
        if (room) {
            const cardsDataTavolo = await drawCards(room.deckId, 5);
            room.carte_tavolo=cardsDataTavolo
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
        console.log(room,data)
        for (let i = 0; i < room.players.length; i++) {
            if (room.players[i] === data.nome) {
                let prossimo_giocatore = (i + 1) % room.players.length;// decide il prossimo giocatore
                while (room.in_gioco[prossimo_giocatore] === false) {
                    prossimo_giocatore = (prossimo_giocatore + 1) % room.players.length; // verifica che il prossimo giocatore non abbia abbandonato se no passa al succesivo
                }
                if (data.giocata === "fold") {
                    room.giocata[i] = data.giocata;
                    room.in_gioco[i] = false;
                    room.mancaturno[i] = false;

                    //trova l'ultima mossa non fold
                    let ultimaGiocata;
                    const numGiocatori = room.players.length;
                    let j = i;

                    for (let k = 1; k < numGiocatori; k++) {
                        j = (j - 1 + numGiocatori) % numGiocatori; // scorrimento circolare indietro
                        let giocata = room.giocata[j];
                        if (giocata && giocata !== "fold") {
                            ultimaGiocata = giocata;
                            break;
                        }
                    }

                    let controllo_mancanti = false;
                    for (let j = 0; j < room.players.length; j++) {// questo controlla se mancanano giocatori che devono fare il turno, se non mancano avvia il turno successivo
                        if (room.mancaturno[j]===true){
                            controllo_mancanti = true;
                        }
                    }
                    if(controllo_mancanti===true){
                        if (ultimaGiocata!="check"){
                            if(room.mancaturno[room.player.length-1]===false){ // questo controlla se è il secondo giro, se si non si può più fare ne raise ne all in
                                io.to(data.roomId).emit("turno", { nome: room.players[prossimo_giocatore],ultimo:data.nome, ultima_puntata: "fold",movimenti_non_permessi:["check","raise","all in"]});
                            }
                            else{
                                io.to(data.roomId).emit("turno", { nome: room.players[prossimo_giocatore],ultimo:data.nome, ultima_puntata: "fold",movimenti_non_permessi:["check"]});
                            }  
                        }else{
                            io.to(data.roomId).emit("turno", { nome: room.players[prossimo_giocatore],ultimo:data.nome, ultima_puntata: "fold",movimenti_non_permessi:[]});
                        }
                    }
                    else{
                        for (let j = 0; j < room.players.length; j++) {//riattiva tutti i mancaturno perchè inizia un nuovo round
                            room.mancaturno[j]=true
                        }
                        if(room.coperte===5){//invio le prime 3 carte
                            room.coperte=2
                            io.to(data.roomId).emit("nuovecartetavolo", {carte:room.carte_tavolo.cards.slice(0,3)});
                            io.to(data.roomId).emit("turno", { nome: room.players[prossimo_giocatore],ultimo:data.nome, ultima_puntata: "fold",movimenti_non_permessi:[],});
                        }
                        else if(room.coperte===2){//invio quarta carta
                            room.coperte=1
                            io.to(data.roomId).emit("nuovecartetavolo", {carte:room.carte_tavolo.cards.slice(3,4)});
                            io.to(data.roomId).emit("turno", { nome: room.players[prossimo_giocatore],ultimo:data.nome, ultima_puntata: "fold",movimenti_non_permessi:[],});
                        }
                        else if(room.coperte===2){//invio ultima carta
                            room.coperte=0
                            io.to(data.roomId).emit("nuovecartetavolo", {carte:room.carte_tavolo.cards.slice(4,5)});
                            io.to(data.roomId).emit("turno", { nome: room.players[prossimo_giocatore],ultimo:data.nome, ultima_puntata: "fold",movimenti_non_permessi:[]});
                        }
                    }
                    console.log(room)
                } 
                else if (data.giocata === "allin") {
                    room.giocata[i] = data.giocata;
                    room.in_gioco[i] = false;
                    room.mancaturno[i] = false;
                    if ( data.puntata >= room.ultima_puntata) {
                        room.ultima_puntata = data.puntata;
                    }// manca gestione all_in minore del ultima puntata
                    for (let j = 0; j < room.players.length; j++) {// riattiva gli altri giocatori
                        if(room.in_gioco[j]===true && i != j){
                            room.mancaturno[j] = true;
                        }
                    }
                    if(i != room.players.length-1){
                        io.to(data.roomId).emit("turno", { nome: room.players[prossimo_giocatore],ultimo:data.nome, ultima_puntata: room.ultima_puntata,movimenti_non_permessi:["check"]});
                    }
                    else{
                        io.to(data.roomId).emit("turno", { nome: room.players[prossimo_giocatore],ultimo:data.nome, ultima_puntata: room.ultima_puntata,movimenti_non_permessi:["check","raise","all in"]});
                    }
                    console.log(room)
                } 
                else if (data.giocata === "call"){
                    if (data.puntata >= room.ultima_puntata) {
                        console.log("ciaoioiioi")
                        room.ultima_puntata = data.puntata;
                        room.giocata[i] = data.giocata;
                        room.mancaturno[i] = false;
                        console.log(room,"prima di call")
                        let controllo_mancanti = false;
                        for (let j = 0; j < room.players.length; j++) {// questo controlla se mancanano giocatori che devono fare il turno, se non mancano avvia il turno successivo
                            if (room.mancaturno[j]===true){
                                controllo_mancanti = true;
                            }
                        }
                        if(controllo_mancanti===true){
                            if(room.mancaturno[room.players.length-1]===false){ // questo controlla se è il secondo giro, se si non si può più fare ne raise ne all in
                                io.to(data.roomId).emit("turno", { nome: room.players[prossimo_giocatore],ultimo:data.nome, ultima_puntata: "call",movimenti_non_permessi:["check","raise","all in"]});
                            }
                            else{
                                io.to(data.roomId).emit("turno", { nome: room.players[prossimo_giocatore],ultimo:data.nome, ultima_puntata: "call",movimenti_non_permessi:["check"]});
                            }  
                        }
                        else{
                            console.log("inizio nuovo turno dentro call")
                            for (let j = 0; j < room.players.length; j++) {//riattiva tutti i mancaturno perchè inizia un nuovo round
                                room.mancaturno[j]=true
                            }
                            if(room.coperte===5){//invio le prime 3 carte
                                room.coperte=2
                                io.to(data.roomId).emit("nuovecartetavolo", {carte:room.carte_tavolo.cards.slice(0,3)});
                                io.to(data.roomId).emit("turno", { nome: room.players[prossimo_giocatore],ultimo:data.nome, ultima_puntata: "call",movimenti_non_permessi:[]});
                            }
                            else if(room.coperte===2){//invio quarta carta
                                room.coperte=1
                                io.to(data.roomId).emit("nuovecartetavolo", {carte:room.carte_tavolo.cards.slice(3,4)});
                                io.to(data.roomId).emit("turno", { nome: room.players[prossimo_giocatore],ultimo:data.nome, ultima_puntata: "call",movimenti_non_permessi:[]});
                            }
                            else if(room.coperte===2){//invio ultima carta
                                room.coperte=0
                                io.to(data.roomId).emit("nuovecartetavolo", {carte:room.carte_tavolo.cards.slice(4,5)});
                                io.to(data.roomId).emit("turno", { nome: room.players[prossimo_giocatore],ultimo:data.nome, ultima_puntata: "call",movimenti_non_permessi:[]});
                            }
                        }
                        console.log(room,"dopo call")
                    }// manca gestione all_in minore del ultima puntata
    
                }


                else if (data.giocata === "raise"){
                    if (data.puntata > room.ultima_puntata) {
                        room.ultima_puntata = data.puntata;
                        room.giocata[i] = data.giocata;
                        room.mancaturno[i] = false;
                        for (let j = 0; j < room.players.length; j++) {// riattiva gli altri giocatori
                            if(room.in_gioco[j]===true && i != j){
                                room.mancaturno[j] = true;
                            }
                        }
                        if(room.mancaturno[room.players.length-1]===false){ // questo controlla se è il secondo giro, se si non si può più fare ne raise ne all in
                            io.to(data.roomId).emit("turno", { nome: room.players[prossimo_giocatore],ultimo:data.nome, ultima_puntata: room.ultima_puntata,movimenti_non_permessi:["check","raise","all in"]});
                        }
                        else{
                            io.to(data.roomId).emit("turno", { nome: room.players[prossimo_giocatore],ultimo:data.nome, ultima_puntata: room.ultima_puntata,movimenti_non_permessi:["check"]});
                        }  
                    }// manca gestione all_in minore del ultima puntata
                    console.log(room)
                }

                else if (data.giocata === "check"){
                        room.ultima_puntata = data.puntata;
                        room.giocata[i] = data.giocata;
                        room.mancaturno[i] = false;
                        let controllo_mancanti
                        for (let j = 0; j < room.players.length; j++) {// questo controlla se mancanano giocatori che devono fare il turno, se non mancano avvia il turno successivo
                            if (room.mancaturno[j]===true){
                                controllo_mancanti = true;
                            }
                        }
                        if(controllo_mancanti===true){
                            io.to(data.roomId).emit("turno", { nome: room.players[prossimo_giocatore],ultimo:data.nome, ultima_puntata: "fold",movimenti_non_permessi:["call"]});
                        }
                        console.log(room)
                }

                room.piatto += data.puntata;

                

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
