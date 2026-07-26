async function login(){

    alert("Кнопка нажата");

    let password = document.getElementById("password").value;

    let response = await fetch(
        "https://my-password-check.minecraftpesok.workers.dev/",
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
        alert("Пароль верный");
    }
    else{
        alert("Пароль неверный");
    }
}
