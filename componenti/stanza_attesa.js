export const createStanzaAttesa = (parentElement) => {
    const template = 
                `<h1 id="nomestanza">%NOME</h1>`+
                `<p id="codicestanza">Codice: %CODICE</p>`+
                `<div class="players_waiting"><table id="table_waiting" class="table table-borderless"><thead><tr><td>Players</td></tr></thead><tbody>%td</tbody></table> </div>`+
                `<button class="inizia_partita bottoni_principali d-none" type="button">Start</button>`+
                `<div id="error-message"></div>`;
    return {      
        render: () => {
            parentElement.innerHTML = template;            
        },

        entra_in_stanza: (response,socket) => {
            // Reset error message
            document.getElementById("error-message-stanze").innerHTML = "";

            window.location.href = "#stanza_attesa";
            let html = template
            html = html.replace("%NOME", response.nameRoom);
            html = html.replace("%CODICE", response.roomId);
            let lista_p = "";
            response.players.forEach(player => {
                lista_p += `<tr><td>${player}</td></tr>`;
            });
            html = html.replace("%td", lista_p);
            parentElement.innerHTML = html;
            if (response.players[0] === sessionStorage.getItem("NAME")) {
                const bottone = document.querySelector(".inizia_partita");
                bottone.classList.remove("d-none");
                bottone.addEventListener("click", () => {
                    socket.emit("info-room", response.roomId);
                });
            }
        },
        avvia_partita: (response,socket) => {
                
            // Se il numero di giocatori è tra 2 e 6;
            let errorMessage = document.getElementById("error-message");
                
            if (response.players.length >= 2 && response.players.length <= 6) {
                // Nascondi eventuali messaggi di errore
                errorMessage.textContent = "";
                errorMessage.style.display = "none";
    
                const roomId = sessionStorage.getItem("currentRoom");
                const codice = sessionStorage.getItem("NAME");
                // Invoca la funzione per avviare la partita
                socket.emit("start-game",roomId);        
                // Distribuisci le carte
                socket.emit("distribute-cards",{roomId, codice});
            } else {
                // Mostra il messaggio di errore se il numero di giocatori non è valido
                errorMessage.textContent = "Errore: il numero di giocatori deve essere tra 2 e 6.";
                errorMessage.style.display = "block";
            }
        },

    }
}
