export type Voucher = {
  title: string;
  description?: string | undefined;
  price: number;
  createdAt: Date;
  expireAt?: Date | undefined;
  redeemedAt?: Date | undefined; // undefined if not yet redeemed
  user?: FirebaseFirestore.DocumentReference | undefined; // undefined if not yet bought by any user
  shop: FirebaseFirestore.DocumentReference;
};
