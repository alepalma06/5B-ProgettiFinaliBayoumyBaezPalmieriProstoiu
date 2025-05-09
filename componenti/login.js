export const createLogin=()=>{
    sessionStorage.setItem("login", "false");
    return{
        async login(Nome,Password){
            try {
                const response = await fetch("/login", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({ username: Nome, password: Password })
                });
                const data = await response.json();
                return data.success;
            } catch (error) {
                console.error("Errore durante la verifica del login:", error);
            }
        },
        sessionstorage:()=>{
            sessionStorage.setItem("login", "true");
        },
        render:(bottone_aggiungi)=>{
            console.log(bottone_aggiungi)
            bottone_aggiungi.classList.remove("d-none");
        }
    }
}