async function login(){

    let password = document.getElementById("password").value;

    let response = await fetch(
        "АДРЕС_ТВОЕГО_WORKER",
        {
            method:"POST",
            headers:{
                "Content-Type":"application/json"
            },
            body: JSON.stringify({
                password: password
            })
        }
    );


    if(response.ok){
        alert("Доступ разрешён");
        window.location.href="main.html";
    }
    else{
        alert("Неверный пароль");
    }
}
