async function login() {

    const phone =
        document.getElementById("phone").value.trim();

    const message =
        document.getElementById("message");

    if (!phone) {
        message.textContent =
            "Please enter your phone number.";

        return;
    }

    try {

        const response = await fetch(
            `/api/riders/login?phone=${encodeURIComponent(phone)}`
        );

        const data = await response.json();

        if (!response.ok) {
            throw new Error(
                data.error || "Login failed"
            );
        }

        // Store rider information for this session
        sessionStorage.setItem(
            "riderId",
            data.rider.id
        );

        sessionStorage.setItem(
            "riderName",
            data.rider.name
        );

        // Go to rider dashboard
        window.location.href = "/rider.html";

    } catch (error) {

        message.textContent =
            error.message;
    }
}