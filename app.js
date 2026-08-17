document.addEventListener("DOMContentLoaded", () => {

  const SUPABASE_URL = "https://jcmwjmaywkmnjrciziix.supabase.co";
  const SUPABASE_KEY = "sb_publishable_djOS3r_IKhZ42gAXR5svKA_VAhqTrmt";

  const login = document.querySelector(
    'button.login, button[class*="login"]'
  );

  if (login) {
    login.addEventListener("click", async () => {

      const email = prompt("Podaj adres e-mail:");
      if (!email) return;

      const password = prompt("Podaj hasło:");
      if (!password) return;

      try {
        const response = await fetch(
          `${SUPABASE_URL}/auth/v1/token?grant_type=password`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "apikey": SUPABASE_KEY
            },
            body: JSON.stringify({
              email: email,
              password: password
            })
          }
        );

        const data = await response.json();

        if (!response.ok) {
          alert(
            "Logowanie nieudane: " +
            (data.error_description || data.msg || "Błędny e-mail lub hasło")
          );
          return;
        }

        localStorage.setItem(
          "lap_chwile_session",
          JSON.stringify(data)
        );

        alert("Zalogowano pomyślnie!");

      } catch (error) {
        console.error(error);
        alert("Błąd połączenia z Supabase.");
      }
    });
  }
});
