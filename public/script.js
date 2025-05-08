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

createNavigator(document.querySelector(".poker-table"));

function creaGiocatori(nome,players, showCards = false) {
    let html = '';
    players.forEach(player => {
        if(player.nome!=nome){
        html += `
            <div class="giocatore">
                <div class="nome">${player.nome}</div>
                <div class="${showCards ? 'carte' : 'puntata'}">
                    ${
                        showCards
                            ? `<img src="${player.carte[0]}" alt="Carta 1">
                               <img src="${player.carte[1]}" alt="Carta 2">`
                            : `${player.puntata} `
                    }
                </div>
                <div>💰</div>
            </div>
        `;}
    });

    document.getElementById('giocatori_container').innerHTML = html;
}

function aggiornaGiocatore(nomeGiocatore, nuovaPuntata, nomeGiocatoreDiTurno) {
    const giocatori = document.querySelectorAll('.giocatore');
    giocatori.forEach(giocatore => {
        const nome = giocatore.querySelector('.nome')?.textContent.trim();

        if (nome === nomeGiocatore) {
            const puntataDiv = giocatore.querySelector('.puntata');
            if (puntataDiv) {
                puntataDiv.textContent = nuovaPuntata;
            }
        }
        if (nome === nomeGiocatoreDiTurno) {
            giocatore.style.boxShadow = '0 0 15px 5px yellow';
        } else {
            giocatore.style.boxShadow = 'none';
        }
    });
}

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
        // Inizializza socket.io
        const socket = io();

        // Carica configurazione
        const conf = await getConfiguration();

        // Inizializza i componenti
        const Login = createLogin();
        const Register = createRegister();
        const GiocatoreComponent = createGiocatore(document.querySelector("#azioni_giocatore"));
        const Form_register = createFormRegister(document.querySelector("#formregister"));
        const Form_Login = createFormLogin(document.querySelector("#formlogin"));
        const Form_recupera = createFormRecupera(document.querySelector("#formrecupera"));
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

        //render giocatore
        GiocatoreComponent.render();

        //render stanza attesa
        StanzaAttesa.render();

        //render stanze
        Stanza.render(socket);

        
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
            window.location.href = "#stanza_attesa";
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
                console.log(nome)
                const puntate_iniziali = []
                response.giocatori.forEach(player =>{
                    puntate_iniziali.push({nome:player,puntata:0})
                })
                creaGiocatori(nome,puntate_iniziali)
                if (response.primo == nome){
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
            response.cards_house.forEach(carta_house => {
                template += `<img src="../assets/images/back-card.png"></img>`;
            });
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
            console.log(response)
            if ( response.success) {
                StanzaAttesa.avvia_partita(response,socket);
            }
        });
        
        socket.on("turno", (response) => {
            console.log("è il turno di: ",response.nome);
            const nome = sessionStorage.getItem("NAME");
            aggiornaGiocatore(response.ultimo,response.ultima_puntata,response.nome)
            if (response.nome == nome) {
                GiocatoreComponent.mio_turno(socket,response.ultima_puntata)
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
