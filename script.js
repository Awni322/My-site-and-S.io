async function login(){

    let password = document.getElementById("password").value;
    let message = document.getElementById("message");

    message.innerHTML = "Проверка...";

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


if(response.ok)
{

    message.innerHTML = "✅ Пароль верный";
    message.style.color = "green";

    document.getElementById("login").style.display = "none";
    document.getElementById("content").style.display = "block";


    } 
else 
{

        message.innerHTML = "❌ Неверный пароль";
        message.style.color = "red";

    }
}
