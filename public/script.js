import { generateFetchComponent } from "/componenti/fetch_component.js";
import { createFormLogin } from "/componenti/form_login.js";
import { createLogin } from "/componenti/login.js";
import { createNavigator } from "/componenti/navigator.js"
import { socketMiddleware } from "/componenti/middleware.js";
import { ScrollBarComponent } from "/componenti/turni_scrollbar.js";

const socket = io();
const scrollbar=ScrollBarComponent(document.querySelector("#turni"))
// Quando il WebSocket si apre, inizializza il middleware
socket.onopen = () => {
    console.log("Connesso al server");

    // Inizializza il middleware con il socket
    const socketHandler = socketMiddleware(socket);

    // Esegui azioni sul socket (esempio di creazione stanza e unione)
    const createButton = document.querySelector("#crea_stanza");
    const joinButton = document.querySelector("#entra_stanza");
    const roomInput = document.querySelector("#codice_stanza");
    const inizia_partita = document.querySelector(".inizia_partita")

    // Crea una nuova stanza
    createButton.addEventListener("click", () => {
        window.location.href = "#stanza_attesa";
        document.querySelector(".inizia_partita").classList.remove("d-none")
        const roomId = roomInput.value.trim();
        socketHandler.createRoom(roomId);
        sessionStorage.setItem("currentRoom", roomId);
        console.log(`Stanza creata con ID: ${roomId}`);
    });

    // Unisciti a una stanza esistente
    joinButton.addEventListener("click", () => {
        window.location.href = "#stanza_attesa";
        const roomId = roomInput.value.trim();
        let Nome = document.querySelector("#nome").value;
        let Password = document.querySelector("#password").value;
        let codice = Nome + "-" + Password;

        socketHandler.joinRoom(roomId, codice);
        sessionStorage.setItem("currentRoom", roomId);
        console.log(`Unito alla stanza con ID: ${roomId}`);
    });

    inizia_partita.addEventListener("click", () => {
        const roomId = roomInput.value.trim();
        socketHandler.infoRoom(roomId)
    });

    // Gestisci le risposte dal server (per esempio, dopo aver creato una stanza o unito una stanza)
    socketHandler.onReceiveMessage((response) => {
        console.log("Risposta dal server:", response);
        let Nome = document.querySelector("#nome").value;
        let Password = document.querySelector("#password").value;
        let codice = Nome + "-" + Password;
        let roomId = roomInput.value.trim();
        let turnoAttuale = null;
        // Gestisci la risposta, come visualizzare un messaggio o eseguire altre azioni
        if (response.success) {
            console.log("Azione completata con successo:", response);
        } if (response.success && response.players!=undefined && response.type==='room-joined'){
            const player_waiting = document.querySelector(".players_waiting")
            let template = '<table id="table_waiting" class="table table-borderless"><thead><tr><td>Players</td></tr></thead><tbody>%td</tbody></table>'
            let lista_p = ""
            response.players.forEach(player => {
                let t = '<tr><td>%nome</td></tr>'
                t=t.replace("%nome",player)
                lista_p+=t
            });
            template=template.replace("%td",lista_p)
            console.log(template)
            player_waiting.innerHTML=template
        }
        else if (response.type === 'room-informed' && response.success) {
            // Stanza creata con successo, ora unisciti
            console.log(`Stanza giocatori: ${response.players}`);
            let errorMessage = document.getElementById("error-message");
            if (response.players.length>=2 && response.players.length<=10){
                errorMessage.textContent = "";
                errorMessage.style.display = "none";
                const roomId = roomInput.value.trim();
                socketHandler.startGame(roomId)
                socketHandler.distributeCards(roomId,codice)
            }
            else{
                errorMessage.textContent = "Errore: il numero di giocatori deve essere tra 2 e 10.";
                errorMessage.style.display = "block";
            }       
        }
        else if (response.type === 'start-game' && response.success) {
            window.location.href="#partita"
            const roomId = roomInput.value.trim();
            console.log("chiedere carte")
        }
        else if (response.type === 'turno-game') {
            if (turnoAttuale === response.player_attuale) return; // Evita esecuzioni multiple per lo stesso turno        
            turnoAttuale = response.player_attuale; // Aggiorna il turno attuale 
            scrollbar.aggiungi_turno(response.player_attuale, response.scelta);
            if (codice === response.player_next) {
                const buttons = document.querySelectorAll(".action-button");
                buttons.forEach(button => {
                    button.disabled = false;
                    button.addEventListener("click", function () {
                        console.log("Game:", codice, button-disabled==true);
                        socketHandler.turnoClient(roomId, codice, button.innerHTML.toLowerCase(), true);
                        buttons.forEach(btn => btn.disabled = true);
                    }, { once: true });
                });
            }
        }

        else if (response.type === 'turno-server') {
            if(codice===response.player){
                console.log("bottoni funzionante")
                const buttons = document.querySelectorAll(".action-button");
                buttons.forEach(button => {
                    button.disabled = false;
                    button.addEventListener("click", function() {
                        console.log(button.innerHTML.toLowerCase());
                        console.log("server",codice,button)
                        socketHandler.turnoClient(roomId,codice,button.innerHTML.toLowerCase(),false)
                        buttons.forEach(btn => btn.disabled = true);
                    }, { once: true });
                });
            }
        }
        else if (response.type === 'cards-distributed') {
            const carte_house = document.querySelector("#carte_house");
            const carte_mano = document.querySelector("#carte_mano");
            const roomId = roomInput.value.trim();
            let template = "";
            response.cards_house.forEach(carta_house => {
                let carta = '<img src="%carta"></img>';
                carta = carta.replace("%carta","../assets/images/back-card.png")
                template += carta
            });
            carte_house.innerHTML = template
            template = "";
            response.cards_player.forEach(carta_mano => {
                let carta = '<img src="%carta"></img>';
                carta = carta.replace("%carta",carta_mano.image)
                template += carta
            });
            carte_mano.innerHTML = template
            console.log(roomId,codice,"vuole confermare")
            socketHandler.confirmDraw(roomId,codice)
        }
        else if (response.type === 'room-created') {
            // Stanza creata con successo, ora unisciti
            console.log(`Stanza creata con ID: ${roomId}`);
            sessionStorage.setItem("currentRoom", roomId);

            // Unisciti alla stanza
            socketHandler.joinRoom(roomId, codice);
            
        } else if(response.type === 'room-created' && response.success!='success') {
            // Gestisci il caso di errore, stanza non creata
            console.error("Errore nella creazione della stanza.");
        }
        else {
            console.log("Errore:", response.message);
        }
    });
};

