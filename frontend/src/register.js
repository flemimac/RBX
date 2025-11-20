const API_BASE_URL = "http://localhost:8000/api/v1";

const registerForm = document.getElementById("register-form");
const statusEl = document.querySelector(".form-status[data-for='register']");

function setStatus(message, isError = false) {
    statusEl.textContent = message;
    statusEl.style.color = isError ? "#dc2626" : "#475569";
}

async function handleRegister(event) {
    event.preventDefault();
    const data = new FormData(event.target);
    const payload = Object.fromEntries(data.entries());
    setStatus("Регистрирую...");

    try {
        const response = await fetch(`${API_BASE_URL}/auth/register`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail ?? "Не удалось зарегистрироваться");
        }

        const dataJson = await response.json();
        localStorage.setItem("access_token", dataJson.access_token);
        setStatus("Успешно! Перенаправляю...");
        setTimeout(() => {
            window.location.href = "./index.html";
        }, 800);
    } catch (error) {
        if (error.name === "TypeError") {
            setStatus("Сервер недоступен. Проверьте запуск backend.", true);
        } else {
            setStatus(error.message, true);
        }
    }
}

registerForm.addEventListener("submit", handleRegister);


