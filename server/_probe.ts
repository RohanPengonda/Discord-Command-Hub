import dotenv from "dotenv";
dotenv.config({ path: "../.env" });
import jwt from "jsonwebtoken";
(async () => {
  const token = jwt.sign({ id: "4a039a8f-11ff-4cc1-a84b-5d39c50001e5", email: "admin@example.com", role: "ADMIN" }, process.env.JWT_SECRET!, { expiresIn: "7d" });
  console.log(token);
})();
