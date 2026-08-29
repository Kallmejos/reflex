const express = require("express");
const Database = require("better-sqlite3");
const path = require("path");

const app = express();
const PORT = 3000;

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// Database
const db = new Database("./database/reflex.db");
// Create riders table if it doesn't exist
db.exec(`
    CREATE TABLE IF NOT EXISTS riders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        phone TEXT NOT NULL,
        fleet_no TEXT UNIQUE NOT NULL,
        plate_no TEXT UNIQUE NOT NULL,
        availability TEXT NOT NULL DEFAULT 'AVAILABLE'
    )
`);
// Add test riders if the table is empty
const riderCount = db
    .prepare("SELECT COUNT(*) AS count FROM riders")
    .get().count;

if (riderCount === 0) {
    const insertRider = db.prepare(`
        INSERT INTO riders (
            name,
            phone,
            fleet_no,
            plate_no,
            availability
        )
        VALUES (?, ?, ?, ?, ?)
    `);

    insertRider.run(
        "John Kamau",
        "0712345678",
        "FL-017",
        "KDA 123A",
        "AVAILABLE"
    );

    insertRider.run(
        "Mary Wanjiku",
        "0723456789",
        "FL-023",
        "KDB 456B",
        "AVAILABLE"
    );
}
// Create deliveries table if it doesn't exist
db.exec(`
    CREATE TABLE IF NOT EXISTS deliveries (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        delivery_code TEXT UNIQUE NOT NULL,
        customer_name TEXT NOT NULL,
        customer_phone TEXT NOT NULL,
        customer_email TEXT,
        address TEXT NOT NULL,
        item_description TEXT NOT NULL,
        barcode TEXT UNIQUE NOT NULL,
        payment_method TEXT,
        status TEXT NOT NULL DEFAULT 'CREATED',
        created_at TEXT NOT NULL
    )
`);
// Add OTP columns if they don't already exist
const deliveryColumns = db
    .prepare("PRAGMA table_info(deliveries)")
    .all()
    .map(column => column.name);

if (!deliveryColumns.includes("otp_code")) {
    db.exec(`
        ALTER TABLE deliveries
        ADD COLUMN otp_code TEXT
    `);
}

