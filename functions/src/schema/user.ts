export type User = {
  username: string; // unique key
  email: string;
  vouchers: FirebaseFirestore.DocumentReference[]; // vouchers which user has bought
  shops: FirebaseFirestore.DocumentReference[]; // shops which user controls
};
