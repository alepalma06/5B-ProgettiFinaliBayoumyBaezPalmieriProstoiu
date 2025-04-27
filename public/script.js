import { generateFetchComponent } from "/componenti/fetch_component.js";
import { createFormLogin } from "/componenti/form_login.js";
import { createLogin } from "/componenti/login.js";
import { createNavigator } from "/componenti/navigator.js"
import { ScrollBarComponent } from "/componenti/turni_scrollbar.js";

const socket = io();
const scrollbar = ScrollBarComponent(document.querySelector("#turni"));

socket.on("connect", () => {
    console.log("Connesso al server");

    const createButton = document.querySelector("#crea_stanza");
    const joinButton = document.querySelector("#entra_stanza");
    const roomInput = document.querySelector("#codice_stanza");
    const inizia_partita = document.querySelector(".inizia_partita");

    createButton.addEventListener("click", () => {
        const roomId = roomInput.value.trim();
        socket.emit("create-room", roomId);
        sessionStorage.setItem("currentRoom", roomId);
        console.log(`Richiesta creazione stanza ID: ${roomId}`);
        window.location.href = "#stanza_attesa";
        inizia_partita.classList.remove("d-none");
    });

    joinButton.addEventListener("click", () => {
        const roomId = roomInput.value.trim();
        const nome = document.querySelector("#nome").value;
        const password = document.querySelector("#password").value;
        const codice = `${nome}-${password}`;
        socket.emit("join-room", { roomId, codice });
        sessionStorage.setItem("currentRoom", roomId);
        console.log(`Richiesta unione stanza ID: ${roomId}`);
        window.location.href = "#stanza_attesa";
    });

    inizia_partita.addEventListener("click", () => {
        const roomId = roomInput.value.trim();
        console.log(roomId)
        socket.emit("info-room", roomId);
    });
});

// Ascolta "room-created"
socket.on("room-created", (data) => {
    console.log(`Stanza creata con ID: ${data.roomId}`);
    const roomId = data.roomId;
    const nome = document.querySelector("#nome").value;
    const password = document.querySelector("#password").value;
    const codice = `${nome}-${password}`;
    sessionStorage.setItem("currentRoom", roomId);
    socket.emit("join-room", { roomId, codice });
});

// Ascolta "room-joined"
socket.on("room-joined", (response) => {
    console.log("Sei entrato nella stanza", response);
    const player_waiting = document.querySelector(".players_waiting");
    let template = '<table id="table_waiting" class="table table-borderless"><thead><tr><td>Players</td></tr></thead><tbody>%td</tbody></table>';
    let lista_p = "";
    response.players.forEach(player => {
        lista_p += `<tr><td>${player}</td></tr>`;
    });
    template = template.replace("%td", lista_p);
    player_waiting.innerHTML = template;
});

// Ascolta "start-game"
socket.on("start-game", (response) => {
    if (response.success) {
        console.log("Partita iniziata");
        window.location.href = "#partita";
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
    const nome = document.querySelector("#nome").value;
    const password = document.querySelector("#password").value;
    const codice = `${nome}-${password}`;

    socket.emit("confirm-draw", roomId, codice);
});

socket.on('room-informed', (response) => {
    console.log(response)
    if ( response.success) {
        console.log(`Stanza giocatori: ${response.players}`);
        
        // Se il numero di giocatori è tra 2 e 10
        let errorMessage = document.getElementById("error-message");
        
        if (response.players.length >= 2 && response.players.length <= 10) {
            // Nascondi eventuali messaggi di errore
            errorMessage.textContent = "";
            errorMessage.style.display = "none";

            const roomId = document.querySelector("#codice_stanza").value.trim(); // Ottieni l'ID della stanza
            const codice = document.querySelector("#nome").value + '-' + document.querySelector("#password").value; // Codice del giocatore
            console.log("si gioca")
            // Invoca la funzione per avviare la partita
            socket.emit("start-game",roomId);

            // Distribuisci le carte
            socket.emit("distribute-cards",{roomId, codice});
        } else {
            // Mostra il messaggio di errore se il numero di giocatori non è valido
            errorMessage.textContent = "Errore: il numero di giocatori deve essere tra 2 e 10.";
            errorMessage.style.display = "block";
        }
    }
});


// Ascolta "turno-game"
socket.on("turno-game", (response) => {
    console.log("Turno di gioco", response);
    const roomId = sessionStorage.getItem("currentRoom");
    const nome = document.querySelector("#nome").value;
    const password = document.querySelector("#password").value;
    const codice = `${nome}-${password}`;

    const scrollbar = ScrollBarComponent(document.querySelector("#turni"));
    scrollbar.aggiungi_turno(response.player_attuale, response.scelta);

    if (codice === response.player_next) {
        const buttons = document.querySelectorAll(".action-button");
        buttons.forEach(button => {
            button.disabled = false;
            button.addEventListener("click", () => {
                socket.emit("turnoClient", roomId, codice, button.innerHTML.toLowerCase(), true);
                buttons.forEach(btn => btn.disabled = true);
            }, { once: true });
        });
    }
});

socket.on("disconnect", () => {
    console.log("Connessione chiusa");
});

socket.on("error", (error) => {
    console.error("Errore Socket.IO:", error);
});


const login_button = document.querySelector("#buttonlogin");
const rooms = {
    "Nicolas-baez": "ID-0001",
    "Vanessa-solis": "ID-0002"
};

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
        const conf = await getConfiguration();
        createNavigator(document.querySelector(".poker-table"));
        const Login = createLogin();
        login_button.onclick = () => {
            let Nome = document.querySelector("#nome").value;
            let Password = document.querySelector("#password").value;
            Login.login(Nome, Password, conf["token"]).then((r) => {
                if (r === true) {
                    Login.sessionstorage();
                }
                let risposta = sessionStorage.getItem("login");
                if (risposta === "true") {
                    const name_giocatore = document.querySelector(".player-name");
                    window.location.href = "#stanze";
                    const fetchs = generateFetchComponent();
                    fetchs.setData(rooms, conf["token"], conf["key_utenti"]).then(() => {
                        fetchs.getData(conf["token"], conf["key_utenti"]).then((data) => {
                            const codice = `${Nome}-${Password}`;
                            name_giocatore.innerText = codice;
                            const utenteID = data[codice];
                        });
                    });
                }
            });
        };
    } catch (error) {
        console.error("Errore durante l'inizializzazione:", error);
    }
}

initialize();
