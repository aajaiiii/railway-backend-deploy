const express = require("express");
const app = express();
app.use(express.json());
const mongoose = require("mongoose");
app.use("/file", express.static("../homeward/src/file/"));
app.set("view engine", "ejs");
app.use(express.urlencoded({ extended: false }));
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
var nodemailer = require("nodemailer");
const cors = require("cors");
app.use(cors());

const JWT_SECRET =
  "hvdvay6ert72839289()aiyg8t87qt72393293883uhefiuh78ttq3ifi78272jbkj?[]]pou89ywe";
app.listen(5000, () => {
  console.log("Server Started");
});

const mongoUrl =
  "mongodb+srv://sasithornsorn:Sasi12345678@cluster0.faewtst.mongodb.net/?retryWrites=true&w=majority";

mongoose
  .connect(mongoUrl, {
    dbName: "Homeward",
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => {
    console.log("Connect to database");
  })
  .catch((e) => console.log(e));

// เชื่อม mongo
require("./homeward");

const Admins = mongoose.model("Admin");
const Equipment = mongoose.model("Equipment");
const MPersonnel = mongoose.model("MPersonnel");
const Caremanual = mongoose.model("Caremanual");

// แอดมิน
//เพิ่มข้อมูลแอดมิน
// app.post("/addadmin", async (req, res) => {
//   // const { username, password } = req.body;
//   const { username, password, confirmPassword } = req.body;
//   const encryptedPassword = await bcrypt.hash(password, 10);
//   try {
//     const oldUser = await Admins.findOne({ username });
//     //ชื่อมีในระบบไหม
//     if (oldUser) {
//       return res.json({ error: "User Exists" });
//     }

//     if (password !== confirmPassword) {
//       return res.json({ error: "Passwords do not match" });
//     }
//     await Admins.create({
//       username,
//       password: encryptedPassword,
//     });
//     res.send({ status: "ok" });
//   } catch (error) {
//     res.send({ status: "error" });
//   }
// });

app.post("/addadmin", async (req, res) => {
  const { username, name, email, password, confirmPassword } = req.body;
  if (!username || !password || !email) {
    return res.json({ error: "กรุณากรอกชื่อผู้ใช้ รหัสผ่าน และอีเมล" });
  }
  const encryptedPassword = await bcrypt.hash(password, 10);
  try {
    const oldUser = await Admins.findOne({ username });
    //ชื่อมีในระบบไหม
    if (oldUser) {
      return res.json({ error: "มีชื่อผู้ใช้นี้อยู่ในระบบแล้ว" });
    }

    if (password !== confirmPassword) {
      return res.json({ error: "รหัสผ่านไม่ตรงกัน" });
    }
    await Admins.create({
      username,
      name,
      email,
      password: encryptedPassword,
    });
    res.send({ status: "ok" });
  } catch (error) {
    res.send({ status: "error" });
  }
});


app.post("/login", async (req, res) => {
  const { username, password } = req.body;

  const user = await Admins.findOne({ username });
  if (!user) {
    return res.json({ error: "User Not found" });
  }
  if (await bcrypt.compare(password, user.password)) {
    const token = jwt.sign({ username: user.username }, JWT_SECRET, {
      expiresIn: "15m",
    });

    if (res.status(201)) {
      return res.json({ status: "ok", data: token });
    } else {
      return res.json({ error: "error" });
    }
  }
  res.json({ status: "error", error: "InvAlid Password" });
});

app.post("/forgot-password", async (req, res) => {
  const { email } = req.body;

  try {
    const oldUser = await Admins.findOne({ email });
    if (!oldUser) {
      return res.json({ status: "User Not Exists!!" });
    }

    const secret = JWT_SECRET + oldUser.password;
    const token = jwt.sign({ email: oldUser.email, id: oldUser._id }, secret, {
      expiresIn: "5m",
    });

    const link = `http://localhost:5000/reset-password/${oldUser._id}/${token}`;
    var transporter = nodemailer.createTransport({
      service: "gmail",
      // มาเปลี่ยนอีเมลที่ส่งด้วย
      auth: {
        user: "oysasitorn@gmail.com",
        pass: "avyn xfwl pqio hmtr",
      },
    });

    var mailOptions = {
      from: "oysasitorn@gmail.com",
      to: email,
      subject: "เปลี่ยนรหัสผ่าน Homeward",
      text: `คุณได้ทำการแจ้งลืมรหัสผ่าน Homeward\n\nกรุณาคลิกลิงก์ด้านล่างเพื่อตั้งรหัสผ่านใหม่:\n\n${link}`,
    };

    transporter.sendMail(mailOptions, function (error, info) {
      if (error) {
        console.log(error);
      } else {
        console.log("Email sent: " + info.response);
      }
    });

    console.log(link);
  } catch (error) {}
});

app.get("/reset-password/:id/:token", async (req, res) => {
  const { id, token } = req.params;
  console.log(req.params);
  const oldUser = await Admins.findOne({ _id: id });
  if (!oldUser) {
    return res.json({ status: "User Not Exists!!" });
  }
  const secret = JWT_SECRET + oldUser.password;
  try {
    const verify = jwt.verify(token, secret);
    res.render("index", { email: verify.email, status: "Not Verified" });
  } catch (error) {
    console.log(error);
    res.send("Not Verified");
  }
});

app.post("/reset-password/:id/:token", async (req, res) => {
  const { id, token } = req.params;
  const { password, confirmpassword } = req.body;
  console.log(req.params);

  if (password !== confirmpassword) {
    return res.json({ error: "รหัสผ่านไม่ตรงกัน" });
  }
  const oldUser = await Admins.findOne({ _id: id });
  if (!oldUser) {
    return res.json({ status: "ไม่มีผู้ใช้นี้อยู่ในระบบ!!" });
  }
  const secret = JWT_SECRET + oldUser.password;
  try {
    const verify = jwt.verify(token, secret);
    const encryptedPassword = await bcrypt.hash(password, 10);
    await Admins.updateOne(
      {
        _id: id,
      },
      {
        $set: {
          password: encryptedPassword,
        },
      }
    );

    res.render("index", { email: verify.email, status: "verified" });
  } catch (error) {
    console.log(error);
    res.send({ status: "เกิดข้อผิดพลาดบางอย่าง" });
  }
});

//เปลี่ยนรหัสแอดมิน
app.post("/updateadmin/:id", async (req, res) => {
  const { password, newPassword, confirmNewPassword } = req.body;
  const id = req.params.id;

  try {
    if (newPassword.trim() !== confirmNewPassword.trim()) {
      return res.status(400).json({ error: "รหัสผ่านไม่ตรงกัน" });
    }
    const admin = await Admins.findById(id);

    //รหัสตรงกับในฐานข้อมูลไหม
    const isPasswordValid = await bcrypt.compare(password, admin.password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: "รหัสผ่านเก่าไม่ถูกต้อง" });
    }

    //
    const encryptedNewPassword = await bcrypt.hash(newPassword, 10);
    // อัปเดตรหัสผ่าน
    await Admins.findByIdAndUpdate(id, { password: encryptedNewPassword });

    res
      .status(200)
      .json({ status: "ok", message: "รหัสผ่านถูกอัปเดตเรียบร้อยแล้ว" });
  } catch (error) {
    console.error("Error during password update:", error);
    res.status(500).json({ error: "มีข้อผิดพลาดในการอัปเดตรหัสผ่าน" });
  }
});

