const WORKER_URL = "https://my-password-check.minecraftpesok.workers.dev/";



// =========================
// Вход
// =========================

async function login(){

    let password =
        document.getElementById("password").value;

    let message =
        document.getElementById("message");


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


        message.innerHTML =
            "✅ Пароль верный";

        message.style.color =
            "green";


        document.getElementById("login").style.display =
            "none";


        document.getElementById("content").style.display =
            "block";


        loadNotes();


    } else {


        message.innerHTML =
            "❌ Неверный пароль";

        message.style.color =
            "red";

    }

}







// =========================
// Сохранение записи
// =========================

async function saveNote(){


    let title =
        document.getElementById("title").value;


    let text =
        document.getElementById("text").value;



    if(!title || !text){

        alert("Заполни название и текст");

        return;

    }



    let id =
        document.getElementById("title").dataset.id;



    let action =
        id ? "edit" : "save";



    let body = {


        action: action,

        title:title,

        content:text

    };



    if(id){

        body.id = id;

    }



    let response =
        await fetch(

            WORKER_URL,

            {

                method:"POST",

                headers:{
                    "Content-Type":"application/json"
                },

                body:
                    JSON.stringify(body)

            }

        );



    if(response.ok){


        document.getElementById("title").value = "";

        document.getElementById("text").value = "";


        delete document.getElementById("title").dataset.id;


        loadNotes();


    }


}








// =========================
// Загрузка записей
// =========================

async function loadNotes(){


    let response =
        await fetch(WORKER_URL);


    let notes =
        await response.json();


    renderNotes(notes);


}







// =========================
// Отображение записей
// =========================

function renderNotes(notes){


    let output = "";



    notes.forEach(note => {


        output += `


        <div>


            <h3>
                📌 ${note.title}
            </h3>


            <p>
                ${note.content}
            </p>



            <button onclick="editNote(${note.id})">
                ✏️ Изменить
            </button>



            <button onclick="deleteNote(${note.id})">
                🗑 Удалить
            </button>



        </div>


        `;


    });



    document.getElementById("notes").innerHTML =
        output;


}









// =========================
// Поиск
// =========================

async function searchNotes(){


    let text =
        document.getElementById("search").value;



    let response =
        await fetch(
            WORKER_URL +
            "?search=" +
            encodeURIComponent(text)
        );



    let notes =
        await response.json();



    renderNotes(notes);


}









// =========================
// Редактирование
// =========================

async function editNote(id){


    let response =
        await fetch(WORKER_URL);



    let notes =
        await response.json();



    let note =
        notes.find(
            n => n.id == id
        );



    if(!note){

        return;

    }



    document.getElementById("title").value =
        note.title;



    document.getElementById("text").value =
        note.content;



    document.getElementById("title").dataset.id =
        note.id;



}








// =========================
// Удаление
// =========================

async function deleteNote(id){


    let response =
        await fetch(

            WORKER_URL,

            {

                method:"POST",

                headers:{
                    "Content-Type":"application/json"
                },


                body:
                JSON.stringify({

                    action:"delete",

                    id:id

                })


            }

        );



    if(response.ok){

        loadNotes();

    }


}






window.login = login;

window.saveNote = saveNote;

window.deleteNote = deleteNote;

window.editNote = editNote;

window.searchNotes = searchNotes;
