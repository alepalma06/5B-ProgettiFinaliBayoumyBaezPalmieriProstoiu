export const createRegister=()=>{
    return{
        async register(Nome,Email){
            try {
                const response = await fetch("/insert", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({ username: Nome, email: Email })
                });
                const data = await response.json();
                return data.success;
            } catch (error) {
                console.error("Errore durante la verifica del login:", error);
            }
        },
        async remove(Nome,Email){
            try {
                const response = await fetch("/delete", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({ username: Nome, email: Email })
                });
                const data = await response.json();
                return data.success==="ok";
            } catch (error) {
                console.error("Errore durante l'eliminazione dell'utente:", error);
            }
        },
        render:(bottone_aggiungi)=>{
            console.log(bottone_aggiungi)
            bottone_aggiungi.classList.remove("d-none");
        }
    }
}