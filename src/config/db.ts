import mongoose from "mongoose";

const connectDb = async (): Promise<void> => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URL as string);
    console.log(`✅ Connected to MongoDB: ${conn.connection.host}`);

    // Drop legacy unique index on email (no longer needed)
    try {
      await conn.connection.collection("users").dropIndex("email_1");
      console.log("🗑️ Dropped legacy email_1 index");
    } catch {
      // Index doesn't exist — nothing to do
    }
  } catch (err) {
    console.error(`❌ Error in MongoDB connection:`, err);
    process.exit(1);
  }
};

export default connectDb;
