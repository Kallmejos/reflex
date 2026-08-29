const riderId =
    Number(sessionStorage.getItem("riderId"));

if (!riderId) {
    window.location.href = "/rider-login.html";
}

async function loadRiderDashboard() {
    try {
        const riderResponse = await fetch("/api/riders");
        const riders = await riderResponse.json();

        const rider = riders.find(
            rider => rider.id === riderId
        );

        if (!rider) {
            throw new Error("Rider not found");
        }

        document.getElementById("riderInfo").textContent =
            `${rider.name} | ${rider.fleet_no} | ${rider.plate_no}`;

        const response = await fetch(
            `/api/riders/${riderId}/deliveries`
        );

        const deliveries = await response.json();

        displayDeliveries(deliveries);

    } catch (error) {
        console.error(error);

        document.getElementById("deliveries").innerHTML =
            `<p>${error.message}</p>`;
    }
}


function displayDeliveries(deliveries) {

    const container = document.getElementById("deliveries");

    if (deliveries.length === 0) {
        container.innerHTML =
            "<p>No deliveries assigned to you.</p>";
        return;
    }

    container.innerHTML = deliveries.map(delivery => {

        let actionSection = "";

        // Pickup stage
        if (delivery.status === "ASSIGNED") {

            actionSection = `
                <div class="pickup-section">

                    <label>
                        Scan or enter barcode
                    </label>

                    <input
                        type="text"
                        id="barcode-${delivery.id}"
                        placeholder="Enter barcode"
                    >

                    <button onclick="confirmPickup(${delivery.id})">
                        Confirm Pickup
                    </button>

                    <p id="pickup-result-${delivery.id}"></p>

                </div>
            `;
        }

        // Delivery confirmation stage
if (delivery.status === "PICKED_UP") {

    actionSection = `
        <div class="otp-section">

            <p>
                <strong>
                    Delivery is ready for confirmation.
                </strong>
            </p>

            <p>
                Ask the recipient for the 6-digit OTP.
            </p>

            <input
                type="text"
                id="otp-${delivery.id}"
                placeholder="Enter recipient OTP"
                maxlength="6"
            >

            <button onclick="verifyOTP(${delivery.id})">
                Confirm Delivery
            </button>

            <p id="verify-result-${delivery.id}"></p>

        </div>
    `;
}

        return `
            <div class="delivery-card">

                <h3>${delivery.delivery_code}</h3>

                <p>
                    <strong>Customer:</strong>
                    ${delivery.customer_name}
                </p>

                <p>
                    <strong>Phone:</strong>
                    ${delivery.customer_phone}
                </p>

                <p>
                    <strong>Address:</strong>
                    ${delivery.address}
                </p>

                <p>
                    <strong>Item:</strong>
                    ${delivery.item_description}
                </p>

                <p>
                    <strong>Barcode:</strong>
                    ${delivery.barcode}
                </p>

                <p>
                    <strong>Status:</strong>
                    ${delivery.status}
                </p>

                ${actionSection}

            </div>
        `;

    }).join("");
}


async function confirmPickup(deliveryId) {

    const barcodeInput =
        document.getElementById(`barcode-${deliveryId}`);

    const barcode = barcodeInput.value.trim();

    if (!barcode) {
        alert("Please enter the barcode.");
        return;
    }

    const resultElement =
        document.getElementById(`pickup-result-${deliveryId}`);

    resultElement.textContent = "Verifying barcode...";

    try {

        const response = await fetch(
            `/api/deliveries/${deliveryId}/scan`,
            {
                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({
                    riderId,
                    barcode
                })
            }
        );

        const data = await response.json();

        if (!response.ok) {
            throw new Error(
                data.error || "Pickup verification failed"
            );
        }

        resultElement.textContent =
            "Pickup confirmed successfully.";

        loadRiderDashboard();

    } catch (error) {

        resultElement.textContent =
            error.message;
    }
}





async function verifyOTP(deliveryId) {

    const otpInput =
        document.getElementById(`otp-${deliveryId}`);

    const otp = otpInput.value.trim();

    if (!otp) {
        alert("Please enter the recipient OTP.");
        return;
    }

    const resultElement =
        document.getElementById(`verify-result-${deliveryId}`);

    resultElement.textContent =
        "Verifying OTP...";

    try {

        const response = await fetch(
            `/api/deliveries/${deliveryId}/verify-otp`,
            {
                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({
                    otp
                })
            }
        );

        const data = await response.json();

        if (!response.ok) {
            throw new Error(
                data.error || "OTP verification failed"
            );
        }

        resultElement.textContent =
            "Delivery confirmed successfully.";

        loadRiderDashboard();

    } catch (error) {

        resultElement.textContent =
            error.message;
    }
}


loadRiderDashboard();