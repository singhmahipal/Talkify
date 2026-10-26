import { StreamChat } from "stream-chat";
import "dotenv/config";

const apiKey = process.env.STREAM_API_KEY;
const apiSecret = process.env.STREAM_API_SECRET;

if (!apiKey || !apiSecret) {
  console.error("Stream API key or Secret is missing");
}

const streamClient = StreamChat.getInstance(apiKey, apiSecret);

export const upsertStreamUser = async (userData) => {
  try {
    await streamClient.upsertUsers([userData]);
    return userData;
  } catch (error) {
    console.error("Error upserting Stream user:", error);
  }
};

export const generateStreamToken = (userId) => {
  try {
    // ensure userId is a string
    const userIdStr = userId.toString();
    return streamClient.createToken(userIdStr);
  } catch (error) {
    console.error("Error generating Stream token:", error);
  }
};

export const migrateLegacyAvatars = async () => {
  try {
    const User = (await import("../models/User.js")).default;
    const users = await User.find({
      profilePic: { $regex: "avatar\\.iran\\.liara\\.run" },
    });
    if (users.length > 0) {
      console.log(`Migrating ${users.length} legacy user avatars...`);
      const streamUsers = [];
      for (const user of users) {
        const match = user.profilePic.match(/\/(\d+)\.png/);
        const seed = match ? match[1] : encodeURIComponent(user.fullName || "user");
        user.profilePic = `https://api.dicebear.com/7.x/avataaars/svg?seed=${seed}`;
        await user.save();
        streamUsers.push({
          id: user._id.toString(),
          name: user.fullName,
          image: user.profilePic,
        });
      }
      if (streamUsers.length > 0) {
        await streamClient.upsertUsers(streamUsers);
        console.log(`Updated ${streamUsers.length} users on Stream Chat`);
      }
    }
  } catch (err) {
    console.log("Error migrating avatars in Stream:", err.message);
  }
};
