import { createFormLogin } from "/componenti/form_login.js";
import { createLogin } from "/componenti/login.js";
import { createNavigator } from "/componenti/navigator.js"
import { ScrollBarComponent } from "/componenti/turni_scrollbar.js";
import { createFormRegister } from "/componenti/form_register.js";
import { createRegister } from "/componenti/register.js";
import { createFormRecupera } from "/componenti/form_recupera.js";

const socket = io();

const generacodice = async ()=>{
    let password = await fetch("https://makemeapassword.ligos.net/api/v1/alphanumeric/json?")
    password=await password.json()
    return password.pws[0]
}

function aggiornaGiocatori(players, showCards = false) {
    let html = '';

    players.forEach(player => {
        html += `
            <div class="giocatore">
                <div class="nome">${player.nome}</div>
                <div class="${showCards ? 'carte' : 'puntata'}">
                    ${
                        showCards
                            ? `<img src="${player.carte[0]}" alt="Carta 1">
                               <img src="${player.carte[1]}" alt="Carta 2">`
                            : `${player.puntata} 💰`
                    }
                </div>
            </div>
        `;
    });

    document.getElementById('giocatori_container').innerHTML = html;
}


socket.on("connect", () => {
    console.log("Connesso al server");

    const createButton = document.querySelector("#crea_stanza");
    const joinButton = document.querySelector("#entra_stanza");
    const roomInput = document.querySelector("#codice_stanza");
    const roomName = document.querySelector("#nome_stanza")
    const inizia_partita = document.querySelector(".inizia_partita");
    const NameRoom = document.querySelector("#nomestanza")
    const CodeRoom = document.querySelector("#codicestanza")

    createButton.addEventListener("click", async () => {
        const roomId = await generacodice();
        const nomeStanza = roomName.value
        socket.emit("create-room", { roomId , nomeStanza});
        sessionStorage.setItem("currentRoom", roomId);
        console.log(`Richiesta creazione stanza ID: ${roomId}`);
        window.location.href = "#stanza_attesa";
        NameRoom.innerText = nomeStanza
        CodeRoom.innerText = "Codice: "+roomId;
        inizia_partita.classList.remove("d-none");
    });

    joinButton.addEventListener("click", async () => {
        const roomId = roomInput.value.trim();
        const nome = sessionStorage.getItem("NAME");
        sessionStorage.setItem("currentRoom", roomId);
        socket.emit("join-room", { roomId, nome });
        console.log(`Richiesta unione stanza ID: ${roomId}`);
    });

    inizia_partita.addEventListener("click", () => {
        const roomId = sessionStorage.getItem("currentRoom");
        console.log(roomId)
        socket.emit("info-room", roomId);
    });
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
    window.location.href = "#stanza_attesa";
    console.log("Sei entrato nella stanza", response);
    const player_waiting = document.querySelector(".players_waiting");
    let template = '<table id="table_waiting" class="table table-borderless"><thead><tr><td>Players</td></tr></thead><tbody>%td</tbody></table>';
    let lista_p = "";
    response.players.forEach(player => {
        lista_p += `<tr><td>${player}</td></tr>`;
    });
    template = template.replace("%td", lista_p);
    player_waiting.innerHTML = template;
    const NameRoom = document.querySelector("#nomestanza")
    const CodeRoom = document.querySelector("#codicestanza")
    NameRoom.innerText = response.nameRoom
    CodeRoom.innerText = "Codice: "+response.roomId
});

socket.on("room-joined-error", () => {
    const errorMessage = document.getElementById("error-message-stanze");
    errorMessage.innerHTML = "<p>La partita è già iniziata</p>";
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
    const nome = sessionStorage.getItem("NAME");
    const codice = `${nome}`;

    socket.emit("confirm-draw", {roomId, codice});
});

socket.on('room-informed', (response) => {
    console.log(response)
    if ( response.success) {
        console.log(`Stanza giocatori: ${response.players}`);
        
        // Se il numero di giocatori è tra 2 e 10
        let errorMessage = document.getElementById("error-message");
        
        if (response.players.length >= 2 && response.players.length <= 6) {
            // Nascondi eventuali messaggi di errore
            errorMessage.textContent = "";
            errorMessage.style.display = "none";

            const roomId = sessionStorage.getItem("currentRoom");
            const codice = sessionStorage.getItem("NAME");
            console.log("si gioca")
            // Invoca la funzione per avviare la partita
            socket.emit("start-game",roomId);

            // Distribuisci le carte
            socket.emit("distribute-cards",{roomId, codice});
        } else {
            // Mostra il messaggio di errore se il numero di giocatori non è valido
            errorMessage.textContent = "Errore: il numero di giocatori deve essere tra 2 e 6.";
            errorMessage.style.display = "block";
        }
    }
});

// Cancella Hazem
socket.on("turno-server", (response) => { 
    const roomId = sessionStorage.getItem("currentRoom");
    const nome = document.querySelector("#nome").value;
    const password = document.querySelector("#password").value;
    const codice = `${nome}-${password}`;
    if(codice===response.player){
        console.log("bottoni funzionante")
        const buttons = document.querySelectorAll(".action-button");
        buttons.forEach(button => {
            button.disabled = false;
            button.addEventListener("click", function() {
                console.log(button.innerHTML.toLowerCase());
                console.log("server",codice,button)
                const scelta=button.innerHTML.toLowerCase()
                const first = true
                socket.emit("turno-client", {roomId, codice, scelta , first});
                buttons.forEach(btn => btn.disabled = true);
            }, { once: true });
        });
    }
});

// Cancella Hazem
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
                const scelta=button.innerHTML.toLowerCase()
                const first = true
                socket.emit("turno-client", {roomId, codice, scelta , first});
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
        const Login = createLogin();
        const Register = createRegister();
        const Recupera=createFormRecupera()
        const scrollbar = ScrollBarComponent(document.querySelector("#turni"));
        
        createNavigator(document.querySelector(".poker-table"));

        //form login 
        const Form_Login = createFormLogin(document.querySelector("#formlogin"));
        Form_Login.render(Login);
        
        //form register
        const Form_register = createFormRegister(document.querySelector("#formregister"))
        Form_register.render(Register)

         //form recupera
         const Form_recupera = createFormRecupera(document.querySelector("#formrecupera"))
         Form_recupera.render(Register)


    } catch (error) {
        console.error("Errore durante l'inizializzazione:", error);
    }
}


initialize();
