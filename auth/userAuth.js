const jwt = require("jsonwebtoken");
const SECRET_KEY = "mslnRamzaAma";
function generateToken(user) {
  return jwt.sign(
    { id: user._id, username: user.username }, 
    SECRET_KEY, 
    { expiresIn: "1h" }
  );
}

function authenticateToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  
  if (!authHeader) return res.status(401).json({ message: "token does'nt exist" });
  const token = authHeader.split(" ")[1];
  //console.log(token);
  
  if (!token) return res.status(401).json({ message: "token does'nt exist" });
  jwt.verify(token, SECRET_KEY, (err, user) => {
    if (err) return res.status(403).json({ message: "token is broken" });
    req.user = user;
    
  });
  next();
}

  

module.exports = { generateToken, authenticateToken };