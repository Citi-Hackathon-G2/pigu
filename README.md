<!-- omit in toc -->
# PiGu

- [API Reference](#api-reference)
  - [Register user: `POST /register`](#register-user-post-register)
  - [Buy voucher](#buy-voucher)
  - [Redeem voucher](#redeem-voucher)
  - [Transfer voucher](#transfer-voucher)
- [Firestore Schema](#firestore-schema)
  - [`user` collection](#user-collection)
  - [`shop` collection](#shop-collection)
  - [`voucher` collection](#voucher-collection)

## API Reference

All response messages will adhere to the following:

```ts
type ErrorResponse = {
  code: FunctionsErrorCode;
  message: string;
  details?: unknown | undefined;
};
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

### Buy voucher

> [HTTPS callable](https://firebase.google.com/docs/functions/callable)

- Called by any authenticated user

```ts
type BuyRequest = {
  userId: string;
  shopId: string;
  // TODO: other stripe related stuff
}
```

### Redeem voucher

> [HTTPS callable](https://firebase.google.com/docs/functions/callable)

- Called by users who owns the shop with the voucher

```ts
type RedeemRequest = {
  voucherId: string;
}
```

### Transfer voucher

> [HTTPS callable](https://firebase.google.com/docs/functions/callable)

- Called by any authenticated user with available vouchers

```ts
type TransferRequest = {
  userId: string;
}
```

## Firestore Schema

### `user` collection

```ts
type User = {
  id: string;                     // uuid of firebase auth user
  username: string;               // unique key
  email: string;
  vouchers: voucherDocumentRef[]; // vouchers which user has bought
  shops: shopDocumentRef[];       // shops which user controls
}
```

### `shop` collection

```ts
type Shop = {
  id: string;
  name: string;
  tags: string[]
  vouchers: voucherDocumentRef[]; // vouchers which shop has
}
```

### `voucher` collection

```ts
type Voucher = {
  id: string;
  title: string;
  description?: string | undefined;
  expireAt?: Date | undefined;
  redeemedAt?: Date | undefined;      // undefined if not yet redeemed
  user?: userDocumentRef | undefined; // undefined if not yet bought by any user
  shop: shopDocumentRef;
}
```
