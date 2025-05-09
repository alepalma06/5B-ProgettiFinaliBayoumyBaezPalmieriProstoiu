import { createFormLogin } from "/componenti/form_login.js";
import { createLogin } from "/componenti/login.js";
import { createNavigator } from "/componenti/navigator.js"
import { ScrollBarComponent } from "/componenti/turni_scrollbar.js";
import { createFormRegister } from "/componenti/form_register.js";
import { createRegister } from "/componenti/register.js";
import { createFormRecupera } from "/componenti/form_recupera.js";
import { createGiocatore } from "/componenti/giocatore.js";
import { generatePubSub } from "/componenti/pub_sub.js";
import { createStanzaAttesa } from "/componenti/stanza_attesa.js";
import { createStanze } from "/componenti/crea_stanza.js";
import { createPartita } from "/componenti/partita.js";


createNavigator(document.querySelector(".poker-table"));
// Inizializza socket.io
const socket = io();

async function getConfiguration() {
    try {
        const response = await fetch("conf.json");
        return await response.json();
    } catch (error) {
        console.error("Errore durante il caricamento della configurazione:", error);
    }
}

async function initialize() {
    try {

        // Carica configurazione
        const conf = await getConfiguration();

        // Inizializza i componenti
        const Login = createLogin();
        const Register = createRegister();
        const Partita = createPartita(document.querySelector("#partita"))

        //render partita tocca farlo prima di giocatore perchè usa div che crea partita
        Partita.render();

        const GiocatoreComponent = createGiocatore(document.querySelector("#azioni_giocatore"));
        const Form_register = createFormRegister(document.querySelector("#register-container"));
        const Form_Login = createFormLogin(document.querySelector("#login-container"));
        const Form_recupera = createFormRecupera(document.querySelector("#recupera-container"));
        const StanzaAttesa = createStanzaAttesa(document.querySelector("#stanza_attesa_container"));
        const Stanza = createStanze(document.querySelector("#stanze_container"));
        const PubSub = generatePubSub();

        const scrollbar = ScrollBarComponent(document.querySelector("#turni"));

        //render login 
        Form_Login.render(Login);
        
        //render registrazione
        Form_register.render(Register);

        //render recupera password
        Form_recupera.render(Register);

        //render stanza attesa
        StanzaAttesa.render();

        //render stanze
        Stanza.render(socket);

        //render giocatore
        GiocatoreComponent.render();

        
        socket.on("connect", () => {
            console.log("Connesso al server");
        });
        
        // Ascolta "room-created"
        socket.on("room-created", (data) => {
            console.log(`Stanza creata con ID: ${data.roomId}`);
            const roomId = data.roomId;
            const nome = sessionStorage.getItem("NAME");
            sessionStorage.setItem("currentRoom", roomId);
            socket.emit("join-room", { roomId, nome });
        });
        
        // Ascolta "room-joined"
        socket.on("room-joined", (response) => {
            StanzaAttesa.entra_in_stanza(response,socket);
            for (let i = 0; i < response.players.length; i++) {
                if (response.players[i] === sessionStorage.getItem("NAME")) {
                    GiocatoreComponent.aggiorna_fiches(response.fiches[i]);
                    break;
                }
            }
        });
        
        socket.on("room-joined-error", () => {
            Stanza.errore();
        });
        
        
        // Ascolta "start-game"
        socket.on("start-game", (response) => {
            if (response.success) {
                console.log("Partita iniziata con successo", response);
                console.log("Partita iniziata è il turno di: ",response.primo);
                window.location.href = "#partita";
                const nome = sessionStorage.getItem("NAME");
                const puntate_iniziali = []
                response.giocatori.forEach(player =>{
                    puntate_iniziali.push({nome:player,puntata:0})
                })
                Partita.creaGiocatori(puntate_iniziali)
                Partita.aggiornaGiocatore(nome, 0, nome)
                if (response.primo == nome){
                    GiocatoreComponent.movimenti_non_permessi(response.movimenti_non_permessi)
                    GiocatoreComponent.mio_turno(socket,0)
                }
            } else {
                console.error("Errore nell'inizio della partita");
            }
        });
        
        // Ascolta "cards-distributed"
        socket.on("cards-distributed", (response) => {
            const carte_house = document.querySelector("#carte_house");
            const carte_mano = document.querySelector("#carte_mano");
            let template = "";
            for(let i = 0; i<5; i++) {
                template += `<img class="cartecoperte" src="../assets/images/back-card.png"></img>`;
            };
            carte_house.innerHTML = template;
            template = "";
            response.cards_player.forEach(carta_mano => {
                template += `<img src="${carta_mano.image}"></img>`;
            });
            carte_mano.innerHTML = template;
        
            const roomId = sessionStorage.getItem("currentRoom");
            const nome = sessionStorage.getItem("NAME");
            const codice = `${nome}`;
        
            socket.emit("confirm-draw", {roomId, codice});
        });
        
        socket.on('room-informed', (response) => {
            if ( response.success) {
                StanzaAttesa.avvia_partita(response,socket);
            }
        });
        
        socket.on("turno", (response) => {
            const ultima_puntata= response.ultima_puntata.toString()
            const nome = sessionStorage.getItem("NAME");
            if (ultima_puntata.includes("fold")){
                Partita.aggiornaGiocatore(response.ultimo,"fold",response.nome)
                response.ultima_puntata=parseInt(response.ultima_puntata.replace("fold",""));
            }
            else{
                Partita.aggiornaGiocatore(response.ultimo,response.ultima_puntata,response.nome)
                response.ultima_puntata=parseInt(response.ultima_puntata);
            }
            if (response.nome == nome) {
                GiocatoreComponent.movimenti_non_permessi(response.movimenti_non_permessi)
                GiocatoreComponent.mio_turno(socket,response.ultima_puntata)
            }
        });

        socket.on("nuovecartetavolo", (response) => {
            const tavolo = document.querySelector("#carte_house");
            response.carte.forEach((carta, index) => {
                const carta_tavolo = tavolo.querySelectorAll(".cartecoperte")[index];
                if (carta_tavolo) {
                    carta_tavolo.className = "cartescoperte"; // cambia la classe
                    carta_tavolo.src = carta.image; // imposta il nuovo src (assicurati che carta.img sia corretto)
                }
            });
        });
        
        socket.on("fine-partita", (response) => {
            let name = sessionStorage.getItem("NAME")
            let players = Object.entries(response.carte_giocatori).map(([nome, carte]) => {
            return {
                nome,
                carte: carte.map(c => c.image)
            };
            });
            Partita.creaGiocatori(players,true)
            const finePartita = document.querySelector('.fine-partita');
            if (finePartita) {
                finePartita.classList.remove('hidden');
                finePartita.classList.add('visible');
                finePartita.style.display="flex"
            } else {
                console.error("Elemento #fine-partita non trovato nel DOM.");
            }
            const div_vincitore=document.querySelector(".titolo-fine")
            const div_mano=document.querySelector(".mano-vincente")
            console.log(div_mano,div_vincitore)
            let text = "";
            response.vincitore.forEach(v=>{
                if(text===""){
                    text+=v.nome
                }
                else{
                    text+=" pareggio con "+v.nome
                }
            })
            div_vincitore.innerText="Vincitore: "+text
            div_mano.innerText="Vinto con: "+response.vincitore[0].descrizione
            const riinizia = document.querySelector("#torna_attesa")
            const roomId = sessionStorage.getItem("currentRoom")
            riinizia.onclick=()=>{
                socket.emit("nuova_partita", {roomId});
            }
            if(name===vincitore){
                GiocatoreComponent.aggiorna_fiches(response.piatto_finale)
            }
        });

        socket.on("rinizio-partita", (response) => {
            const finePartita = document.querySelector('.fine-partita');
            if (finePartita) {
                finePartita.classList.add('hidden');
                finePartita.classList.remove('visible');
                finePartita.style.display="none"
            }
            StanzaAttesa.entra_in_stanza(response,socket);
            for (let i = 0; i < response.players.length; i++) {
                if (response.players[i] === sessionStorage.getItem("NAME")) {
                    GiocatoreComponent.aggiorna_fiches(response.fiches[i]);
                    break;
                }
            }
        });

        socket.on("disconnect", () => {
            console.log("Connessione chiusa");
        });
        
        socket.on("error", (error) => {
            console.error("Errore Socket.IO:", error);
        });

    } catch (error) {
        console.error("Errore durante l'inizializzazione:", error);
    }
}


initialize();