//profile userdata ส่ง token
app.post("/profile", async (req, res) => {
  const { token } = req.body;
  try {
    const admin = jwt.verify(token, JWT_SECRET, (error, res) => {
      if (error) {
        return "token expired";
      }
      return res;
    });

    console.log(admin);

    if (admin == "token expired") {
      return res.send({ status: "error", data: "token expired" });
    }

    const userAdmin = admin.username;
    Admins.findOne({ username: userAdmin })
      .then((data) => {
        res.send({ status: "ok", data: data });
      })
      .catch((error) => {
        res.send({ status: "error", data: error });
      });
  } catch (error) {}
});

app.post("/addequip", async (req, res) => {
  const { equipment_name, equipment_type, adminId } = req.body;

  try {
    const oldequipment = await Equipment.findOne({ equipment_name });

    if (oldequipment) {
      return res.json({ error: "Equipment Exists" });
    }

    const existingAdmin = await Admins.findById(adminId);
    if (!existingAdmin) {
      return res.json({ error: "Invalid Admin ID" });
    }

    await Equipment.create({
      equipment_name,
      equipment_type,
      admin: [adminId], // อ้างอิงไปยัง Admin ID
    });

    res.send({ status: "ok" });
  } catch (error) {
    console.error(error);
    res.send({ status: "error" });
  }
});

