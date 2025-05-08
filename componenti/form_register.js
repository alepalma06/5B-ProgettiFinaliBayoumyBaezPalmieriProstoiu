export const createFormRegister = (parentElement) => {
    return { 
        render:(register) =>  {

            parentElement.innerHTML = 
                `<div class="card-icon">♠ ♥ ♣ ♦</div>`+
                `<h1>Registrati</h1>`+
                `<form id="formregister">
                    <input id="nomer" type="text" placeholder="Username" required>
                    <input id="email" type="email" placeholder="Email" required>
                    <button type="button" id="buttonregister" class="bottoni_principali">Registrati</button>
                    <p>Hai un account? <a href="#home">Accedi</a></p>
                    <p id="outputformreg"></p>
                </form>`

            document.querySelector("#buttonregister").onclick = async() => {
                const Nome = document.querySelector("#nomer").value;
                const Email = document.querySelector("#email").value;
                console.log(Nome,Email)
                const outputform = document.querySelector("#outputformreg")
                if (Nome === "" || Email === "" ) {
                    outputform.innerHTML="ko";
                }else{
                    try {
                        const data = await register.register(Nome,Email)
                        window.location.href = "#home";
                    } catch (error) {
                        console.error("Errore durante la registrazione:", error);
                    }
                }
            }
        }
    }
}