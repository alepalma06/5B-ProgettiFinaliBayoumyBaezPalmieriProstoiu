export const createFormRecupera = (parentElement) => {
    return { 
        render:(recupera) =>  {

            parentElement.innerHTML = 
                `<div class="card-icon">♠ ♥ ♣ ♦</div>`+
                `<h1>Recupera password</h1>`+
                `<form id="formrecupera">
                    <input id="nomerec" type="text" placeholder="Username" required>
                    <input id="emailrec" type="email" placeholder="Email" required>
                    <button type="button" id="buttonrecupera" class="bottoni_principali">Recupera Password</button>
                    <p>Hai un account? <a href="#home">Accedi</a></p>
                    <p id="outputformrecupera"></p>
                </form>`

            document.querySelector("#buttonrecupera").onclick = async() => {
                const Nome = document.querySelector("#nomerec").value;
                const Email = document.querySelector("#emailrec").value;
                const outputform = document.querySelector("#outputformrecupera")
                if (Nome === "" || Email === "" ) {
                    outputform.innerHTML="Attenzione errore!";
                }else{
                    try {
                        const data = await recupera.remove(Nome,Email)
                        window.location.href = "#home";
                        const data2 = await recupera.register(Nome,Email)
                    } catch (error) {
                        console.error("Errore durante la registrazione:", error);
                    }
                }
            }
        }
    }
}