// // ดึงข้อมูลอุปกรณ์มาโชว์
app.get("/allequip", async (req, res) => {
  try {
    const allEquip = await Equipment.find({});
    res.send({ status: "ok", data: allEquip });
  } catch (error) {
    console.log(error);
  }
});

// // ดึงข้อมูลมาโชว์
app.get("/alladmin", async (req, res) => {
  try {
    const allAdmin = await Admins.find({});
    res.send({ status: "ok", data: allAdmin });
  } catch (error) {
    console.log(error);
  }
});

// แพทย์

//เพิ่มข้อมูลแพทย์
app.post("/addmpersonnel", async (req, res) => {
  const { username, password, email, confirmPassword, tel, nametitle, name } =
    req.body;
  const encryptedPassword = await bcrypt.hash(password, 10);
  try {
    const oldUser = await MPersonnel.findOne({ username });
    //ชื่อมีในระบบไหม
    if (oldUser) {
      return res.json({ error: "มีชื่อผู้ใช้นี้อยู่ในระบบแล้ว" });
    }

    if (password !== confirmPassword) {
      return res.json({ error: "รหัสผ่านไม่ตรงกัน" });
    }
    await MPersonnel.create({
      username,
      password: encryptedPassword,
      email,
      tel,
      nametitle,
      name,
    });
    res.send({ status: "ok" });
  } catch (error) {
    res.send({ status: "error" });
  }
});

app.get("/allMpersonnel", async (req, res) => {
  try {
    const allMpersonnel = await MPersonnel.find({});
    res.send({ status: "ok", data: allMpersonnel });
  } catch (error) {
    console.log(error);
  }
});


//addคู่มือ ได้ละ

const multer = require("multer");

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const destinationPath =
      file.fieldname === "image"
        ? "../homeward/src/images/"
        : "../homeward/src/file/";
    cb(null, destinationPath);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now();
    cb(null, uniqueSuffix + file.originalname);
  },
});

//อันนี้เพิ่มรูปได้แล้ว

// const upload = multer({ storage: storage });
// //addคู่มือ form
// app.post("/addcaremanual",upload.single("image"), async (req, res) => {
//   const { caremanual_name, file, detail } = req.body;
//   console.log(req.body);
//   // const imagename = req.file.filename;

//   try {
//     let imagename = null;
//     if (req.file) {
//       imagename = req.file.filename;
//     }

//     await Caremanual.create({
//         caremanual_name,
//         image:imagename,
//         file,
//         detail,
//      });
//     res.json({ status: "ok" });

//   } catch (error) {
//     res.json({ status: error });
//   }
// });

const upload = multer({ storage: storage }).fields([
  { name: "image", maxCount: 1 },
  { name: "file", maxCount: 1 },
]);

//addคู่มือ รูป+ไฟล์
app.post("/addcaremanual", upload, async (req, res) => {
  const { caremanual_name, detail } = req.body;

  try {
    let imagename = "";
    let filename = "";

    if (req.files["image"] && req.files["image"][0]) {
      imagename = req.files["image"][0].filename;
    }

    if (req.files["file"] && req.files["file"][0]) {
      filename = req.files["file"][0].filename;
    }

    await Caremanual.create({
      caremanual_name,
      image: imagename,
      file: filename,
      detail,
    });
    res.json({ status: "ok" });
  } catch (error) {
    res.json({ status: error });
  }
});

app.get("/allcaremanual", async (req, res) => {
  try {
    Caremanual.find({}).then((data) => {
      res.send({ status: "ok", data: data });
    });
  } catch (error) {
    res.json({ status: error });
  }
});

//ลบแอดมิน
app.delete("/deleteAdmin/:id", async (req, res) => {
  const adminId = req.params.id;
  try {
    const result = await Admins.deleteOne({ _id: adminId });

    if (result.deletedCount === 1) {
      res.json({ status: "OK", data: "ลบข้อมูลแอดมินสำเร็จ" });
    } else {
      res.json({
        status: "Not Found",
        data: "ไม่พบแอดมินหรือแอดมินถูกลบไปแล้ว",
      });
    }
  } catch (error) {
    console.error("Error during deletion:", error);
    res.status(500).json({ status: "Error", data: "Internal Server Error" });
  }
});

