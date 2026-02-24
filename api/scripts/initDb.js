require("dotenv").config({ path: require("path").resolve(__dirname, "../../.env") });
const { initDb } = require("../config/database");

initDb()
  .then(() => {
    console.log("Database schema created successfully");
    process.exit(0);
  })
  .catch((err) => {
    console.error("Failed to initialize database:", err);
    process.exit(1);
  });
