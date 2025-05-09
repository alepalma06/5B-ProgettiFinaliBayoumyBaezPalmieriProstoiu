export const createGiocatore = (parentElement) => {
    let fiches=0;
    let ultima_puntata=0;
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
                `<p id="messaggio"></p>`;
            const foldButton = document.querySelector("#fold");
            const checkButton = document.querySelector("#check");
            const callButton = document.querySelector("#call");
            const raiseButton = document.querySelector("#raise");
            const allinButton = document.querySelector("#allin");
            const fichesElement = document.querySelector("#fiches");
            fichesElement.innerHTML = "Fiches: " + fiches;
            
            foldButton.disabled = true;
            checkButton.disabled = true;
            callButton.disabled = true;
            raiseButton.disabled = true;
            allinButton.disabled = true;
        },
        aggiorna_fiches: (fich) => {
            const fichesElement = document.querySelector("#fiches");
            fiches+=fich
            fichesElement.innerHTML = "Fiches: " + fiches;            
        },
        movimenti_non_permessi: (movimenti) => {
            const actions = document.querySelector("#azioni_giocatore");
            console.log(movimenti)
            if (movimenti.length  !== 0){
                movimenti.forEach(mov => {
                    console.log(mov)
                    let bottoni = actions.querySelectorAll(".action-button");
                    bottoni.forEach(bottone=>{
                        if(bottone.innerText.toLowerCase()===mov){
                            bottone.disabled = true;
                        }
                        else{
                            bottone.disabled = false;
                        }
                    })
                });}
            else{
                console.log("check")
                const foldButton = document.querySelector("#fold");
                const checkButton = document.querySelector("#check");
                const callButton = document.querySelector("#call");
                const raiseButton = document.querySelector("#raise");
                const allinButton = document.querySelector("#allin");
                foldButton.disabled = false;
                checkButton.disabled = false;
                callButton.disabled = false;
                raiseButton.disabled = false;
                allinButton.disabled = false;
            }
        },
        mio_turno: (socket, ult_pun) => {
            ultima_puntata=ult_pun
            console.log("mioturno",ult_pun,ultima_puntata)
            const messaggio = document.getElementById("messaggio");
            const foldButton = document.querySelector("#fold");
            const checkButton = document.querySelector("#check");
            const callButton = document.querySelector("#call");
            const raiseButton = document.querySelector("#raise");
            const allinButton = document.querySelector("#allin");

            foldButton.onclick = () => {
                foldButton.disabled = true;
                checkButton.disabled = true;
                callButton.disabled = true;
                raiseButton.disabled = true;
                allinButton.disabled = true;
                socket.emit("giocata", { roomId: sessionStorage.getItem("currentRoom"), nome: sessionStorage.getItem("NAME"), giocata: "fold" , puntata: ultima_puntata });
                console.log("Fold eseguito");
                messaggio.innerHTML = "";
            };

            checkButton.onclick = () => {
                foldButton.disabled = true;
                checkButton.disabled = true;
                callButton.disabled = true;
                raiseButton.disabled = true;
                allinButton.disabled = true;
                socket.emit("giocata", { roomId: sessionStorage.getItem("currentRoom"), nome: sessionStorage.getItem("NAME"), giocata: "check" , puntata: ultima_puntata });
                console.log("Check eseguito");
                messaggio.innerHTML = "";
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
                fiches=fiches+ultima_puntata-puntataLibera
                document.querySelector("#fiches").innerHTML = "Fiches: " + fiches;
                socket.emit("giocata", { roomId: sessionStorage.getItem("currentRoom"), nome: sessionStorage.getItem("NAME"), giocata: "call" , puntata: puntataLibera });
                console.log("Call eseguito");
                messaggio.innerHTML = "";
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
                fiches-=puntataLibera
                document.querySelector("#fiches").innerHTML = "Fiches: " + fiches;
                socket.emit("giocata", { roomId: sessionStorage.getItem("currentRoom"), nome: sessionStorage.getItem("NAME"), giocata: "raise" , puntata: puntataLibera });
                console.log("Raise eseguito");
                messaggio.innerHTML = "";
            };

            allinButton.onclick = () => {
                foldButton.disabled = true;
                checkButton.disabled = true;
                callButton.disabled = true;
                raiseButton.disabled = true;
                allinButton.disabled = true;
                let puntataLibera = fiches;
                fiches -= puntataLibera;
                document.querySelector("#fiches").innerHTML = "Fiches: " + fiches;
                socket.emit("giocata", { roomId: sessionStorage.getItem("currentRoom"), nome: sessionStorage.getItem("NAME"), giocata: "allin" , puntata: puntataLibera });
                console.log("All In eseguito");
                messaggio.innerHTML = "";
            };
        },
    };
};