const deliveryForm = document.getElementById("deliveryForm");
const result = document.getElementById("result");

deliveryForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const deliveryData = {
        customerName: document.getElementById("customerName").value,
        customerPhone: document.getElementById("customerPhone").value,
        customerEmail: document.getElementById("customerEmail").value,
        address: document.getElementById("address").value,
        itemDescription: document.getElementById("itemDescription").value,
        barcode: document.getElementById("barcode").value,
        paymentMethod: document.getElementById("paymentMethod").value
    };

    try {
        const response = await fetch("/api/deliveries", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(deliveryData)
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || "Failed to create delivery");
        }

        result.innerHTML = `
            <div class="success">
                <h2>Delivery Created</h2>
                <p>
                    Delivery ID:
                    <strong>${data.delivery.delivery_code}</strong>
                </p>
                <p>
                    Status:
                    <strong>${data.delivery.status}</strong>
                </p>
            </div>
        `;

        deliveryForm.reset();

    } catch (error) {

        result.innerHTML = `
            <div class="error">
                <strong>Error:</strong> ${error.message}
            </div>
        `;
    }
});