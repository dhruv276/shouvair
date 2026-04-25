document.addEventListener("DOMContentLoaded", () => {
  const container = document.getElementById("container");
  const registerBtn = document.getElementById("register");
  const loginBtn = document.getElementById("login");

  if (registerBtn && loginBtn) {
      registerBtn.addEventListener("click", () => {
          container.classList.add("active");
      });

      loginBtn.addEventListener("click", () => {
          container.classList.remove("active");
      });
  }

  document.querySelector(".sign-up form").addEventListener("submit", async (e) => {
      e.preventDefault();

      let username = document.querySelector(".sign-up input[name='username']").value.trim();
      let password = document.querySelector(".sign-up input[name='password']").value.trim();

      if (!username || !password) {
          showMessage(".sign-up", "Please fill all fields", "error");
          return;
      }

      try {
          let response = await fetch("http://localhost:8080/register", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ username, password }),
          });

          let data = await response.json();

          if (response.ok) {
              showMessage(".sign-up", data.message, "success");
              container.classList.remove("active");
          } else {
              showMessage(".sign-up", data.message, "error");
          }
      } catch (error) {
          console.error("Error:", error);
          showMessage(".sign-up", "Server error. Try again later.", "error");
      }
  });

  document.querySelector(".sign-in form").addEventListener("submit", async (e) => {
      e.preventDefault();

      let username = document.querySelector(".sign-in input[name='username']").value.trim();
      let password = document.querySelector(".sign-in input[name='password']").value.trim();

      if (!username || !password) {
          showMessage(".sign-in", "Please fill all fields", "error");
          return;
      }

      try {
          let response = await fetch("http://localhost:8080/login", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ username, password }),
          });

          let data = await response.json();

          if (response.ok) {
              showMessage(".sign-in", data.message, "success");
              setTimeout(() => {
                  window.location.href = "dashboard";
              }, 1500);
          } else {
              showMessage(".sign-in", data.message, "error");
          }
      } catch (error) {
          console.error("Error:", error);
          showMessage(".sign-in", "Server error. Try again later.", "error");
      }
  });
  function showMessage(formClass, message, type) {
    let form = document.querySelector(formClass);
    let usernameField = form.querySelector("input[name='username']");
    
    if (!form || !usernameField) return; 
    let messageBox = form.querySelector(".message-box");
    if (!messageBox) {
        messageBox = document.createElement("div");
        messageBox.classList.add("message-box");
        usernameField.parentNode.insertBefore(messageBox, usernameField); 
    }

    messageBox.textContent = message;
    messageBox.style.color = type === "error" ? "red" : "green";
    messageBox.style.fontSize = "14px";
    messageBox.style.marginBottom = "5px"; 
    messageBox.style.textAlign = "left";
}
});
