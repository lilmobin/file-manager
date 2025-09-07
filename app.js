const express = require("express");
const fs = require("fs");
const path = require("path");
const { ErrorHandler, NotFoundError } = require("./util/errorHandler");
const { uploadFile } = require("./middleware/multer");
const connectDB = require("./model/db");
const User = require("./model/user");
const { generateToken, authenticateToken } = require("./auth/userAuth");

const app = express();
connectDB();

app.use(express.json());
app.use(express.urlencoded());
app.use("/public", express.static("public"));
app.set("view engine", "ejs");

const uploadCenter = "./public/upload-center";

app.post("/register", async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res
        .status(400)
        .json({ error: "username and password are neccessary" });
    }

    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(400).json({ error: "this username already exists" });
    }

    const newUser = new User({ username, password });
    await newUser.save();

    res.json({ message: "registered succsessfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "error in register", error: err });
  }
});
app.post("/login", async (req, res) => {
  const user = await User.findOne({
    username: req.body.username,
    password: req.body.password,
  });
  if (!user)
    return res.status(401).json({ message: "username or password is wrong" });

  const token = generateToken(user);
  res.json({ token });
});
app.get(
  "/upload",
  uploadFile.array("files",10),
  (req, res) => {
    res.redirect("/files"); // بعد از آپلود، ریدایرکت به لیست فایل‌ها
  }
);
app.post(
  "/upload",
  uploadFile.array("files",10),
  (req, res) => {
    res.redirect("/files"); // بعد از آپلود، ریدایرکت به لیست فایل‌ها
  }
);
app.get("/create-folder/:folderName", (req, res) => {
  const folder = uploadCenter + `/${req.params.folderName}`;
  const existance = fs.existsSync(folder);
  if (existance) {
    res.render("index", {
      h1: `<h1>the ((${req.params.folderName})) already exists</h1>`,
    });
  } else {
    fs.mkdirSync(folder);
    res.render("index", {
      h1: `<h1>the ((${req.params.folderName})) folder created</h1>`,
      items: files || [],
    });
  }
});
app.get("/remove-folder/:folderName", authenticateToken, (req, res) => {
  const folder = uploadCenter + `/${req.params.folderName}`;
  const existance = fs.existsSync(folder);

  if (existance) {
    fs.rmSync(folder, { recursive: true, force: true });
    res.render("index", {
      h1: `<h1>the ((${req.params.folderName})) folder deleted</h1>`,
      items: [],
    });
  } else {
    res.render("index", {
      h1: `<h1>the ((${req.params.folderName})) not exists</h1>`,
      items: [],
    });
  }
});
app.get(
  "/rename-folder/:folderName/:newName",
  authenticateToken,
  (req, res) => {
    const folder = uploadCenter + `/${req.params.folderName}`;
    const existance = fs.existsSync(folder);
    const newName = uploadCenter + `${req.params.newName}`;
    if (existance) {
      fs.renameSync(folder, newName);
      res.render("index", {
        h1: `<h1>the ((${req.params.folderName})) folder renamed</h1>`,
        items: [],
      });
    } else {
      res.render("index", {
        h1: `<h1>the ((${req.params.folderName})) not exists</h1>`,
        items: [],
      });
    }
  }
);
app.get("/move-folder", authenticateToken, (req, res) => {
  const { from, to } = req.query;
  const addressFrom = uploadCenter + from;
  const addressTo = uploadCenter + to;
  if (!from || !to) {
    res.render("index", { h1: `<h1>both routes are required</h1>` });
  }
  try {
    fs.cpSync(addressFrom, addressTo, { recursive: true });
    fs.rmSync(addressFrom, { recursive: true, force: true });
    res.render("index", {
      h1: `folder moved from ${addressFrom} to ${addressTo}`,
    });
  } catch (err) {
    res.render("index", { h1: `error: ${err.message}` });
  }
});
app.get("/copy-folder", authenticateToken, (req, res) => {
  const { from, to } = req.query;
  const addressFrom = uploadCenter + from;
  const addressTo = uploadCenter + to;
  if (!from || !to) {
    res.render("index", { h1: `<h1>both routes are required</h1>` });
  }
  try {
    fs.cpSync(addressFrom, addressTo, { recursive: true });
    res.render("index", {
      h1: `folder copyed from ${addressFrom} to ${addressTo}`,
    });
  } catch (err) {
    res.render("index", { h1: `error: ${err.message}` });
  }
});
//
//
//
app.get("/remove-file/:fileName", authenticateToken, (req, res) => {
  const filePath = uploadCenter + `/${req.params.fileName}`;
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
    res.render("index", {
      h1: `<h1>the ((${req.params.fileName})) file deleted</h1>`,
    });
  } else {
    res.render("index", {
      h1: `<h1>the ((${req.params.fileName})) not exists</h1>`,
    });
  }
});
app.get("/rename-file/:fileName/:newName", authenticateToken, (req, res) => {
  const filePath = uploadCenter + `/${req.params.fileName}`;
  const newFilePath = uploadCenter + `/${req.params.newName}`;
  if (fs.existsSync(filePath)) {
    fs.renameSync(filePath, newFilePath);
    res.render("index", {
      h1: `<h1>the ((${req.params.fileName})) file renamed</h1>`,
    });
  } else {
    res.render("index", {
      h1: `<h1>the ((${req.params.fileName})) not exists</h1>`,
    });
  }
});
app.get("/move-file", authenticateToken, (req, res) => {
  const { from, toFolder } = req.query;
  const fileFrom = uploadCenter + from;
  const fileName = from.split("/").pop();
  const fileTo = uploadCenter + `/${toFolder}/${fileName}`;

  if (!from || !toFolder) {
    return res.render("index", {
      h1: `<h1>both from and toFolder are required</h1>`,
    });
  }

  try {
    if (!fs.existsSync(uploadCenter + `/${toFolder}`)) {
      fs.mkdirSync(uploadCenter + `/${toFolder}`, { recursive: true });
    }

    fs.copyFileSync(fileFrom, fileTo);
    fs.unlinkSync(fileFrom);

    res.render("index", { h1: `file moved from ${fileFrom} to ${fileTo}` });
  } catch (err) {
    res.render("index", { h1: `error: ${err.message}` });
  }
});
app.get("/copy-file", authenticateToken, (req, res) => {
  const { from, toFolder } = req.query;
  const fileFrom = uploadCenter + from;
  const fileName = from.split("/").pop();
  const fileTo = uploadCenter + `/${toFolder}/${fileName}`;

  if (!from || !toFolder) {
    return res.render("index", {
      h1: `<h1>both from and toFolder are required</h1>`,
    });
  }

  try {
    if (!fs.existsSync(uploadCenter + `/${toFolder}`)) {
      fs.mkdirSync(uploadCenter + `/${toFolder}`, { recursive: true });
    }

    fs.copyFileSync(fileFrom, fileTo);
    res.render("index", { h1: `file copied from ${fileFrom} to ${fileTo}` });
  } catch (err) {
    res.render("index", { h1: `error: ${err.message}` });
  }
});
//
//
//
app.get("/files{/*folderPath}", (req, res) => {
  let fPath = "";
  if (req.params.folderPath) {
    for (let index = 0; index < req.params.folderPath.length; index++) {
      fPath += "/" + req.params.folderPath[index];
    }
  }
  const folderPath = `${uploadCenter}/${fPath}`;
  //console.log(folderPath);
  const files = fs.readdirSync(folderPath);
  res.render("index", {
    h1: `<h1>folder: ${folderPath}</h1>`,
    items: files || [],
  });
});
app.get("/images{/*imageName}", (req, res) => {
  let imagePath = "";
  if (req.params.imageName) {
    for (let index = 0; index < req.params.imageName.length; index++) {
      imagePath += "/" + req.params.imageName[index];
      }
  }
  res.render("index", {
    h1: `<h1>${imagePath}</h1>`,
    content: `<img src="/public/upload-center${imagePath}" width="500">`,
    items: [],
  });
});
app.get("/text-editor{/*txtName}", (req, res) => {
  let textPath = "";
  if (req.params.txtName) {
    for (let index = 0; index < req.params.txtName.length; index++) {
      textPath += "/" + req.params.txtName[index];
         }
  }
  let content = fs.readFileSync(`${uploadCenter}/${textPath}`);
  res.render("index", {
    h1: `<h1>${textPath}</h1>`,
    content: `<form method="POST" action="/text-editor${textPath}">
    <textarea name="appendText" rows="10" cols="50">${content}</textarea><br>
    <button type="submit">Save changes</button>
</form>`,
    items: [],
  });
});
app.post("/text-editor{/*txtName}", (req, res) => {
  let textPath = "";
  if (req.params.txtName) {
    for (let index = 0; index < req.params.txtName.length; index++) {
      textPath +=
        (textPath.endsWith("/") ? "" : "/") + req.params.txtName[index];
         }
  }
  const newContent = req.body.appendText;
  const finalPath = `${uploadCenter}${textPath}`;
  fs.writeFileSync(finalPath, newContent, "utf-8");
  res.redirect(`/text-editor/${textPath}`);
});
app.get("/download{/*fileName}", (req, res) => {
  let filePath = "";
  if (req.params.fileName) {
    for (let index = 0; index < req.params.fileName.length; index++) {
      filePath += "/" + req.params.fileName[index];
    }
  }
  const fileFinalPath = `${uploadCenter}${filePath}`;
  res.download(fileFinalPath);
});
app.use(NotFoundError);
app.use(ErrorHandler);
app.listen(3000, () => {
  console.log("server run at http://localhost:3000");
});
