import mongoose, { Schema, type Document } from "mongoose";

// Login accepts a username, an email, or a display name — the lookup tries
// all three, so accounts created by other apps on a shared database (which
// may only carry an email and a name) keep working here untouched.
// Nothing in this app ever modifies or deletes another app's user records:
// signup only ever creates brand-new documents.
export interface IUser extends Document {
  username?: string;
  email?: string;
  name?: string;
  passwordHash: string;
  createdAt: number;
}

const UserSchema = new Schema<IUser>({
  username: { type: String, trim: true },
  email: { type: String, lowercase: true, trim: true },
  name: { type: String, default: "", trim: true },
  passwordHash: { type: String, required: true },
  createdAt: { type: Number, default: Date.now },
});

UserSchema.index({ username: 1 }, { unique: true, sparse: true });
UserSchema.index({ email: 1 }, { unique: true, sparse: true });

export const User =
  mongoose.models.User ?? mongoose.model<IUser>("User", UserSchema);
