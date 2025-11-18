# Paystack Worker

This project is a Cloudflare Worker designed to handle Paystack webhooks. It validates events, confirms payments, saves transactions in Firestore, and updates both NGO and funder dashboards.

## Project Structure

```
paystack-worker
├── src
│   ├── index.js               # Entry point for the Cloudflare Worker
│   ├── paystack
│   │   ├── validateEvent.js   # Validates Paystack webhook events
│   │   └── confirmPayment.js   # Confirms payment status via Paystack API
│   ├── firestore
│   │   └── saveTransaction.js  # Saves transaction details to Firestore
│   ├── dashboards
│   │   ├── updateNGO.js       # Updates NGO dashboard with transaction info
│   │   └── updateFunder.js     # Updates funder dashboard with transaction info
│   └── utils
│       └── index.js           # Utility functions for the project
├── wrangler.toml              # Configuration for deploying the Cloudflare Worker
├── package.json               # npm configuration and dependencies
└── README.md                  # Project documentation
```

## Setup Instructions

1. **Clone the repository**:
   ```
   git clone <repository-url>
   cd paystack-worker
   ```

2. **Install dependencies**:
   ```
   npm install
   ```

3. **Configure environment variables**:
   Update the `wrangler.toml` file with your Paystack API keys and Firestore credentials.

4. **Deploy the Worker**:
   ```
   npx wrangler publish
   ```

## Usage Guidelines

- The Worker listens for incoming webhook events from Paystack.
- Ensure that the webhook URL is correctly set in your Paystack dashboard.
- The Worker will validate the event, confirm the payment, save the transaction, and update the respective dashboards.

## Contributing

Contributions are welcome! Please open an issue or submit a pull request for any enhancements or bug fixes.

## License

This project is licensed under the MIT License.