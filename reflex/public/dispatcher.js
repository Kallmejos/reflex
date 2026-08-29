async function loadDashboard() {
    try {
        const deliveriesResponse = await fetch("/api/deliveries");
        const ridersResponse = await fetch("/api/riders");

        const deliveries = await deliveriesResponse.json();
        const riders = await ridersResponse.json();

        const created = deliveries.filter(
            delivery => delivery.status === "CREATED"
        );

        const assigned = deliveries.filter(
            delivery => delivery.status === "ASSIGNED"
        );

        const pickedUp = deliveries.filter(
            delivery => delivery.status === "PICKED_UP"
        );

        const delivered = deliveries.filter(
            delivery => delivery.status === "DELIVERED"
        );

        const availableRiders = riders.filter(
            rider => rider.availability === "AVAILABLE"
        );

        document.getElementById("createdDeliveries").textContent =
            created.length;

        document.getElementById("assignedDeliveries").textContent =
            assigned.length;

        document.getElementById("pickedUpDeliveries").textContent =
            pickedUp.length;

        document.getElementById("deliveredDeliveries").textContent =
            delivered.length;

        document.getElementById("availableRiders").textContent =
            availableRiders.length;

        displayDeliveries(deliveries, riders);

    } catch (error) {

        console.error(error);

        document.getElementById("deliveries").innerHTML =
            "<p>Unable to load dashboard data.</p>";
    }
}


function displayDeliveries(deliveries, riders) {

    const container = document.getElementById("deliveries");

    if (deliveries.length === 0) {
        container.innerHTML = "<p>No deliveries found.</p>";
        return;
    }

    container.innerHTML = deliveries.map(delivery => {

        let riderInformation = "";

        if (delivery.rider_name) {

            riderInformation = `
                <p>
                    <strong>Rider:</strong>
                    ${delivery.rider_name}
                </p>

                <p>
                    <strong>Fleet:</strong>
                    ${delivery.rider_fleet_no}
                </p>

                <p>
                    <strong>Motorcycle:</strong>
                    ${delivery.rider_plate_no}
                </p>
            `;
        }

        let assignmentSection = "";

        if (delivery.status === "CREATED") {

            const availableRiders = riders.filter(
                rider => rider.availability === "AVAILABLE"
            );

            const riderOptions = availableRiders.map(rider => `
                <option value="${rider.id}">
                    ${rider.name} - ${rider.fleet_no} - ${rider.plate_no}
                </option>
            `).join("");

            assignmentSection = `

                <div class="assignment-section">

                    <h4>Assign Delivery</h4>

                    <button
                        onclick="autoAssign(${delivery.id})">
                        Auto Assign Available Rider
                    </button>

                    <p>OR</p>

                    <label>Select Rider</label>

                    <select id="rider-${delivery.id}">

                        <option value="">
                            Select an available rider
                        </option>

                        ${riderOptions}

                    </select>

                    <button
                        onclick="assignRider(${delivery.id})">
                        Assign Selected Rider
                    </button>

                    <p id="result-${delivery.id}"></p>

                </div>
            `;
        }
// OTP stage
if (delivery.status === "PICKED_UP") {

    assignmentSection = `
        <div class="otp-section">

            <p>
                <strong>Delivery picked up.</strong>
            </p>

            <button onclick="generateOTP(${delivery.id})">
                Generate Recipient OTP
            </button>

            <p id="otp-result-${delivery.id}"></p>

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
                    <strong>Payment:</strong>
                    ${delivery.payment_method || "Not specified"}
                </p>

                <p>
                    <strong>Status:</strong>
                    ${delivery.status}
                </p>

                ${riderInformation}

                ${assignmentSection}

            </div>
        `;

    }).join("");
}


// Automatic rider assignment
async function autoAssign(deliveryId) {

    const result =
        document.getElementById(`result-${deliveryId}`);

    result.textContent = "Finding an available rider...";

    try {

        const response = await fetch(
            `/api/deliveries/${deliveryId}/auto-assign`,
            {
                method: "POST"
            }
        );

        const data = await response.json();

        if (!response.ok) {
            throw new Error(
                data.error || "Automatic assignment failed"
            );
        }

        result.textContent =
            `Delivery automatically assigned to ${data.rider.name}.`;

        loadDashboard();

    } catch (error) {

        result.textContent = error.message;
    }
}


// Manual rider assignment
async function assignRider(deliveryId) {

    const riderSelect =
        document.getElementById(`rider-${deliveryId}`);

    const riderId =
        Number(riderSelect.value);

    if (!riderId) {

        alert("Please select a rider first.");

        return;
    }

    try {

        const response = await fetch(
            `/api/deliveries/${deliveryId}/assign`,
            {
                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({
                    riderId
                })
            }
        );

        const data = await response.json();

        if (!response.ok) {

            throw new Error(
                data.error || "Assignment failed"
            );
        }

        document.getElementById(
            `result-${deliveryId}`
        ).textContent =
            "Rider assigned successfully.";

        loadDashboard();

    } catch (error) {

        document.getElementById(
            `result-${deliveryId}`
        ).textContent =
            error.message;
    }
}
async function generateOTP(deliveryId) {

    const result =
        document.getElementById(`otp-result-${deliveryId}`);

    result.textContent = "Generating OTP...";

    try {

        const response = await fetch(
            `/api/deliveries/${deliveryId}/generate-otp`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                }
            }
        );

        const data = await response.json();

        if (!response.ok) {
            throw new Error(
                data.error || "OTP generation failed"
            );
        }

        result.textContent =
            `Recipient OTP: ${data.otp}`;

    } catch (error) {

        result.textContent = error.message;
    }
}

// Load dashboard when page opens
loadDashboard();


// Refresh automatically every 5 seconds
setInterval(loadDashboard, 5000);