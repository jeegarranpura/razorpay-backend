# Payment Server — Razorpay Integration

A simple Node.js backend for creating Razorpay orders, verifying payments, and persisting order records in PostgreSQL.

## Features

- Create a Razorpay order and save it to the database
- Verify payment signatures using HMAC SHA-256
- Track order status (`pending`, `paid`, `failed`)

## Tech Stack

- **Runtime:** Node.js
- **Framework:** Express 5
- **Database:** PostgreSQL
- **ORM:** Sequelize
- **Payment gateway:** [Razorpay](https://razorpay.com/)

## Project Structure

```
payment-server/
├── config/
│   └── db.js              # PostgreSQL / Sequelize connection
├── controllers/
│   └── orderController.js # Order creation & payment verification
├── models/
│   └── order.js           # Order model
├── routes/
│   └── orderRoute.js      # API routes
├── server.js              # App entry point
├── .env                   # Environment variables (not committed)
└── package.json
```

## Prerequisites

- Node.js (v18+ recommended)
- PostgreSQL running locally or remotely
- A [Razorpay](https://dashboard.razorpay.com/) test account (Key ID & Key Secret)

## Getting Started

### 1. Clone and install

```bash
git clone <repository-url>
cd payment-server
npm install
```

### 2. Configure environment variables

Create a `.env` file in the project root:

```env
# Database
DB_NAME=e_commerce_db
DB_USER=postgres
DB_PASSWORD=your_password
DB_HOST=localhost
DB_PORT=5432
DB_DIALECT=postgres
DB_LOGGING=false

# Razorpay (test keys)
ROZER_PAY_TEST_KEY=rzp_test_xxxxxxxx
ROZER_PAY_TEST_KEY_SECRET=your_secret_key
```

> Use test keys from the Razorpay Dashboard → **Settings → API Keys**. Never commit real keys to version control.

### 3. Create the database

Create the PostgreSQL database named in `DB_NAME` before starting the server:

```sql
CREATE DATABASE e_commerce_db;
```

### 4. Start the server

```bash
npm start
```

The server runs on **http://localhost:8080**. On startup, Sequelize syncs the `orders` table automatically.

> **Note:** `sequelize.sync({ force: true })` is enabled in `server.js`, which drops and recreates tables on every restart. Disable or remove `force: true` in production.

## Payment Flow

```
Client                    Backend                     Razorpay
  │                          │                            │
  │── POST /create ─────────►│── orders.create() ────────►│
  │◄── razorpay order id ────│◄───────────────────────────│
  │                          │                            │
  │── Razorpay Checkout ──────────────────────────────────►│
  │◄── payment success ────────────────────────────────────│
  │                          │                            │
  │── POST /verify ─────────►│── HMAC signature check     │
  │◄── verified / failed ────│── update order status      │
```

1. Client calls **Create Order** with `productId` and `amount`.
2. Backend creates a Razorpay order and stores a pending record in PostgreSQL.
3. Client opens Razorpay Checkout using the returned order ID and your Key ID.
4. After payment, client sends `orderId`, `paymentId`, and `signature` to **Verify Payment**.
5. Backend validates the signature and marks the order as `paid`.

## API Reference

Base URL: `http://localhost:8080/api/v1/order`

### Create Order

Creates a Razorpay order and saves it to the database.

**`POST /create`**

| Field       | Type   | Required | Description                    |
|-------------|--------|----------|--------------------------------|
| `productId` | number | Yes      | Product identifier             |
| `amount`    | number | Yes      | Amount in INR (e.g. `500` = ₹500) |

**Request**

```json
{
  "productId": 1,
  "amount": 500
}
```

**Response — `201 Created`**

```json
{
  "message": "Order created successfully",
  "order": {
    "id": "order_xxxxxxxx",
    "amount": 50000,
    "currency": "INR",
    "receipt": "order_of_product_1"
  }
}
```

Use `order.id` from the response as the Razorpay `order_id` in your frontend checkout.

---

### Verify Payment

Verifies the Razorpay payment signature and updates the order status.

**`POST /verify`**

| Field       | Type   | Required | Description                          |
|-------------|--------|----------|--------------------------------------|
| `orderId`   | string | Yes      | Razorpay order ID                    |
| `paymentId` | string | Yes      | Razorpay payment ID from checkout    |
| `signature` | string | Yes      | Signature returned by Razorpay       |

**Request**

```json
{
  "orderId": "order_xxxxxxxx",
  "paymentId": "pay_xxxxxxxx",
  "signature": "xxxxxxxxxxxxxxxx"
}
```

**Response — `200 OK`**

```json
{
  "message": "Payment verified successfully",
  "status": "success"
}
```

**Error responses**

| Status | Message                        |
|--------|--------------------------------|
| `400`  | Payment verification failed    |
| `400`  | Order already paid             |
| `404`  | Order not found                |
| `500`  | Internal server error          |

## Order Model

| Column              | Type    | Description                          |
|---------------------|---------|--------------------------------------|
| `id`                | integer | Auto-increment primary key           |
| `productId`         | integer | Associated product ID                |
| `amount`            | float   | Order amount in INR                  |
| `currency`          | string  | Default: `INR`                       |
| `razorpayOrderId`   | string  | Razorpay order ID                    |
| `razorpayPaymentId` | string  | Set after successful payment         |
| `razorpaySignature` | string  | Set after successful payment         |
| `status`            | enum    | `pending` · `paid` · `failed`        |
| `createdAt`         | date    | Record creation timestamp            |

## Frontend Integration (Razorpay Checkout)

After calling `/create`, initialize Razorpay Checkout on the client:

```html
<script src="https://checkout.razorpay.com/v1/checkout.js"></script>
```

```javascript
const { order } = await fetch("http://localhost:8080/api/v1/order/create", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ productId: 1, amount: 500 }),
}).then((res) => res.json());

const options = {
  key: "rzp_test_xxxxxxxx",       // your ROZER_PAY_TEST_KEY
  amount: order.amount,
  currency: order.currency,
  order_id: order.id,
  handler: async function (response) {
    await fetch("http://localhost:8080/api/v1/order/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        orderId: response.razorpay_order_id,
        paymentId: response.razorpay_payment_id,
        signature: response.razorpay_signature,
      }),
    });
  },
};

const rzp = new Razorpay(options);
rzp.open();
```

## Scripts

| Command       | Description          |
|---------------|----------------------|
| `npm start`   | Start the server     |

## License

ISC
