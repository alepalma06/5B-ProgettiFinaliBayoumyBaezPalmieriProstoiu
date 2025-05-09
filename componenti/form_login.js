export const createFormLogin = (parentElement) => {
    return { 
        render:(login) =>  {

            parentElement.innerHTML = 
                `<div class="card-icon">♠ ♥ ♣ ♦</div>`+
                `<h1>Login</h1>`+
                `<form id="formlogin">
                    <input id="nome" type="text" placeholder="Username" required>
                    <input id="password" type="password" placeholder="Password" required>
                    <button type="button" id="buttonlogin" class="bottoni_principali">Login</button>
                    <p>Non sei registrato? <a href="#registrati" id="Registrati">Registrati</a></p>
                    <p>Non ti ricordi la password? <a href="#recupera" id="recupera">Recupera</a></p>
                    <p id="outputform" style="color: red "></p>
                </form>`

            document.querySelector("#buttonlogin").onclick = async() => {
                const Nome = document.querySelector("#nome").value;
                const Password = document.querySelector("#password").value;
                const outputform = document.querySelector("#outputform")
                if (Nome === "" || Password === "" ) {
                    outputform.innerHTML="ko";
                }else{
                    try {
                        const data = await login.login(Nome,Password)
                        if (data === true) {
                            // Se la risposta è positiva, salva il login e prosegui
                            sessionStorage.setItem("login", "true");
                            const name_giocatore = document.querySelector(".player-name");
                            window.location.href = "#stanze";
                            name_giocatore.innerText = Nome;
                            sessionStorage.setItem("NAME", Nome);
                            document.querySelector("#nome").value =""
                            document.querySelector("#password").value =""
                            outputform.innerHTML = "";
                        } else {
                            // Se le credenziali sono errate, mostra un messaggio di errore
                            outputform.innerHTML = "Credenziali errate. Riprova.";
                            document.querySelector("#nome").value =""
                            document.querySelector("#password").value =""
                        }
                    } catch (error) {
                        console.error("Errore durante la verifica del login:", error);
                    }
                }
            }
        }
    }
}
