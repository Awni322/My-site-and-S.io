const WORKER_URL = "https://my-password-check.minecraftpesok.workers.dev/";

let editingId = null;



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


        document.getElementById("login").style.display="none";

        document.getElementById("content").style.display="block";


        loadNotes();


    } else {


        message.innerHTML="❌ Неверный пароль";

        message.style.color="red";

    }

}




async function saveNote(){


    let title =
    document.getElementById("title").value;


    let text =
    document.getElementById("text").value;



    let message =
    document.getElementById("message");



    if(!title || !text){

        message.innerHTML =
        "Заполни название и текст";

        message.style.color="red";

        return;

    }



    let data = {


        action:
        editingId ? "edit" : "save",


        title:title,


        content:text


    };



    if(editingId){

        data.id = editingId;

    }



    let response = await fetch(
        WORKER_URL,
        {
            method:"POST",

            headers:{
                "Content-Type":"application/json"
            },

            body:JSON.stringify(data)

        }
    );



    if(response.ok){


        document.getElementById("title").value="";

        document.getElementById("text").value="";


        editingId=null;



        document.getElementById("formTitle").innerHTML =
        "Новая запись";



        document.getElementById("cancelEdit").style.display =
        "none";



        message.innerHTML =
        "✅ Сохранено";


        message.style.color="green";



        loadNotes();


    }

}





async function loadNotes(){


    let response = await fetch(
        WORKER_URL
    );


    let notes =
    await response.json();



    let output="";



    notes.forEach(note=>{


        let safeTitle =
        note.title.replace(/'/g,"\\'");


        let safeContent =
        note.content.replace(/'/g,"\\'");



        output += `


<div>


<h3>
📌 ${note.title}
</h3>


<p>
${note.content}
</p>



<button onclick="editNote(${note.id}, '${safeTitle}', '${safeContent}')">

✏️ Изменить

</button>



<button onclick="deleteNote(${note.id})">

🗑 Удалить

</button>


<hr>


</div>


`;



    });



    document.getElementById("notes").innerHTML =
    output;


}






function editNote(id,title,content){


    editingId=id;



    document.getElementById("title").value =
    title;


    document.getElementById("text").value =
    content;



    document.getElementById("formTitle").innerHTML =
    "Редактирование";



    document.getElementById("cancelEdit").style.display =
    "inline-block";



    window.scrollTo({

        top:0,

        behavior:"smooth"

    });


}





function cancelEdit(){


    editingId=null;



    document.getElementById("title").value="";

    document.getElementById("text").value="";



    document.getElementById("formTitle").innerHTML =
    "Новая запись";



    document.getElementById("cancelEdit").style.display =
    "none";


}





async function deleteNote(id){


    let response = await fetch(
        WORKER_URL,
        {

            method:"POST",

            headers:{
                "Content-Type":"application/json"
            },


            body:JSON.stringify({

                action:"delete",

                id:id

            })

        }
    );



    if(response.ok){

        loadNotes();

    }


}


async function searchNotes(){

    let text =
    document.getElementById("search").value;


    let response =
    await fetch(
        WORKER_URL + "?search=" + encodeURIComponent(text)
    );


    let notes =
    await response.json();


   function renderNotes(notes){
    let output = "";

    notes.forEach(note => {

        output += `
        <div>

            <h3>📌 ${note.title}</h3>

            <p>${note.content}</p>

            <button onclick="editNote(${note.id})">
            ✏️ Изменить
            </button>

            <button onclick="deleteNote(${note.id})">
            🗑 Удалить
            </button>

        </div>
        `;

    });

    document.getElementById("notes").innerHTML = output;
}

    });


    document.getElementById("notes").innerHTML =
    output;

}


window.deleteNote = deleteNote;

window.editNote = editNote;

window.cancelEdit = cancelEdit;

window.searchNotes = searchNotes;
