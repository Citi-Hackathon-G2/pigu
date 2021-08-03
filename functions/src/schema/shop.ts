export type Shop = {
  name: string;
  tags: string[];
  vouchers: FirebaseFirestore.DocumentReference[]; // vouchers which shop has
};
