const jwt = require("jsonwebtoken");

function getUsernameFromRequest(req, JWT_SECRET) {
  try {
    const token = req.cookies?.token;
    if (!token) return null;
    const payload = jwt.verify(token, JWT_SECRET);
    return payload?.username || null;
  } catch (err) {
    return null;
  }
}

module.exports = { getUsernameFromRequest };