//ลบข้อมูลแพทย์
app.delete("/deleteMPersonnel/:id", async (req, res) => {
  const mpersonnelId = req.params.id;
  try {
    const result = await MPersonnel.deleteOne({ _id: mpersonnelId });

    if (result.deletedCount === 1) {
      res.json({ status: "OK", data: "ลบข้อมูลบุคลากรสำเร็จ" });
    } else {
      res.json({
        status: "Not Found",
        data: "ไม่พบข้อมูลบุคลากรหรือข้อมูลถูกลบไปแล้ว",
      });
    }
  } catch (error) {
    console.error("Error during deletion:", error);
    res.status(500).json({ status: "Error", data: "Internal Server Error" });
  }
});

//ลบอุปกร์ทางการแพทย์
app.delete("/deleteEquipment/:id", async (req, res) => {
  const EquipmentId = req.params.id;
  try {
    const result = await Equipment.deleteOne({ _id: EquipmentId });

    if (result.deletedCount === 1) {
      res.json({ status: "OK", data: "ลบอุปกรณ์ทางการแพทย์สำเร็จ" });
    } else {
      res.json({
        status: "Not Found",
        data: "ไม่พบอุปกรณ์ทางการแพทย์นี้หรือข้อมูลถูกลบไปแล้ว",
      });
    }
  } catch (error) {
    console.error("Error during deletion:", error);
    res.status(500).json({ status: "Error", data: "Internal Server Error" });
  }
});

//ลบคู่มือ
app.delete("/deleteCaremanual/:id", async (req, res) => {
  const CaremanualId = req.params.id;
  try {
    const result = await Caremanual.deleteOne({ _id: CaremanualId });

    if (result.deletedCount === 1) {
      res.json({ status: "OK", data: "ลบคู่มือสำเร็จ" });
    } else {
      res.json({
        status: "Not Found",
        data: "ไม่พบคู่มือนี้หรือข้อมูลถูกลบไปแล้ว",
      });
    }
  } catch (error) {
    console.error("Error during deletion:", error);
    res.status(500).json({ status: "Error", data: "Internal Server Error" });
  }
});

//แก้ไขคู่มือ
// app.post("/updatecaremanual/:id", upload, async (req, res) => {
//   const { caremanual_name, detail } = req.body;
//   const { id } = req.params;

//   try {
//     let imagename = "";
//     let filename = "";

//     if (req.files['image'] && req.files['image'][0]) {
//       imagename = req.files['image'][0].filename;
//     }

//     if (req.files['file'] && req.files['file'][0]) {
//       filename = req.files['file'][0].filename;
//     }

//     const updatedCaremanual = await Caremanual.findByIdAndUpdate(id, {
//       caremanual_name,
//       image: imagename,
//       file: filename,
//       detail,
//     }, { new: true });

//     // await Admins.findByIdAndUpdate(id, { password: encryptedNewPassword });
//     if (!updatedCaremanual) {
//       return res.status(404).json({ status: "Caremanual not found" });
//     }

//     res.json({ status: "ok", updatedCaremanual });
//   } catch (error) {
//     res.json({ status: error });
//   }
// });

app.post("/updatecaremanual/:id", upload, async (req, res) => {
  const { caremanual_name, detail } = req.body;
  const { id } = req.params;

  try {
    let imagename = "";
    let filename = "";

    // มีรูปใหม่ไหม
    if (req.files["image"] && req.files["image"][0]) {
      imagename = req.files["image"][0].filename;
    }
    // มีไฟล์ไหม
    if (req.files["file"] && req.files["file"][0]) {
      filename = req.files["file"][0].filename;
    }
    // ตรวจสอบว่ามีการอัปเดตรูปภาพหรือไม่
    if (imagename !== "") {
      // มีการอัปเดต
      const updatedWithImage = await Caremanual.findByIdAndUpdate(
        id,
        {
          caremanual_name,
          image: imagename,
          file: filename,
          detail,
        },
        { new: true }
      );

      if (!updatedWithImage) {
        return res.status(404).json({ status: "Caremanual not found" });
      }

      res.json({ status: "ok", updatedCaremanual: updatedWithImage });
    } else {
      // ไม่มีการอัปเดต
      const oleCaremanual = await Caremanual.findById(id);

      if (!oleCaremanual) {
        return res.status(404).json({ status: "Caremanual not found" });
      }

      let existingFilename = "";
      // ตรวจสอบว่ามีการอัปโหลดไฟล์ไม่
      if (filename !== "") {
        existingFilename = filename;
      } else {
        existingFilename = oleCaremanual.file;
      }

      // ให้ใช้ค่าเดิมของไฟล์
      const updatedWithoutFile = await Caremanual.findByIdAndUpdate(
        id,
        {
          caremanual_name,
          image: oleCaremanual.image,
          file: existingFilename,
          detail,
        },
        { new: true }
      );

      res.json({ status: "ok", updatedCaremanual: updatedWithoutFile });
    }
  } catch (error) {
    res.json({ status: error });
  }
});