if (!deliveryColumns.includes("otp_verified")) {
    db.exec(`
        ALTER TABLE deliveries
        ADD COLUMN otp_verified INTEGER NOT NULL DEFAULT 0
    `);
}
// Create delivery
app.post("/api/deliveries", (req, res) => {
    const {
        customerName,
        customerPhone,
        customerEmail,
        address,
        itemDescription,
        barcode,
        paymentMethod
    } = req.body;

    // Basic validation
    if (
        !customerName ||
        !customerPhone ||
        !address ||
        !itemDescription ||
        !barcode
    ) {
        return res.status(400).json({
            error: "Missing required delivery information"
        });
    }

    // Generate delivery code
    const nextId = db
        .prepare("SELECT COALESCE(MAX(id), 0) + 1 AS nextId FROM deliveries")
        .get().nextId;

    const deliveryCode = `DEL-${String(nextId).padStart(6, "0")}`;

    const createdAt = new Date().toISOString();

    try {
        const statement = db.prepare(`
            INSERT INTO deliveries (
                delivery_code,
                customer_name,
                customer_phone,
                customer_email,
                address,
                item_description,
                barcode,
                payment_method,
                status,
                created_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        const result = statement.run(
            deliveryCode,
            customerName,
            customerPhone,
            customerEmail || null,
            address,
            itemDescription,
            barcode,
            paymentMethod || null,
            "CREATED",
            createdAt
        );

        const delivery = db
            .prepare("SELECT * FROM deliveries WHERE id = ?")
            .get(result.lastInsertRowid);

        res.status(201).json({
            message: "Delivery created successfully",
            delivery
        });

    } catch (error) {
        if (error.code === "SQLITE_CONSTRAINT_UNIQUE") {
            return res.status(409).json({
                error: "A delivery with this barcode already exists"
            });
        }

        console.error(error);

        res.status(500).json({
            error: "Failed to create delivery"
        });
    }
});

// Get all deliveries
app.get("/api/deliveries", (req, res) => {
    const deliveries = db.prepare(`
        SELECT
            deliveries.*,
            riders.name AS rider_name,
            riders.phone AS rider_phone,
            riders.fleet_no AS rider_fleet_no,
            riders.plate_no AS rider_plate_no
        FROM deliveries
        LEFT JOIN assignments
            ON deliveries.id = assignments.delivery_id
        LEFT JOIN riders
            ON assignments.rider_id = riders.id
        ORDER BY deliveries.id DESC
    `).all();

    res.json(deliveries);
});
app.get("/api/riders", (req, res) => {
    const riders = db
        .prepare("SELECT * FROM riders ORDER BY id")
        .all();

    res.json(riders);
});
// Create assignments table
db.exec(`
    CREATE TABLE IF NOT EXISTS assignments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        delivery_id INTEGER NOT NULL,
        rider_id INTEGER NOT NULL,
        assigned_at TEXT NOT NULL,
        FOREIGN KEY (delivery_id) REFERENCES deliveries(id),
        FOREIGN KEY (rider_id) REFERENCES riders(id),
        UNIQUE (delivery_id)
    )
`);// Assign a rider to a delivery
app.post("/api/deliveries/:id/assign", (req, res) => {
    const deliveryId = Number(req.params.id);
    const { riderId } = req.body;

    // Validate IDs
    if (!Number.isInteger(deliveryId) || !Number.isInteger(riderId)) {
        return res.status(400).json({
            error: "Valid delivery ID and rider ID are required"
        });
    }

    // Find the delivery
    const delivery = db
        .prepare("SELECT * FROM deliveries WHERE id = ?")
        .get(deliveryId);

    if (!delivery) {
        return res.status(404).json({
            error: "Delivery not found"
        });
    }

    // Only CREATED deliveries can be assigned
    if (delivery.status !== "CREATED") {
        return res.status(409).json({
            error: "Delivery is not available for assignment"
        });
    }

    // Find the rider
    const rider = db
        .prepare("SELECT * FROM riders WHERE id = ?")
        .get(riderId);

    if (!rider) {
        return res.status(404).json({
            error: "Rider not found"
        });
    }

    // Rider must be available
    if (rider.availability !== "AVAILABLE") {
        return res.status(409).json({
            error: "Rider is not available"
        });
    }

    try {
        // Create assignment
        const assignment = db.prepare(`
            INSERT INTO assignments (
                delivery_id,
                rider_id,
                assigned_at
            )
            VALUES (?, ?, ?)
        `);

        assignment.run(
            deliveryId,
            riderId,
            new Date().toISOString()
        );

        // Update delivery status
        db.prepare(`
            UPDATE deliveries
            SET status = 'ASSIGNED'
            WHERE id = ?
        `).run(deliveryId);

        // Mark rider as busy
        db.prepare(`
            UPDATE riders
            SET availability = 'BUSY'
            WHERE id = ?
        `).run(riderId);

        res.status(201).json({
            message: "Delivery assigned successfully",
            deliveryId,
            riderId
        });

    } catch (error) {
        console.error(error);

        if (error.code === "SQLITE_CONSTRAINT_UNIQUE") {
            return res.status(409).json({
                error: "Delivery has already been assigned"
            });
        }

        res.status(500).json({
            error: "Failed to assign delivery"
        });
    }
});-
// Scan barcode and confirm pickup
app.post("/api/deliveries/:id/scan", (req, res) => {
    const deliveryId = Number(req.params.id);
    const { riderId, barcode } = req.body;

    // Validate input
    if (
        !Number.isInteger(deliveryId) ||
        !Number.isInteger(riderId) ||
        !barcode
    ) {
        return res.status(400).json({
            error: "Valid delivery ID, rider ID, and barcode are required"
        });
    }

    // Find delivery
    const delivery = db
        .prepare("SELECT * FROM deliveries WHERE id = ?")
        .get(deliveryId);

    if (!delivery) {
        return res.status(404).json({
            error: "Delivery not found"
        });
    }

    // Delivery must be assigned
    if (delivery.status !== "ASSIGNED") {
        return res.status(409).json({
            error: "Delivery is not ready for pickup"
        });
    }

    // Check assignment
    const assignment = db
        .prepare(`
            SELECT *
            FROM assignments
            WHERE delivery_id = ? AND rider_id = ?
        `)
        .get(deliveryId, riderId);

    if (!assignment) {
        return res.status(403).json({
            error: "Rider is not assigned to this delivery"
        });
    }

    // Check barcode
    if (barcode !== delivery.barcode) {
        return res.status(409).json({
            error: "Barcode mismatch. Please verify the item."
        });
    }

    // Barcode is correct - update delivery
    db.prepare(`
        UPDATE deliveries
        SET status = 'PICKED_UP'
        WHERE id = ?
    `).run(deliveryId);

    res.json({
        message: "Barcode verified and pickup confirmed",
        deliveryId,
        status: "PICKED_UP"
    });
});
// Generate OTP for a delivery
app.post("/api/deliveries/:id/generate-otp", (req, res) => {
    const deliveryId = Number(req.params.id);

    if (!Number.isInteger(deliveryId)) {
        return res.status(400).json({
            error: "Valid delivery ID is required"
        });
    }

    const delivery = db
        .prepare("SELECT * FROM deliveries WHERE id = ?")
        .get(deliveryId);

    if (!delivery) {
        return res.status(404).json({
            error: "Delivery not found"
        });
    }

    // OTP should only be generated after pickup
    if (delivery.status !== "PICKED_UP") {
        return res.status(409).json({
            error: "OTP can only be generated for a picked-up delivery"
        });
    }

    // Generate a six-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    db.prepare(`
        UPDATE deliveries
        SET otp_code = ?, otp_verified = 0
        WHERE id = ?
    `).run(otp, deliveryId);

    res.json({
        message: "OTP generated successfully",
        deliveryId,
        otp
    });
});
// Verify delivery OTP


// Update rider availability
app.patch("/api/riders/:id/availability", (req, res) => {
    const riderId = Number(req.params.id);
    const { availability } = req.body;

    if (!Number.isInteger(riderId)) {
        return res.status(400).json({
            error: "Valid rider ID is required"
        });
    }

    if (!["AVAILABLE", "BUSY"].includes(availability)) {
        return res.status(400).json({
            error: "Availability must be AVAILABLE or BUSY"
        });
    }

    const rider = db
        .prepare("SELECT * FROM riders WHERE id = ?")
        .get(riderId);

    if (!rider) {
        return res.status(404).json({
            error: "Rider not found"
        });
    }

    db.prepare(`
        UPDATE riders
        SET availability = ?
        WHERE id = ?
    `).run(availability, riderId);

    const updatedRider = db
        .prepare("SELECT * FROM riders WHERE id = ?")
        .get(riderId);

    res.json({
        message: "Rider availability updated successfully",
        rider: updatedRider
    });
});
// Get deliveries assigned to a specific rider
app.get("/api/riders/:id/deliveries", (req, res) => {
    const riderId = Number(req.params.id);

    if (!Number.isInteger(riderId)) {
        return res.status(400).json({
            error: "Valid rider ID is required"
        });
    }

    // Check that rider exists
    const rider = db
        .prepare("SELECT * FROM riders WHERE id = ?")
        .get(riderId);

    if (!rider) {
        return res.status(404).json({
            error: "Rider not found"
        });
    }

    const deliveries = db.prepare(`
        SELECT
            deliveries.id,
            deliveries.delivery_code,
            deliveries.customer_name,
            deliveries.customer_phone,
            deliveries.address,
            deliveries.item_description,
            deliveries.barcode,
            deliveries.payment_method,
            deliveries.status,
            deliveries.created_at,
            assignments.assigned_at
        FROM assignments
        INNER JOIN deliveries
            ON assignments.delivery_id = deliveries.id
        WHERE assignments.rider_id = ?
        ORDER BY deliveries.id DESC
    `).all(riderId);

    res.json(deliveries);
});
// Rider login
app.get("/api/riders/login", (req, res) => {

    const phone = req.query.phone;

    if (!phone) {
        return res.status(400).json({
            error: "Phone number is required"
        });
    }

    const rider = db
        .prepare(`
            SELECT id, name, phone, fleet_no, plate_no, availability
            FROM riders
            WHERE phone = ?
        `)
        .get(phone);

    if (!rider) {
        return res.status(401).json({
            error: "Rider account not found"
        });
    }

    res.json({
        message: "Login successful",
        rider
    });
});
// Assign a delivery to a rider
app.post("/api/assignments", (req, res) => {

    const { deliveryId, riderId } = req.body;

    if (!deliveryId || !riderId) {
        return res.status(400).json({
            error: "Delivery ID and rider ID are required"
        });
    }

    const delivery = db
        .prepare("SELECT * FROM deliveries WHERE id = ?")
        .get(deliveryId);

    if (!delivery) {
        return res.status(404).json({
            error: "Delivery not found"
        });
    }

    const rider = db
        .prepare("SELECT * FROM riders WHERE id = ?")
        .get(riderId);

    if (!rider) {
        return res.status(404).json({
            error: "Rider not found"
        });
    }

    // Delivery must still be available for assignment
    if (delivery.status !== "CREATED") {
        return res.status(409).json({
            error: `Delivery cannot be assigned because its status is ${delivery.status}`
        });
    }

    // Rider must be available
    if (rider.availability !== "AVAILABLE") {
        return res.status(409).json({
            error: "Rider is currently unavailable"
        });
    }

    // Prevent duplicate assignment
    const existingAssignment = db
        .prepare(`
            SELECT *
            FROM assignments
            WHERE delivery_id = ?
        `)
        .get(deliveryId);

    if (existingAssignment) {
        return res.status(409).json({
            error: "Delivery is already assigned"
        });
    }

    const assignedAt = new Date().toISOString();

    const assign = db.transaction(() => {

        db.prepare(`
            INSERT INTO assignments (
                delivery_id,
                rider_id,
                assigned_at
            )
            VALUES (?, ?, ?)
        `).run(
            deliveryId,
            riderId,
            assignedAt
        );

        db.prepare(`
            UPDATE deliveries
            SET status = 'ASSIGNED'
            WHERE id = ?
        `).run(deliveryId);

        db.prepare(`
            UPDATE riders
            SET availability = 'BUSY'
            WHERE id = ?
        `).run(riderId);

    });

    try {

        assign();

        res.status(201).json({
            message: "Delivery assigned successfully",
            deliveryId,
            riderId,
            status: "ASSIGNED"
        });

    } catch (error) {

        console.error(error);

        res.status(500).json({
            error: "Failed to assign delivery"
        });
    }
});
// Verify delivery OTP and complete delivery
app.post("/api/deliveries/:id/verify-otp", (req, res) => {

    const deliveryId = Number(req.params.id);
    const { otp } = req.body;

    if (!Number.isInteger(deliveryId)) {
        return res.status(400).json({
            error: "Invalid delivery ID"
        });
    }

    if (!otp) {
        return res.status(400).json({
            error: "OTP is required"
        });
    }

    // Find delivery
    const delivery = db
        .prepare("SELECT * FROM deliveries WHERE id = ?")
        .get(deliveryId);

    if (!delivery) {
        return res.status(404).json({
            error: "Delivery not found"
        });
    }

    // Check delivery status
    if (delivery.status !== "PICKED_UP") {
        return res.status(409).json({
            error: `OTP cannot be verified because delivery status is ${delivery.status}`
        });
    }

    // Check OTP
    if (String(delivery.otp_code) !== String(otp)) {
        return res.status(400).json({
            error: "Incorrect OTP. Delivery not completed."
        });
    }

    // Complete delivery and release rider
    const completeDelivery = db.transaction(() => {

        db.prepare(`
            UPDATE deliveries
            SET
                status = 'DELIVERED',
                otp_verified = 1
            WHERE id = ?
        `).run(deliveryId);

        db.prepare(`
            UPDATE riders
            SET availability = 'AVAILABLE'
            WHERE id = (
                SELECT rider_id
                FROM assignments
                WHERE delivery_id = ?
            )
        `).run(deliveryId);

    });

    try {

        completeDelivery();

        res.json({
            message: "Delivery completed successfully",
            deliveryId,
            status: "DELIVERED"
        });

    } catch (error) {

        console.error(error);

        res.status(500).json({
            error: "Failed to complete delivery"
        });
    }
});
// Automatically assign the first available rider
app.post("/api/deliveries/:id/auto-assign", (req, res) => {

    const deliveryId = Number(req.params.id);

    if (!Number.isInteger(deliveryId)) {
        return res.status(400).json({
            error: "Invalid delivery ID"
        });
    }

    const delivery = db
        .prepare("SELECT * FROM deliveries WHERE id = ?")
        .get(deliveryId);

    if (!delivery) {
        return res.status(404).json({
            error: "Delivery not found"
        });
    }

    if (delivery.status !== "CREATED") {
        return res.status(409).json({
            error: `Delivery cannot be assigned because its status is ${delivery.status}`
        });
    }

    const rider = db
        .prepare(`
            SELECT *
            FROM riders
            WHERE availability = 'AVAILABLE'
            ORDER BY id
            LIMIT 1
        `)
        .get();

    if (!rider) {
        return res.status(409).json({
            error: "No riders are currently available"
        });
    }

    const assignedAt = new Date().toISOString();

    try {

        const autoAssign = db.transaction(() => {

            db.prepare(`
                INSERT INTO assignments (
                    delivery_id,
                    rider_id,
                    assigned_at
                )
                VALUES (?, ?, ?)
            `).run(
                deliveryId,
                rider.id,
                assignedAt
            );

            db.prepare(`
                UPDATE deliveries
                SET status = 'ASSIGNED'
                WHERE id = ?
            `).run(deliveryId);

            db.prepare(`
                UPDATE riders
                SET availability = 'BUSY'
                WHERE id = ?
            `).run(rider.id);

        });

        autoAssign();

        res.status(201).json({
            message: "Delivery automatically assigned",
            deliveryId,
            rider: {
                id: rider.id,
                name: rider.name,
                phone: rider.phone,
                fleet_no: rider.fleet_no,
                plate_no: rider.plate_no
            },
            status: "ASSIGNED"
        });

    } catch (error) {

        console.error(error);

        res.status(500).json({
            error: "Automatic assignment failed"
        });
    }
});
// Start server
app.listen(PORT, () => {
    console.log(`Reflex server is running on port ${PORT}`);
});