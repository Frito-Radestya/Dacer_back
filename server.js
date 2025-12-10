
require("dotenv").config()
const express = require("express")
const cors = require("cors")
const bodyParser = require("body-parser")
const midtransClient = require("midtrans-client")
const crypto = require("crypto")

const app = express()

app.use(
  cors({
    origin: ["http://localhost:5173", "http://localhost:5175"],
    credentials: true
  })
)
app.use(bodyParser.json())

const snap = new midtransClient.Snap({
  isProduction: process.env.MIDTRANS_IS_PRODUCTION === "true",
  serverKey: process.env.MIDTRANS_SERVER_KEY
})

app.get("/", (req, res) => {
  res.json({ message: "Midtrans backend running" })
})

// Sederhana: endpoint notifikasi untuk frontend
// TODO: sambungkan ke PostgreSQL / tabel notifikasi bila sudah siap
app.get("/api/notifications", (req, res) => {
  const { userId } = req.query

  const now = new Date()

  const notifications = [
    {
      id: 1,
      title: "Selamat datang di DagangCerdas",
      message: "Akun Anda sudah siap digunakan. Silakan mulai menambahkan produk dan toko.",
      created_at: now.toISOString(),
      user_id: userId || null
    },
    {
      id: 2,
      title: "Tips Pemakaian",
      message: "Gunakan menu Dashboard untuk melihat ringkasan penjualan harian.",
      created_at: now.toISOString(),
      user_id: userId || null
    }
  ]

  res.json(notifications)
})

app.post("/api/checkout", async (req, res) => {
  try {
    const { orderId, grossAmount, customer } = req.body

    if (!orderId || !grossAmount) {
      return res
        .status(400)
        .json({ error: "orderId dan grossAmount wajib diisi" })
    }

    const parameter = {
      transaction_details: {
        order_id: orderId,
        gross_amount: grossAmount
      },
      customer_details: {
        first_name: customer?.firstName || "Customer",
        email: customer?.email || "customer@example.com",
        phone: customer?.phone || "08123456789"
      },
      enabled_payments: ["gopay", "shopeepay", "other_qris"]
    }

    const transaction = await snap.createTransaction(parameter)
    const snapToken = transaction.token

    res.json({ snapToken })
  } catch (err) {
    console.error("Checkout error:", err)
    res.status(500).json({ error: "Internal Server Error" })
  }
})

function generateSignature (orderId, statusCode, grossAmount, serverKey) {
  return crypto
    .createHash("sha512")
    .update(orderId + statusCode + grossAmount + serverKey)
    .digest("hex")
}

app.post("/api/midtrans/notification", async (req, res) => {
  try {
    const notification = req.body

    const {
      order_id,
      status_code,
      gross_amount,
      signature_key,
      transaction_status,
      fraud_status
    } = notification

    const serverKey = process.env.MIDTRANS_SERVER_KEY
    const expectedSignature = generateSignature(
      order_id,
      status_code,
      gross_amount,
      serverKey
    )

    if (signature_key !== expectedSignature) {
      console.warn("Invalid signature from Midtrans")
      return res.status(403).json({ error: "Invalid signature" })
    }

    console.log("Notifikasi Midtrans:", {
      order_id,
      transaction_status,
      fraud_status
    })

    if (transaction_status === "capture" || transaction_status === "settlement") {
      console.log(`Order ${order_id} PAID`)
    } else if (transaction_status === "pending") {
      console.log(`Order ${order_id} PENDING`)
    } else if (
      transaction_status === "deny" ||
      transaction_status === "expire" ||
      transaction_status === "cancel"
    ) {
      console.log(`Order ${order_id} FAILED: ${transaction_status}`)
    }

    res.status(200).json({ message: "OK" })
  } catch (err) {
    console.error("Notification error:", err)
    res.status(500).json({ error: "Internal Server Error" })
  }
})

const PORT = process.env.PORT || 5000
app.listen(PORT, () => {
  console.log(`Backend listening on port ${PORT}`)
})

