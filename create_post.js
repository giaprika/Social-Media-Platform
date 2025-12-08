const axios = require("axios");

const USER_SERVICE_URL = "http://localhost:8001/api";
const POST_SERVICE_URL = "http://localhost:8002/api";

async function loginAllUsers() {
  const userInfos = [];

  for (let i = 1; i <= 100; i++) {
    const email = `user${i}@example.com`;
    const password = "password123";

    try {
      const res = await axios.post(`${USER_SERVICE_URL}/login`, {
        email,
        password,
      });

      userInfos.push({
        id: res.data.user._id,
        token: res.data.access_token,
      });

      console.log(`Login user${i} OK`);
    } catch (err) {
      console.error(`Login failed user${i}`, err.response?.data || err.message);
    }
  }

  return userInfos;
}

async function createPostsForUsers(userInfos) {
  const sampleImage = [
    {
      public_id: "mmafxzvya1cfw5273b23",
      url: "https://res.cloudinary.com/df08peayk/image/upload/v1761980254/mmafxzvya1cfw5273b23",
    },
  ];

  for (let i = 0; i < userInfos.length; i++) {
    const { id, token } = userInfos[i];

    const payload = {
      content: `This is a post from user ${i + 1}`,
      images: sampleImage,
      userId: id,
    };

    try {
      const res = await axios.post(`${POST_SERVICE_URL}/posts`, payload, {
        headers: {
          Authorization: `Bearer ${token}`,
          "x-user-id": id,
        },
      });

      console.log(`Post created by user${i + 1}:`, res.data.msg);
    } catch (err) {
      console.error(
        `Failed to create post user${i + 1}:`,
        err.response?.data || err.message
      );
    }
  }
}

async function main() {
  const users = await loginAllUsers();
  await createPostsForUsers(users);
}

main();