socket.onerror = (error) => {
    console.error("Errore WebSocket:", error);
};

socket.onclose = () => {
    console.log("Connessione WebSocket chiusa");
};

socket.onmessage = (event) => {
    const data = JSON.parse(event.data);
    console.log("Messaggio ricevuto dal server:", data);
};

const login_button = document.querySelector("#buttonlogin")

const rooms = {
    "Nicolas-baez":"ID-0001",
    "Vanessa-solis":"ID-0002"
}; 

// Funzione per ottenere la configurazione
async function getConfiguration() {
    try {
        const response = await fetch("conf.json");
        return await response.json();
    } catch (error) {
        console.error("Errore durante il caricamento della configurazione:", error);
    }
}


// Funzione principale
async function initialize() {
    try {
        // Carica configurazione
        const conf = await getConfiguration();

        // Aggiorna interfaccia utente
        createNavigator(document.querySelector(".poker-table"));
        const Login = createLogin()
        login_button.onclick = () => {
            let Nome = document.querySelector("#nome").value
            let Password = document.querySelector("#password").value
            Login.login(Nome,Password,conf["token"]).then((r)=>{
                console.log(r)
                if(r===true){
                    Login.sessionstorage()
                }
                let risposta = sessionStorage.getItem("login");
                console.log(risposta)
                if (risposta==="true"){
                    const name_giocatore = document.querySelector(".player-name");
                    window.location.href = "#stanze";
                    const fetchs = generateFetchComponent()
                    fetchs.setData(rooms,conf["token"],conf["key_utenti"]).then(()=>{
                        fetchs.getData(conf["token"],conf["key_utenti"]).then((data)=>{
                            let codice = Nome+"-"+Password;
                            name_giocatore.innerText=codice;
                            const utenteID = data[codice];
                            console.log(utenteID);
                        })
                    })  
                }
            })
        }
    } catch (error) {
        console.error("Errore durante l'inizializzazione:", error);
    }
}

// Esegui inizializzazione
initialize();
