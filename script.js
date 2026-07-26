const WORKER_URL = "https://my-password-check.minecraftpesok.workers.dev/";


async function login(){

    let password = document.getElementById("password").value;
    let message = document.getElementById("message");


    message.innerHTML = "Проверка...";


    let response = await fetch(
        WORKER_URL,
        {
            method:"POST",
            headers:{
                "Content-Type":"application/json"
            },
            body:JSON.stringify({
                password:password
            })
        }
    );


    if(response.ok){

        message.innerHTML = "✅ Пароль верный";
        message.style.color = "green";


        document.getElementById("login").style.display = "none";
        document.getElementById("content").style.display = "block";


        loadNotes();


    } else {


        message.innerHTML = "❌ Неверный пароль";
        message.style.color = "red";


    }

}





async function saveNote(){


    let title = document.getElementById("title").value;
    let text = document.getElementById("text").value;


    if(!title || !text){
        alert("Заполни название и текст");
        return;
    }



    let response = await fetch(
        WORKER_URL,
        {
            method:"POST",
            headers:{
                "Content-Type":"application/json"
            },

            body:JSON.stringify({

                action:"save",
                title:title,
                content:text

            })

        }
    );



    if(response.ok){

        document.getElementById("title").value="";
        document.getElementById("text").value="";


        loadNotes();

    }

}





async function loadNotes(){


    let response = await fetch(
        WORKER_URL
    );


    let notes = await response.json();


    let output = "";


    notes.forEach(note => {


        output += `

        <div>

            <h3>📌 ${note.title}</h3>

            <p>${note.content}</p>

            <hr>

        </div>

        `;


    });



    document.getElementById("notes").innerHTML = output;


}
