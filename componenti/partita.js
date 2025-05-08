export const createPartita = (parentElement) => {
    let fiches=0;
    return { 
        render: () => {
            parentElement.innerHTML =
                `<div id="giocatori_container" class="d-flex justify-content-center flex-wrap mb-3"></div>
                <div id="carte_house""></div>
                <div id="carte_mano"></div>
                <div id="azioni_giocatore" class="action-buttons"></div>`;
        },
        creaGiocatori:(nome,players, showCards = false)=> {
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
        },
        aggiornaGiocatore:(nomeGiocatore, nuovaPuntata, nomeGiocatoreDiTurno) =>{
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
    };
};