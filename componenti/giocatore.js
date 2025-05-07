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
                `<p id="fiches">Fiches</p>`;
        },
        mio_turno: () => {
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

            foldButton.onclick = () => {
                foldButton.disabled = true;
                checkButton.disabled = true;
                callButton.disabled = true;
                raiseButton.disabled = true;
                allinButton.disabled = true;
                const puntataLibera = document.querySelector("#puntata_libera").value;
            };

            checkButton.onclick = () => {
                foldButton.disabled = true;
                checkButton.disabled = true;
                callButton.disabled = true;
                raiseButton.disabled = true;
                allinButton.disabled = true;
                const puntataLibera = document.querySelector("#puntata_libera").value;
            };

            callButton.onclick = () => {
                foldButton.disabled = true;
                checkButton.disabled = true;
                callButton.disabled = true;
                raiseButton.disabled = true;
                allinButton.disabled = true;
                const puntataLibera = document.querySelector("#puntata_libera").value;
            };

            raiseButton.onclick = () => {
                foldButton.disabled = true;
                checkButton.disabled = true;
                callButton.disabled = true;
                raiseButton.disabled = true;
                allinButton.disabled = true;
                const puntataLibera = document.querySelector("#puntata_libera").value;
            };

            allinButton.onclick = () => {
                foldButton.disabled = true;
                checkButton.disabled = true;
                callButton.disabled = true;
                raiseButton.disabled = true;
                allinButton.disabled = true;
            };
        },
    };
};