const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const axios = require('axios');
const nodemailer = require("nodemailer");
const fs = require('fs').promises;
const PokerEvaluator = require('poker-evaluator');
const bcrypt = require('bcrypt');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const database = require("./database");
app.use(express.json());
database.createTable();

async function Vincitore(tavolo, players) {

    // Converti le carte del tavolo nel formato corretto
    const tav = tavolo.map(t => t.code.replace("0", "T").toLowerCase());
    const valutazioni = [];
    // Costruisci le mani dei giocatori
    players.forEach((player, index) => {
        const mano = [
            player.cards[0].code.replace('0', 'T').toLowerCase(),
            player.cards[1].code.replace('0', 'T').toLowerCase(),
            ...tav
        ];
        const result = PokerEvaluator.evalHand(mano);
        valutazioni.push({
            nome: player.nome,
            valore: result.value,
            descrizione: result.handName,
            result:result,
            carte: mano
        });
    });

    // Trova il valore massimo tra tutti i giocatori
    const maxValore = Math.max(...valutazioni.map(v => v.valore));
    const vincitori = valutazioni.filter(v => v.valore === maxValore);

    console.log("Vincitori:", vincitori);
    return vincitori;
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
    poker.fiches = 500
    poker.password=await generapassword()
    try {
        inviaEmail(poker)
        const password_hash = await bcrypt.hash(poker.password, 10);
        poker.password = password_hash;
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
            socket.emit('room-created', { roomId: data.roomId, success: true });
        }
    });

    socket.on("join-room", (data) => {
        if (rooms[data.roomId] && rooms[data.roomId].avviata === false) {
            rooms[data.roomId].players.push(data.nome);
            rooms[data.roomId].in_gioco.push(true);
            rooms[data.roomId].mancaturno.push(true);
            rooms[data.roomId].giocata.push("none");
            rooms[data.roomId].fiches.push(500);
            playerConnections[data.nome] = socket;
            socket.join(data.roomId);
            io.to(data.roomId).emit('room-joined', { roomId: data.roomId, nameRoom:rooms[data.roomId].nameRoom, players: rooms[data.roomId].players, fiches: rooms[data.roomId].fiches, success: true });
        } else {
            socket.emit('room-joined-error');
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

    socket.on("giocata", async (data) => {
        const room = rooms[data.roomId];
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
                    if (room.in_gioco.filter(x => x === true).length !== 1)
                    {    if(controllo_mancanti===true){
                            if (ultimaGiocata!="check"){
                                if(room.mancaturno[room.players.length-1]===false){ // questo controlla se è il secondo giro, se si non si può più fare ne raise ne all in
                                    io.to(data.roomId).emit("turno", { nome: room.players[prossimo_giocatore],ultimo:data.nome, ultima_puntata: data.puntata+"fold",movimenti_non_permessi:["check","raise","all in"]});
                                }
                                else{
                                    io.to(data.roomId).emit("turno", { nome: room.players[prossimo_giocatore],ultimo:data.nome, ultima_puntata: data.puntata+"fold",movimenti_non_permessi:["check"]});
                                }  
                            }else{
                                io.to(data.roomId).emit("turno", { nome: room.players[prossimo_giocatore],ultimo:data.nome, ultima_puntata: data.puntata+"fold",movimenti_non_permessi:["call"]});
                            }
                        }
                        else{
                            for (let j = 0; j < room.players.length; j++) {//riattiva tutti i mancaturno perchè inizia un nuovo round
                                room.mancaturno[j]=true
                            }
                            if(room.coperte===5){//invio le prime 3 carte
                                room.coperte=2
                                io.to(data.roomId).emit("nuovecartetavolo", {carte:room.carte_tavolo.cards.slice(0,3)});
                                io.to(data.roomId).emit("turno", { nome: room.players[prossimo_giocatore],ultimo:data.nome, ultima_puntata: data.puntata+"fold",movimenti_non_permessi:["call"]});
                            }
                            else if(room.coperte===2){//invio quarta carta
                                room.coperte=1
                                io.to(data.roomId).emit("nuovecartetavolo", {carte:room.carte_tavolo.cards.slice(3,4)});
                                io.to(data.roomId).emit("turno", { nome: room.players[prossimo_giocatore],ultimo:data.nome, ultima_puntata: data.puntata+"fold",movimenti_non_permessi:["call"]});
                            }
                            else if(room.coperte===1){//invio ultima carta
                                room.coperte=0
                                io.to(data.roomId).emit("nuovecartetavolo", {carte:room.carte_tavolo.cards.slice(4,5)});
                                io.to(data.roomId).emit("turno", { nome: room.players[prossimo_giocatore],ultimo:data.nome, ultima_puntata: data.puntata+"fold",movimenti_non_permessi:["call"]});
                            }
                            else if(room.coperte===0){
                                const ragazzi_vincenti = []
                                room.in_gioco.forEach((giocatore,index)=>{
                                    if(giocatore===true){
                                        ragazzi_vincenti.push({nome:room.players[index],cards:room.cardsDistributed[room.players[index]]})
                                    }
                                })
                                const vincitore=Vincitore(room.carte_tavolo.cards,ragazzi_vincenti)
                                io.to(data.roomId).emit("fine-partita", { vincitore: vincitore,carte_giocatori:room.cardsDistributed, piatto_finale:room.piatto});
                            }
                        }
                    }
                    else{
                        room.in_gioco.forEach((g,index)=>{
                            if (g===true){
                                console.log(room.players[index])
                                io.to(data.roomId).emit("fine-partita", { vincitore: [{nome:room.players[index],descrizione:"fold"}],carte_giocatori:room.cardsDistributed, piatto_finale:room.piatto});
                            }
                        })
                    }}
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
                } 
                else if (data.giocata === "call"){
                    if (data.puntata >= room.ultima_puntata) {
                        room.ultima_puntata = data.puntata;
                        room.giocata[i] = data.giocata;
                        room.mancaturno[i] = false;
                        let controllo_mancanti = false;
                        for (let j = 0; j < room.players.length; j++) {// questo controlla se mancanano giocatori che devono fare il turno, se non mancano avvia il turno successivo
                            if (room.mancaturno[j]===true){
                                controllo_mancanti = true;
                            }
                        }
                        if(controllo_mancanti===true){
                            if(room.mancaturno[room.players.length-1]===false){ // questo controlla se è il secondo giro, se si non si può più fare ne raise ne all in
                                io.to(data.roomId).emit("turno", { nome: room.players[prossimo_giocatore],ultimo:data.nome, ultima_puntata: room.ultima_puntata,movimenti_non_permessi:["check","raise","all in"]});
                            }
                            else{
                                io.to(data.roomId).emit("turno", { nome: room.players[prossimo_giocatore],ultimo:data.nome, ultima_puntata: room.ultima_puntata,movimenti_non_permessi:["check"]});
                            }  
                        }
                        else{
                            for (let j = 0; j < room.players.length; j++) {//riattiva tutti i mancaturno perchè inizia un nuovo round
                                room.mancaturno[j]=true
                            }
                            if(room.coperte===5){//invio le prime 3 carte
                                room.coperte=2
                                io.to(data.roomId).emit("nuovecartetavolo", {carte:room.carte_tavolo.cards.slice(0,3)});
                                io.to(data.roomId).emit("turno", { nome: room.players[prossimo_giocatore],ultimo:data.nome, ultima_puntata: room.ultima_puntata,movimenti_non_permessi:["call"]});
                            }
                            else if(room.coperte===2){//invio quarta carta
                                room.coperte=1
                                io.to(data.roomId).emit("nuovecartetavolo", {carte:room.carte_tavolo.cards.slice(3,4)});
                                io.to(data.roomId).emit("turno", { nome: room.players[prossimo_giocatore],ultimo:data.nome, ultima_puntata: room.ultima_puntata,movimenti_non_permessi:["call"]});
                            }
                            else if(room.coperte===1){//invio ultima carta
                                room.coperte=0
                                io.to(data.roomId).emit("nuovecartetavolo", {carte:room.carte_tavolo.cards.slice(4,5)});
                                io.to(data.roomId).emit("turno", { nome: room.players[prossimo_giocatore],ultimo:data.nome, ultima_puntata: room.ultima_puntata,movimenti_non_permessi:["call"]});
                            }
                            else if(room.coperte===0){
                            const ragazzi_vincenti = []
                            room.in_gioco.forEach((giocatore,index)=>{
                                if(giocatore===true){
                                    ragazzi_vincenti.push({nome:room.players[index],cards:room.cardsDistributed[room.players[index]]})
                                }
                            })
                            const vincitore=Vincitore(room.carte_tavolo.cards,ragazzi_vincenti)
                            io.to(data.roomId).emit("fine-partita", { vincitore: vincitore,carte_giocatori:room.cardsDistributed, piatto_finale:room.piatto});
                        }
                        }
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
                            io.to(data.roomId).emit("turno", { nome: room.players[prossimo_giocatore],ultimo:data.nome, ultima_puntata: room.ultima_puntata,movimenti_non_permessi:["call"]});
                        }
                        else{
                            console.log("inizio nuovo turno dentro call")
                            for (let j = 0; j < room.players.length; j++) {//riattiva tutti i mancaturno perchè inizia un nuovo round
                                room.mancaturno[j]=true
                            }
                            if(room.coperte===5){//invio le prime 3 carte
                                room.coperte=2
                                io.to(data.roomId).emit("nuovecartetavolo", {carte:room.carte_tavolo.cards.slice(0,3)});
                                io.to(data.roomId).emit("turno", { nome: room.players[prossimo_giocatore],ultimo:data.nome, ultima_puntata: room.ultima_puntata,movimenti_non_permessi:["call"]});
                            }
                            else if(room.coperte===2){//invio quarta carta
                                room.coperte=1
                                io.to(data.roomId).emit("nuovecartetavolo", {carte:room.carte_tavolo.cards.slice(3,4)});
                                io.to(data.roomId).emit("turno", { nome: room.players[prossimo_giocatore],ultimo:data.nome, ultima_puntata: room.ultima_puntata,movimenti_non_permessi:["call"]});
                            }
                            else if(room.coperte===1){//invio ultima carta
                                room.coperte=0
                                io.to(data.roomId).emit("nuovecartetavolo", {carte:room.carte_tavolo.cards.slice(4,5)});
                                io.to(data.roomId).emit("turno", { nome: room.players[prossimo_giocatore],ultimo:data.nome, ultima_puntata: room.ultima_puntata,movimenti_non_permessi:["call"]});
                            }
                            else if(room.coperte===0){
                                const ragazzi_vincenti = []
                                room.in_gioco.forEach((giocatore,index)=>{
                                    if(giocatore===true){
                                        ragazzi_vincenti.push({nome:room.players[index],cards:room.cardsDistributed[room.players[index]]})
                                    }
                                })
                                const vincitore=await Vincitore(room.carte_tavolo.cards,ragazzi_vincenti)
                                console.log("vincitore dentro partita: ",vincitore)
                                io.to(data.roomId).emit("fine-partita", { vincitore: vincitore,carte_giocatori:room.cardsDistributed, piatto_finale:room.piatto});
                        }
                        }
                }

                room.piatto += parseInt(data.puntata);

            }
        }
    });

    socket.on("nuova_partita", async(data) => {
        const roomId = data.roomId;
        const room = rooms[roomId];

        // Crea nuovo mazzo
        const deck = await createNewDeck();
        if (!deck || !deck.deck_id) {
            return socket.emit("errore", { messaggio: "Errore nella creazione del mazzo" });
        }

        //Reset stanza e assegna nuovo mazzo
        rooms[roomId] = {
            ...room,
            deckId: deck.deck_id,
            cardsDistributed: {},
            conferma_pescata: [],
            giocata: [],
            in_gioco: [],
            mancaturno: [],
            ultima_puntata: 0,
            piatto: 0,
            avviata: false,
            partite_giocate: room.partite_giocate + 1,
            coperte: 5,
            carte_tavolo: [],
            fiches: []
        };

        rooms[roomId].players.forEach(pl=>{
            rooms[data.roomId].in_gioco.push(true);
            rooms[data.roomId].mancaturno.push(true);
            rooms[data.roomId].giocata.push("none");
            rooms[data.roomId].fiches.push(500);
        })
        io.to(data.roomId).emit('rinizio-partita', { roomId: data.roomId, nameRoom:rooms[data.roomId].nameRoom, players: rooms[data.roomId].players, fiches: rooms[data.roomId].fiches, success: true });
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
