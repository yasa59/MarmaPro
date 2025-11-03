const router = require("express").Router();
const twilio = require("twilio");
const { verifyToken } = require("../middleware/auth"); // your existing auth

router.get("/", verifyToken, async (req, res) => {
  try {
    const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    const token = await client.tokens.create(); // returns { iceServers: [...] }
    res.json({ iceServers: token.iceServers });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "twilio_error" });
  }
});

module.exports = router;