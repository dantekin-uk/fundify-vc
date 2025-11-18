export default function validateEvent(request) {
  const signature = request.headers.get("x-paystack-signature");
  const payload = JSON.stringify(request.body);

  // Validate the signature
  const expectedSignature = crypto.createHmac("sha512", PAYSTACK_SECRET).update(payload).digest("hex");

  return signature === expectedSignature;
}