export const ScrollBarComponent = (parentElement) => {
   let count = 1;
   return{
    aggiungi_turno:(player,scelta)=>{
        const turno = document.createElement("div");
        turno.classList.add("turno");
        let template = "Turno %indice: %scelta"
        template=template.replace("%indice",count)
        if (scelta === "fold"){
            template=template.replace("%scelta",`The player ${player} has folded`)
        }
        else if (scelta === "check"){
            template=template.replace("%scelta",`The player ${player} has checked`)
        }
        else if (scelta === "raise"){
            template=template.replace("%scelta",`The player ${player} ha raised`)
        }
        else if (scelta === "call"){
            template=template.replace("%scelta",`The player ${player} ha called`)
        }
        turno.textContent = template;
        count++;
        parentElement.appendChild(turno);
    }
   }  
}