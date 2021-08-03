<!-- omit in toc -->
# PiGu

- [API Reference](#api-reference)
  - [Register user: `POST /register`](#register-user-post-register)
  - [Create shop: `createShop`](#create-shop-createshop)
  - [Create voucher: `createVoucher`](#create-voucher-createvoucher)
  - [Buy voucher: `buyVoucher`](#buy-voucher-buyvoucher)
  - [Redeem voucher: `redeemVoucher`](#redeem-voucher-redeemvoucher)
  - [Transfer voucher: `transferVoucher`](#transfer-voucher-transfervoucher)
  - [Stripe checkout](#stripe-checkout)
- [Firestore Schema](#firestore-schema)
  - [`user` collection](#user-collection)
  - [`shop` collection](#shop-collection)
  - [`voucher` collection](#voucher-collection)
- [Developer Guide](#developer-guide)
  - [Prerequisites](#prerequisites)
  - [Installing](#installing)
  - [Developing](#developing)

## API Reference

All response messages will adhere to the following unless otherwise stated:

```ts
type SuccessResponse = {
  success: true;
}

type ErrorResponse = {
  code: FunctionsErrorCode;
  message: string;
  details?: unknown | undefined;
};

type APIResponse = SuccessResponse | ErrorResponse;
```

### Register user: `POST /register`

> [HTTP request](https://firebase.google.com/docs/functions/http-events)

```ts
type RegisterRequest = {
  username: string;
  email: string;
  password: string;
}
```

- Success response: `204 NO CONTENT`
- Error response: `ErrorResponse`

### Create shop: `createShop`

> [HTTPS callable](https://firebase.google.com/docs/functions/callable)

- Called by any authenticated user

```ts
type CreateRequest = {
  name: string;
  tags?: string[] | undefined;
};
```

### Create voucher: `createVoucher`

> [HTTPS callable](https://firebase.google.com/docs/functions/callable)

- Called by any user who owns a shop

```ts
type CreateRequest = {
  title: string;
  price: number;
  shopId: string;
  description?: string | undefined;
  expireAt?: string | undefined;
};
```

### Buy voucher: `buyVoucher`

> [HTTPS callable](https://firebase.google.com/docs/functions/callable)

- Called by any authenticated user

```ts
type BuyRequest = {
  voucherId: string;
  // TODO: other stripe related stuff
}
```

### Redeem voucher: `redeemVoucher`

> [HTTPS callable](https://firebase.google.com/docs/functions/callable)

- Called by users who owns the shop with the voucher

```ts
type RedeemRequest = {
  voucherId: string;
}
```

### Transfer voucher: `transferVoucher`

> [HTTPS callable](https://firebase.google.com/docs/functions/callable)

- Called by any authenticated user with available vouchers

```ts
type TransferRequest = {
  userId: string;
}
```

### Stripe checkout

> [Stripe checkout flow](https://stripe.com/docs/payments/checkout)

- Called by any authenticated user when purchasing a voucher

```ts
type StripeCheckoutRequest = {
  
}
```

## Firestore Schema

### `user` collection

```ts
type User = {
  id: string;       // uuid of firebase auth user
  username: string; // unique key
  email: string;
  vouchers: FirebaseFirestore.DocumentReference[]; // vouchers which user has bought
  shops: FirebaseFirestore.DocumentReference[];    // shops which user controls
}
```

### `shop` collection

```ts
type Shop = {
  id: string;
  name: string;
  tags: string[]
  vouchers: FirebaseFirestore.DocumentReference[]; // vouchers which shop has
}
```

### `voucher` collection

```ts
type Voucher = {
  id: string;
  title: string;
  description?: string | undefined;
  price: number;
  createdAt: Date;
  expireAt?: Date | undefined;
  redeemedAt?: Date | undefined;      // undefined if not yet redeemed
  user?: FirebaseFirestore.DocumentReference | undefined; // undefined if not yet bought by any user
  shop: FirebaseFirestore.DocumentReference;
}
```

## Developer Guide

### Prerequisites

1. Ensure you have the following globally installed first:
   - [`yarn`](https://classic.yarnpkg.com/en/docs/install/)
   - [`firebase-tools`](https://www.npmjs.com/package/firebase-tools)
2. Ensure that you are logged in to `firebase` by entering `firebase login`

### Installing

Install all dependencies by running:

```sh
# change to /functions directory:
cd functions
# install all deps:
yarn
```

Then install the Firebase emulators by running:

```sh
# in /functions directory:
firebase init
```

When prompted, choose `Emulators: Set up local emulators for Firebase products` **only**, and accept all the default values that are already set. Remember to actually download the emulators!

### Developing

To develop with hot reload and emulate *locally* the Firebase Auth, Firestore, and Firebase Functions services:

```sh
# in /functions directory:
yarn dev
```

Head to <http://localhost:4000> to see the emulator UI.
