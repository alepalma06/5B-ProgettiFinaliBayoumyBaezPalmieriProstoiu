export const createFormLogin = (parentElement) => {
    return { 
        render:(login) =>  {

            parentElement.innerHTML = 
                `<input id="nome" type="text" placeholder="Username" required>`+
                `<input id="password" type="password" placeholder="Password" required>`+
                `<button type="button" id="buttonlogin" class="bottoni_principali">Login</button>`+
                `<p>Sei registrato? <a href="#" id="Registrati">Registrati</a></p>`;

            document.querySelector("#buttonlogin").onclick = async() => {
                const Nome = document.querySelector("#nome").value;
                const Password = document.querySelector("#password").value;
                console.log(Nome,Password)
                if (Nome === "" || Password === "" ) {
                    outputform.innerHTML="ko";
                }else{
                    try {
                        const data = await login.login(Nome,Password)
                        console.log(data)
                        if (data === true) {
                            // Se la risposta è positiva, salva il login e prosegui
                            sessionStorage.setItem("login", "true");
                            const name_giocatore = document.querySelector(".player-name");
                            window.location.href = "#stanze";
                            name_giocatore.innerText = Nome;
                        } else {
                            // Se le credenziali sono errate, mostra un messaggio di errore
                            alert("Credenziali errate, riprova.");
                        }
                    } catch (error) {
                        console.error("Errore durante la verifica del login:", error);
                    }
                }
            }
        }
    }
}
