const generacodice = async ()=>{
    let password = await fetch("https://makemeapassword.ligos.net/api/v1/alphanumeric/json?")
    password=await password.json()
    return password.pws[0]
}

export const createStanze = (parentElement) => {
    let template = 
                `<div class="bottoni_stanze">
                    <input type="text" id="nome_stanza" placeholder="Nome Stanza" class="poker-input">
                    <button id="crea_stanza" class="poker-button"><span class="icon">♠</span>Crea Stanza</button>
                </div>`+
                `<div class="bottoni_stanze">
                    <input type="text" id="codice_stanza" placeholder="Codice Stanza" class="poker-input">
                    <button id="entra_stanza" class="poker-button"><span class="icon">♦</span>Entra in stanza</button>
                </div>`+
                `<div id="error-message-stanze"></div>`;
    return {      
        render: (socket) => {
            parentElement.innerHTML = template;

            const createButton = document.querySelector("#crea_stanza");
            const joinButton = document.querySelector("#entra_stanza");
        
            createButton.addEventListener("click", async () => {
                // Reset error message
                document.getElementById("error-message-stanze").innerHTML = ""; 

                //generazione codice stanza
                const roomId = await generacodice();

                // Recupera il nome della stanza
                const roomName = document.querySelector("#nome_stanza");
                const nomeStanza = roomName.value

                // Controlla se il nome della stanza è vuoto
                if (nomeStanza === "") {
                    document.getElementById("error-message-stanze").innerHTML = "<p>Inserisci un nome per la stanza</p>";
                    return;
                }

                //creazione della stanza
                socket.emit("create-room", { roomId , nomeStanza});

                // Salva l'ID nella sessione
                sessionStorage.setItem("currentRoom", roomId);

                //porta a stanza attesa

                // Reset del campo di input
                roomName.value = "";
            });
        
            joinButton.addEventListener("click", async () => {
                //codice stanza
                const roomInput = document.querySelector("#codice_stanza")
                const roomId = roomInput.value.trim();
                if (roomId === "") {
                    document.getElementById("error-message-stanze").innerHTML = "<p>Inserisci un codice stanza</p>";
                    return;
                }
                //set nome giocatore
                const nome = sessionStorage.getItem("NAME");
                sessionStorage.setItem("currentRoom", roomId);
                
                socket.emit("join-room", { roomId, nome });
            });
        },

        errore: () => {
            document.getElementById("error-message-stanze").innerHTML = "<p>La partita è già iniziata</p>";
        },
    }
}