//ดึงคู่มือมา
app.get("/getcaremanual/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const caremanual = await Caremanual.findById(id);

    if (!caremanual) {
      return res.status(404).json({ error: "Caremanual not found" });
    }

    res.json(caremanual);
  } catch (error) {
    console.error("Error fetching caremanual:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});


//ฝั่งแพทย์
//login
app.post("/loginmpersonnel", async (req, res) => {
  const { username, password } = req.body;

  const user = await MPersonnel.findOne({ username });
  if (!user) {
    return res.json({ error: "User Not found" });
  }
  if (await bcrypt.compare(password, user.password)) {
    const token = jwt.sign({ username: user.username }, JWT_SECRET, {
      expiresIn: "15m",
    });

    if (res.status(201)) {
      return res.json({ status: "ok", data: token });
    } else {
      return res.json({ error: "error" });
    }
  }
  res.json({ status: "error", error: "InvAlid Password" });
});

//ลืมรหัสผ่าน
app.post("/forgot-passworddt", async (req, res) => {
  const { email } = req.body;

  try {
    const oldUser = await MPersonnel.findOne({ email });
    if (!oldUser) {
      return res.json({ status: "User Not Exists!!" });
    }

    const secret = JWT_SECRET + oldUser.password;
    const token = jwt.sign({ email: oldUser.email, id: oldUser._id }, secret, {
      expiresIn: "5m",
    });

    const link = `http://localhost:5000/reset-passworddt/${oldUser._id}/${token}`;
    var transporter = nodemailer.createTransport({
      service: "gmail",
      // มาเปลี่ยนอีเมลที่ส่งด้วย
      auth: {
        user: "oysasitorn@gmail.com",
        pass: "avyn xfwl pqio hmtr",
      },
    });

    var mailOptions = {
      from: "oysasitorn@gmail.com",
      to: email,
      subject: "เปลี่ยนรหัสผ่าน Homeward",
      text: `คุณได้ทำการแจ้งลืมรหัสผ่าน Homeward\n\nกรุณาคลิกลิงก์ด้านล่างเพื่อตั้งรหัสผ่านใหม่:\n\n${link}`,
    };

    transporter.sendMail(mailOptions, function (error, info) {
      if (error) {
        console.log(error);
      } else {
        console.log("Email sent: " + info.response);
      }
    });

    console.log(link);
  } catch (error) {}
});

app.get("/reset-passworddt/:id/:token", async (req, res) => {
  const { id, token } = req.params;
  console.log(req.params);
  const oldUser = await MPersonnel.findOne({ _id: id });
  if (!oldUser) {
    return res.json({ status: "User Not Exists!!" });
  }
  const secret = JWT_SECRET + oldUser.password;
  try {
    const verify = jwt.verify(token, secret);
    res.render("index", { email: verify.email, status: "Not Verified" });
  } catch (error) {
    console.log(error);
    res.send("Not Verified");
  }
});

app.post("/reset-passworddt/:id/:token", async (req, res) => {
  const { id, token } = req.params;
  const { password, confirmpassword } = req.body;
  console.log(req.params);

  if (password !== confirmpassword) {
    return res.json({ error: "Passwords do not match" });
  }
  const oldUser = await MPersonnel.findOne({ _id: id });
  if (!oldUser) {s
    return res.json({ status: "User Not Exists!!" });
  }
  const secret = JWT_SECRET + oldUser.password;
  try {
    const verify = jwt.verify(token, secret);
    const encryptedPassword = await bcrypt.hash(password, 10);
    await MPersonnel.updateOne(
      {
        _id: id,
      },
      {
        $set: {
          password: encryptedPassword,
        },
      }
    );

    res.render("indexdt", { email: verify.email, status: "verified" });
  } catch (error) {
    console.log(error);
    res.send({ status: "Somthing went wrong" });
  }
});
