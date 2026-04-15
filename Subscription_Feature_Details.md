# Subscription System Implementation - Details from A to Z

This document outlines the complete, step-by-step implementation of the Subscription Strategy (Free, Bronze, Silver, Gold plans) requested for the InternArea project. It details the integration of Razorpay, email invoices, and the rigid time constraints placed on payments.

## 1. Goal & Requirements
- **Plans**: Free (1/mo), Bronze (3/mo - ₹100), Silver (5/mo - ₹300), Gold (Unlimited - ₹1000).
- **Payment Gateway**: Razorpay.
- **Constraints**: Payments are strictly restricted between **10:00 AM and 11:00 AM IST**.
- **Post-Payment**: Automatically send an HTML invoice to the user's email via NodeMailer.
- **Budget**: Exactly ₹0 Server/Tooling cost.

---

## 2. Dependencies Installed
For the backend, the following strictly free libraries were added to `package.json`:
- `razorpay`: Core SDK to generate checkout sessions and verify webhooks.
- `nodemailer`: Tool to send free emails using a secure Gmail App Password.
- `node-cron`: Lightweight task scheduler to check for expired subscriptions daily.

*(No heavily dependent frontend libraries were used. The Razorpay checkout script is dynamically injected via a standard DOM `<script>` builder to keep your bundle size small).*

---

## 3. Database Modifications
**File:** `backend/Model/User.js`
We extended your existing User Schema to keep track of three new fields securely in MongoDB:
- `currentPlan`: An Enum consisting of `["Free", "Bronze", "Silver", "Gold"]` defaulting to `"Free"`.
- `applicationsUsedThisMonth`: A numerical counter starting at `0` that strictly limits normal users.
- `planExpiryDate`: A Date marker that stores when a paid plan should expire.

---

## 4. Backend Payment APIs & Constraints
**File:** `backend/Routes/payment.js`
We created a brand new router exclusively for subscription services.
1. **/checkout**:
   - The route creates an official Razorpay Order.
   - **Time Restriction Logic**: Before hitting Razorpay, it fetches the server's UTC time, immediately formats it into the `Asia/Kolkata` TimeZone (IST), and checks the current Hour. If the hour is explicitly not `10` (equivalent to `10:xx AM`), it throws a `403 Forbidden` error and blocks the payment. The frontend gracefully shows this error.
2. **/webhook**:
   - Webhooks are necessary because a user might exit the app right after paying, but the bank still clears it.
   - Once Razorpay guarantees the money in your account, it pings this route. We mathematically unpack the `SHA256` signature using your `RAZORPAY_KEY_SECRET` to ensure it's not a hacker faking a payment.
   - We query MongoDB and automatically update their `currentPlan` and bump the `planExpiryDate` by 1 Month.
   - **NodeMailer Integration**: In the same exact millisecond, `nodemailer` logs into my Gmail using the `EMAIL_PASS` (which bypasses 2-Factor Auth), constructs an HTML invoice detailing `Amount Paid`, `Payment ID` and `Name`, and drops it in the user's inbox.

---

## 5. Subscription Limiting Logic
**File:** `backend/Routes/application.js`
The payment gateway doesn't stop people from applying, the backend does.
- We hijacked your `router.post("/")` internship application endpoint.
- Before letting an applicant submit, it grabs their User ID (which supports both your legacy Firebase UID pattern and native MongoDB `_id`).
- It measures their `currentPlan` against a hashmap of allowed limits (`{Free: 1, Bronze: 3...}`).
- If `applicationsUsedThisMonth >= Hashmap Limit`, it prevents the MongoDB save and returns an error: *"You have reached your monthly application limit for the Free plan."*

---

## 6. Daily Cron Job Resetting
**File:** `backend/index.js`
- To ensure users don't get trapped on "Expired" subscriptions, we bound a `node-cron` daemon strictly to `app.listen`.
- Every night at Midnight (`"0 0 * * *"`), it runs a highly efficient `User.updateMany()` query across the entire database. If any user's `planExpiryDate` is older than the current timestamp, they are instantly downgraded to "Free" and their `applicationsUsedThisMonth` counter is zeroed out. 

---

## 7. Frontend User Interface
**File:** `internarea/src/pages/subscription/index.tsx`
- We built a dynamic, responsive Grid highlighting the 4 different tiers and their features.
- When an authenticated user clicks "Upgrade", it triggers a generic `loadScript` function that quietly downloads the Razorpay library in the background without affecting React render times.
- It queries the Vercel-Deployed Backend (or `localhost` depending on your environment variable settings) to securely get the Order ID.
- Once it grabs the ID, it fires open the beautiful Razorpay UI directly covering the browser window, letting users pay with standard UPI/Cards safely.

---

## 8. Environment Variable Routing
To tie everything together and make sure testing wouldn't accidentally break production, we split your Environment credentials.
- **Backend (`.env`)**: Holds the deep secrets `RAZORPAY_KEY_SECRET` and `EMAIL_PASS`. It was upgraded to include Safe-Guards—if the server starts *without* these keys (e.g. if Vercel failed to read them), the server refuses to crash. It instead prints a warning locally and disables the payment router.
- **Frontend (`.env.local`)**: Holds `NEXT_PUBLIC_RAZORPAY_KEY_ID`. Next.js requires the `NEXT_PUBLIC_` prefix so that it intentionally compiles that specific string straight into the client's browser. That is the only piece of the "key" we leak to the actual user, allowing them to render the modal.
