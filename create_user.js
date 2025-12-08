const axios = require("axios");

async function createUsers() {
  for (let i = 1; i <= 100; i++) {
    const user = {
      fullname: `User ${i}`,
      username: `user${i}`,
      email: `user${i}@example.com`,
      password: "password123",
      gender: "male",
    };

    try {
      const res = await axios.post("http://localhost:8001/api/register", user, {
        withCredentials: true,
      });

      console.log(i, res.data.msg);
    } catch (err) {
      console.error(`User ${i} error:`, err.response?.data || err.message);
    }
  }
}

createUsers();
