const API_BASE_URL = "http://localhost:8000/api/v1";

const statusEl = document.getElementById("status");
const itemsListEl = document.getElementById("items-list");
const authSection = document.getElementById("auth-section");
const homeSection = document.getElementById("home-section");
const welcomeText = document.getElementById("welcome-text");
const logoutBtn = document.getElementById("logout-btn");
const refreshBtn = document.getElementById("refresh-btn");
const loginForm = document.getElementById("login-form");
const formStatuses = document.querySelectorAll(".form-status");

let token = localStorage.getItem("access_token");
let currentUser = null;

function setFormStatus(type, message, isError = false) {
  const el = Array.from(formStatuses).find(
    (node) => node.dataset.for === type
  );
  if (el) {
    el.textContent = message;
    el.style.color = isError ? "#dc2626" : "#475569";
  }
}

function switchToHome() {
  authSection.classList.add("hidden");
  homeSection.classList.remove("hidden");
  logoutBtn.classList.remove("hidden");
}

function switchToAuth() {
  authSection.classList.remove("hidden");
  homeSection.classList.add("hidden");
  logoutBtn.classList.add("hidden");
  statusEl.textContent = "Авторизуйтесь, чтобы получить данные.";
  itemsListEl.innerHTML = "";
}

async function fetchItems() {
  if (!token) {
    statusEl.textContent = "Нет токена. Войдите ещё раз.";
    return;
  }

  try {
    statusEl.textContent = "Получаю элементы...";
    const response = await fetch(`${API_BASE_URL}/items`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Ошибка API: ${response.status}`);
    }

    const items = await response.json();
    renderItems(items);
    statusEl.textContent = `Получено элементов: ${items.length}`;
  } catch (error) {
    console.error(error);
    statusEl.textContent =
      "Не удалось загрузить данные. Проверьте соединение или авторизацию.";
  }
}

function renderItems(items) {
  itemsListEl.innerHTML = "";

  if (!items.length) {
    itemsListEl.innerHTML = "<li>Пусто</li>";
    return;
  }

  items.forEach((item) => {
    const li = document.createElement("li");
    li.textContent = `${item.id}: ${item.name ?? "Без названия"}`;
    itemsListEl.appendChild(li);
  });
}

async function fetchProfile() {
  if (!token) {
    switchToAuth();
    return;
  }

  try {
    const response = await fetch(`${API_BASE_URL}/auth/me`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    if (!response.ok) {
      throw new Error("Unauthorized");
    }
    currentUser = await response.json();
    welcomeText.textContent = currentUser.full_name || currentUser.email;
    switchToHome();
    await fetchItems();
  } catch (error) {
    console.error(error);
    logout();
  }
}

function logout() {
  token = null;
  currentUser = null;
  localStorage.removeItem("access_token");
  switchToAuth();
}

async function login(event) {
  event.preventDefault();
  const data = new FormData(event.target);
  const payload = new URLSearchParams({
    username: data.get("email"),
    password: data.get("password"),
  });
  setFormStatus("login", "Выполняю вход...");

  try {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: payload,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail ?? "Неверные данные");
    }

    const dataJson = await response.json();
    token = dataJson.access_token;
    localStorage.setItem("access_token", token);
    setFormStatus("login", "Успешно!");
    await fetchProfile();
    event.target.reset();
  } catch (error) {
    if (error.name === "TypeError") {
      setFormStatus(
        "login",
        "Сервер недоступен. Убедитесь, что backend запущен.",
        true,
      );
    } else {
      setFormStatus("login", error.message, true);
    }
  }
}

document.addEventListener("DOMContentLoaded", () => {
  loginForm.addEventListener("submit", login);
  logoutBtn.addEventListener("click", logout);
  refreshBtn.addEventListener("click", fetchItems);
  fetchProfile();
});

