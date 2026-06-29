const Order = require("../models/order");
const Razorpay = require("razorpay");
const crypto = require('crypto');

const razorpay = new Razorpay({
  key_id: process.env.ROZER_PAY_TEST_KEY,
  key_secret: process.env.ROZER_PAY_TEST_KEY_SECRET,
});

async function createOrder(req, res, next) {
  try {
    const { productId, amount } = req.body;
    console.log(productId, amount);
    const order = await razorpay.orders.create({
      amount: amount * 100,
      currency: "INR",
      receipt: `order_of_product_${productId}`,
    });
    await Order.create({
      productId: productId,
      amount: amount,
      currency: "INR",
      razorpayOrderId: order.id,
      razorpayPaymentId: null,
      razorpaySignature: null,
      status: "pending",
    });
    res.status(201).json({
      message: "Order created successfully",
      order: order,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      message: error,
      status: "error",
    });
  }
}

async function verifyPayment(req, res, next) {
  try {
    const { orderId, paymentId, signature } = req.body;
    const shasum = crypto.createHmac('sha256', process.env.ROZER_PAY_TEST_KEY_SECRET);
    shasum.update(`${orderId}|${paymentId}`);
    const digest = shasum.digest('hex');
    if (digest !== signature) {
      return res.status(400).json({
        message: 'Payment verification failed',
        status: 'error'
      })
    }
    const order = await Order.findOne({
      where: {
        razorpayOrderId: orderId
      }
    })
    if (!order) {
      return res.status(404).json({
        message: 'Order not found',
        status: 'error'
      })
    }
    if (order.status === 'paid') {
      return res.status(400).json({
        message: 'Order already paid',
        status: 'error'
      })
    }
    order.razorpayPaymentId = paymentId;
    order.razorpaySignature = signature;
    order.status = 'paid';
    await order.save();
    console.log(order);
    res.status(200).json({
      message: 'Payment verified successfully',
      status: 'success'
    })

  } catch (error) {
    console.log(error);
  }
}

module.exports = {
  createOrder,
  verifyPayment
};
