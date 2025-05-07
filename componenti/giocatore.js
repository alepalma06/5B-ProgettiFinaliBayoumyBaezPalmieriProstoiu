export const createGiocatore = (parentElement) => {
    return { 
        render: () => {
            parentElement.innerHTML =
                `<button class="btn btn-danger action-button" id="fold">Fold</button>` +
                `<button class="btn btn-secondary action-button" id="check">Check</button>` +
                `<button class="btn btn-warning action-button" id="call">Call</button>` +
                `<button class="btn btn-success action-button" id="raise">Raise</button>` +
                `<input type="number" class="form-control form-control-sm d-inline-block w-auto ms-2" placeholder="2" id="puntata_libera"></input>` +
                `<button class="btn btn-info action-button" id="allin">All In</button>` +
                `<p id="fiches">Fiches</p>` +
                `<p id="messaggio">messaggio</p>`;
            const foldButton = document.querySelector("#fold");
            const checkButton = document.querySelector("#check");
            const callButton = document.querySelector("#call");
            const raiseButton = document.querySelector("#raise");
            const allinButton = document.querySelector("#allin");
            
            foldButton.disabled = true;
            checkButton.disabled = true;
            callButton.disabled = true;
            raiseButton.disabled = true;
            allinButton.disabled = true;
        },
        mio_turno: (socket, ultima_puntata) => {
            const foldButton = document.querySelector("#fold");
            const checkButton = document.querySelector("#check");
            const callButton = document.querySelector("#call");
            const raiseButton = document.querySelector("#raise");
            const allinButton = document.querySelector("#allin");

            if (ultima_puntata === 0) {
                checkButton.disabled = false;
            } else {
                checkButton.disabled = true;
            }

            foldButton.disabled = false;
            callButton.disabled = false;
            raiseButton.disabled = false;
            allinButton.disabled = false;

            foldButton.onclick = () => {
                foldButton.disabled = true;
                checkButton.disabled = true;
                callButton.disabled = true;
                raiseButton.disabled = true;
                allinButton.disabled = true;
                socket.emit("giocata", { roomId: sessionStorage.getItem("currentRoom"), nome: sessionStorage.getItem("NAME"), giocata: "fold" , puntata: 0 });
                console.log("Fold eseguito");
            };

            checkButton.onclick = () => {
                foldButton.disabled = true;
                checkButton.disabled = true;
                callButton.disabled = true;
                raiseButton.disabled = true;
                allinButton.disabled = true;
                socket.emit("giocata", { roomId: sessionStorage.getItem("currentRoom"), nome: sessionStorage.getItem("NAME"), giocata: "check" , puntata: 0 });
                console.log("Check eseguito");
            };

            callButton.onclick = () => {
                foldButton.disabled = true;
                checkButton.disabled = true;
                callButton.disabled = true;
                raiseButton.disabled = true;
                allinButton.disabled = true;
                let puntataLibera = document.querySelector("#puntata_libera").value;
                if (puntataLibera === "") {
                    if (ultima_puntata === 0) {
                        puntataLibera = 2;
                    } else {
                        puntataLibera = ultima_puntata;
                    }
                } else {
                    if (puntataLibera <= ultima_puntata) {
                        puntataLibera = ultima_puntata;
                    }
                }
                socket.emit("giocata", { roomId: sessionStorage.getItem("currentRoom"), nome: sessionStorage.getItem("NAME"), giocata: "call" , puntata: puntataLibera });
                console.log("Call eseguito");
            };

            raiseButton.onclick = () => {
                foldButton.disabled = true;
                checkButton.disabled = true;
                callButton.disabled = true;
                raiseButton.disabled = true;
                allinButton.disabled = true;
                let puntataLibera = document.querySelector("#puntata_libera").value;
                if (puntataLibera === "") {
                    if (ultima_puntata === 0) {
                        puntataLibera = 4;
                    } else {
                        puntataLibera = ultima_puntata*2;
                    }
                } else {
                    if (puntataLibera <= ultima_puntata) {
                        puntataLibera = ultima_puntata*2;
                    }
                }
                socket.emit("giocata", { roomId: sessionStorage.getItem("currentRoom"), nome: sessionStorage.getItem("NAME"), giocata: "raise" , puntata: puntataLibera });
                console.log("Raise eseguito");
            };

            allinButton.onclick = () => {
                foldButton.disabled = true;
                checkButton.disabled = true;
                callButton.disabled = true;
                raiseButton.disabled = true;
                allinButton.disabled = true;
                let puntataLibera = 2;
                socket.emit("giocata", { roomId: sessionStorage.getItem("currentRoom"), nome: sessionStorage.getItem("NAME"), giocata: "allin" , puntata: puntataLibera });
                console.log("All In eseguito");
            };
        },
    };
};