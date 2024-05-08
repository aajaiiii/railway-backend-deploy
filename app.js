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
const randomstring = require("randomstring");
const slugify = require("slugify");
const cors = require("cors");
app.use(cors());
const { google } = require("googleapis");
const axios = require('axios');


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
const User = mongoose.model("User");
const MedicalInformation = mongoose.model("MedicalInformation");
const EquipmentUser = mongoose.model("EquipmentUser");

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
      subject: "Reset your password for Homeward",
      text: `Hello,\n\nFollow this link to reset your Homeward password for your ${email} account.\n${link}\n\nIf you didn't ask to reset your password,you can ignore this email.\n\nThanks,\n\nYour Homeward team`,
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

app.post("/profile", async (req, res) => {
  const { token } = req.body;
  try {
    const admin = jwt.verify(token, JWT_SECRET, (error, decoded) => {
      if (error) {
        if (error.name === "TokenExpiredError") {
          return "token expired";
        } else {
          throw error; // ถ้าเกิดข้อผิดพลาดอื่นๆในการยืนยัน token ให้โยน error ไปต่อให้ catch จัดการ
        }
      }
      return decoded;
    });

    console.log(admin);

    if (admin === "token expired") {
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
  } catch (error) {
    console.error("Error verifying token:", error);
    res.send({ status: "error", data: "token verification error" });
  }
});

//แพทย์
// app.post("/profile", async (req, res) => {
//   const { token } = req.body;
//   try {
//     const mpersonnel = jwt.verify(token, JWT_SECRET, (error, decoded) => {
//       if (error) {
//         if (error.name === "TokenExpiredError") {
//           return "token expired";
//         } else {
//           throw error; // ถ้าเกิดข้อผิดพลาดอื่นๆในการยืนยัน token ให้โยน error ไปต่อให้ catch จัดการ
//         }
//       }
//       return decoded;
//     });

//     console.log(mpersonnel);

//     if (mpersonnel === "token expired") {
//       return res.send({ status: "error", data: "token expired" });
//     }

//     const userMPersonnel = mpersonnel.username;
//     MPersonnel.findOne({ username: userMPersonnel })
//       .then((data) => {
//         res.send({ status: "ok", data: data });
//       })
//       .catch((error) => {
//         res.send({ status: "error", data: error });
//       });
//   } catch (error) {
//     console.error("Error verifying token:", error);
//     res.send({ status: "error", data: "token verification error" });
//   }
// });

app.post("/addequip", async (req, res) => {
  const { equipment_name, equipment_type } = req.body;
  try {
    const oldequipment = await Equipment.findOne({ equipment_name });

    if (oldequipment) {
      return res.json({ error: "Equipment Exists" });
    }

    // const existingAdmin = await Admins.findById(adminId);
    // if (!existingAdmin) {
    //   return res.json({ error: "Invalid Admin ID" });
    // }

    await Equipment.create({
      equipment_name,
      equipment_type,
      // admin: [adminId], // อ้างอิงไปยัง Admin ID
    });

    res.send({ status: "ok" });
  } catch (error) {
    console.error(error);
    res.send({ status: "error" });
  }
});

app.post("/addequipuser", async (req, res) => {
  try {
    // รับข้อมูลที่ส่งมาจากไคลเอนต์
    const equipments = req.body;

    // ดึงข้อมูลผู้ใช้ล่าสุดที่เพิ่มมา
    const lastAddedUser = await User.findOne().sort({ _id: -1 });

    // ตรวจสอบว่ามีผู้ใช้หรือไม่
    if (!lastAddedUser) {
      return res.json({ status: "error", message: "ไม่พบข้อมูลผู้ใช้" });
    }

    // สร้างอาเรย์ของอุปกรณ์ผู้ใช้
    const equipmentUsers = equipments.map((equip) => ({
      equipmentname_forUser: equip.equipmentname_forUser,
      equipmenttype_forUser: equip.equipmenttype_forUser,
      user: lastAddedUser._id,
    }));

    // เพิ่มข้อมูลอุปกรณ์ผู้ใช้ลงในฐานข้อมูล
    const equipusers = await EquipmentUser.create(equipmentUsers);

    // ส่งข้อมูลการเพิ่มข้อมูลอุปกรณ์ผู้ใช้กลับไปยังไคลเอนต์
    res.json({ status: "ok", data: equipusers });
  } catch (error) {
    res.send({ status: "error" });
  }
});
// Assuming you have an Express route to handle fetching equipment for a user
app.get("/equipment/:userId", async (req, res) => {
  try {
    const userId = req.params.userId;
    // Find all equipment associated with the user ID
    const equipment = await EquipmentUser.find({ user: userId });
    res.json(equipment);
  } catch (error) {
    console.error("Error fetching equipment:", error);
    res.status(500).json({ error: "Internal server error" });
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
  if (!username || !password || !email || !name || !nametitle) {
    return res.json({
      error:
        "กรุณากรอกเลขใบประกอบวิชาชีพ รหัสผ่าน อีเมล คำนำหน้าชื่อและชื่อ-นามสกุล",
    });
  }
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

// const storage = multer.diskStorage({
//   destination: function (req, file, cb) {
//     const destinationPath =
//       file.fieldname === "image"
//         ? "../homeward/src/images/"
//         : "../homeward/src/file/";
//     cb(null, destinationPath);
//   },
//   filename: function (req, file, cb) {
//     const uniqueSuffix = Date.now();
//     cb(null, uniqueSuffix + file.originalname);
//   },
// });
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const destinationPath =
      file.fieldname === "image"
        ? "../homeward/src/images/"
        : "../homeward/src/file/";
    cb(null, destinationPath);
  },
  filename: function (req, file, cb) {
    const originalName = file.originalname;
    const extension = originalName.split(".").pop();
    const thaiFileName = originalName.replace(/[^\u0E00-\u0E7Fa-zA-Z0-9]/g, "");
    const uniqueSuffix = Date.now();
    const newFileName = `${uniqueSuffix}-${thaiFileName}.${extension}`;
    cb(null, newFileName);
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

  if (!caremanual_name) {
    return res.json({ error: "กรุณากรอกหัวข้อ และเลือกรูปภาพ" });
  }

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

const upload1 = multer({ storage: storage }).fields([
  { name: "fileP", maxCount: 1 },
  { name: "fileM", maxCount: 1 },
  { name: "filePhy", maxCount: 1 },
]);

//เพิ่มข้อมูลเจ็บป่วย
app.post("/addmedicalinformation", upload1, async (req, res) => {
  const {
    HN,
    AN,
    Date_Admit,
    Date_DC,
    Diagnosis,
    Chief_complaint,
    selectedPersonnel,
    Present_illness,
    Phychosocial_assessment,
    Management_plan,
  } = req.body;

  try {
    // สร้างข้อมูลการแพทย์ใหม่
    let filePresent = "";
    let fileManage = "";
    let filePhychosocial = "";

    if (req.files["fileP"] && req.files["fileP"][0]) {
      filePresent = req.files["fileP"][0].path;
    }

    if (req.files["fileM"] && req.files["fileM"][0]) {
      fileManage = req.files["fileM"][0].path;
    }

    if (req.files["filePhy"] && req.files["filePhy"][0]) {
      filePhychosocial = req.files["filePhy"][0].path;
    }

    // ดึงข้อมูลผู้ใช้ล่าสุดที่เพิ่มมา
    const lastAddedUser = await User.findOne().sort({ _id: -1 });

    // ตรวจสอบว่ามีผู้ใช้หรือไม่
    if (!lastAddedUser) {
      return res.json({ status: "error", message: "ไม่พบข้อมูลผู้ใช้" });
    }

    const medicalInformation = await MedicalInformation.create({
      HN,
      AN,
      Date_Admit,
      Date_DC,
      Diagnosis,
      Chief_complaint,
      Present_illness,
      selectedPersonnel,
      Phychosocial_assessment,
      Management_plan,
      fileM: fileManage,
      fileP: filePresent,
      filePhy: filePhychosocial,
      user: [lastAddedUser._id], // ใช้ ID ของผู้ใช้ที่เพิ่มล่าสุด
    });

    res.json({ status: "ok", data: medicalInformation });
  } catch (error) {
    res.send({ status: "error" });
  }
});

// app.get("/medicalInformation/:id", async (req, res) => {
//   const { id } = req.params;
//   try {
//     const medicalInfo = await MedicalInformation.findOne({ id: id });
//     if (!medicalInfo) {
//       return res.status(404).send({ status: "error", message: "Medical information not found for this user" });
//     }
//     res.send({ status: "ok", data: medicalInfo });
//   } catch (error) {
//     console.log(error);
//     res.status(500).send({ status: "error", message: "Internal Server Error" });
//   }
// });

app.get("/medicalInformation/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const medicalInfo = await MedicalInformation.findOne({ user: id });
    if (!medicalInfo) {
      return res
        .status(404)
        .send({
          status: "error",
          message: "Medical information not found for this user",
        });
    }
    res.send({ status: "ok", data: medicalInfo });
  } catch (error) {
    console.log(error);
    res.status(500).send({ status: "error", message: "Internal Server Error" });
  }
});

// app.get("/getmedicalInformation/:id", async (req, res) => {
//   const { id } = req.params;

//   try {
//     const medicalInfo = await MedicalInformation.findById(id);

//     if (!medicalInfo) {
//       return res.status(404).json({ error: "medicalInfo not found" });
//     }

//     res.json(medicalInfo);
//   } catch (error) {
//     console.error("Error fetching medicalInfo:", error);
//     res.status(500).json({ error: "Internal Server Error" });
//   }
// });

// // ดึงข้อมูลผู้ป่วยมาโชว์
app.get("/alluser", async (req, res) => {
  try {
    const allUser = await User.find({});
    res.send({ status: "ok", data: allUser });
  } catch (error) {
    console.log(error);
  }
});

app.get("/user/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const user = await User.findById(id);
    if (!user) {
      return res
        .status(404)
        .send({ status: "error", message: "User not found" });
    }
    res.send({ status: "ok", data: user });
  } catch (error) {
    console.log(error);
    res.status(500).send({ status: "error", message: "Internal Server Error" });
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

//โปรไฟล์หมอ
app.post("/profiledt", async (req, res) => {
  const { token } = req.body;
  try {
    const mpersonnel = jwt.verify(token, JWT_SECRET, (error, decoded) => {
      if (error) {
        if (error.name === "TokenExpiredError") {
          return "token expired";
        } else {
          throw error; // ถ้าเกิดข้อผิดพลาดอื่นๆในการยืนยัน token ให้โยน error ไปต่อให้ catch จัดการ
        }
      }
      return decoded;
    });

    console.log(mpersonnel);

    if (mpersonnel === "token expired") {
      return res.send({ status: "error", data: "token expired" });
    }

    const userMP = mpersonnel.username;
    MPersonnel.findOne({ username: userMP })
      .then((data) => {
        res.send({ status: "ok", data: data });
      })
      .catch((error) => {
        res.send({ status: "error", data: error });
      });
  } catch (error) {
    console.error("Error verifying token:", error);
    res.send({ status: "error", data: "token verification error" });
  }
});

//เปลี่ยนรหัส หมอ
app.post("/updatepassword/:id", async (req, res) => {
  const { password, newPassword, confirmNewPassword } = req.body;
  const id = req.params.id;

  try {
    if (newPassword.trim() !== confirmNewPassword.trim()) {
      return res.status(400).json({ error: "รหัสผ่านไม่ตรงกัน" });
    }
    const mpersonnel = await MPersonnel.findById(id);

    //รหัสตรงกับในฐานข้อมูลไหม
    const isPasswordValid = await bcrypt.compare(password, mpersonnel.password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: "รหัสผ่านเก่าไม่ถูกต้อง" });
    }

    //
    const encryptedNewPassword = await bcrypt.hash(newPassword, 10);
    // อัปเดตรหัสผ่าน
    await MPersonnel.findByIdAndUpdate(id, { password: encryptedNewPassword });

    res
      .status(200)
      .json({ status: "ok", message: "รหัสผ่านถูกอัปเดตเรียบร้อยแล้ว" });
  } catch (error) {
    console.error("Error during password update:", error);
    res.status(500).json({ error: "มีข้อผิดพลาดในการอัปเดตรหัสผ่าน" });
  }
});

//แก้ไขโปรไฟล์หมอ
app.post("/updateprofile/:id", async (req, res) => {
  const { nametitle, name, tel } = req.body;
  const id = req.params.id;
  try {
    // อัปเดตชื่อของ admin
    // const admin = await Admins.findById(id);
    await MPersonnel.findByIdAndUpdate(id, { nametitle, name, tel });

    res
      .status(200)
      .json({ status: "ok", message: "ชื่อผู้ใช้ถูกอัปเดตเรียบร้อยแล้ว" });
  } catch (error) {
    console.error("Error during name update:", error);
    res.status(500).json({ error: "มีข้อผิดพลาดในการอัปเดตชื่อผู้ใช้" });
  }
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
      subject: "Reset your password for Homeward",
      text: `Hello,\n\nFollow this link to reset your Homeward password for your ${email} account.\n${link}\n\nIf you didn't ask to reset your password,you can ignore this email.\n\nThanks,\n\nYour Homeward team`,
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
  if (!oldUser) {
    s;
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
//ให้ค้นหาอักขระพิเศษได้
function escapeRegex(text) {
  return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
}
//ค้นหาคู่มือ
app.get("/searchcaremanual", async (req, res) => {
  try {
    const { keyword } = req.query; // เรียกใช้ keyword ที่ส่งมาจาก query parameters

    // ใช้ regex เพื่อค้นหาคำหลักในชื่อของคู่มือ
    const regex = new RegExp(escapeRegex(keyword), "i");

    const result = await Caremanual.find({
      $or: [
        { caremanual_name: { $regex: regex } }, // ค้นหาชื่อคู่มือที่ตรงกับ keyword
        { detail: { $regex: regex } }, // ค้นหาคำอธิบายที่ตรงกับ keyword
      ],
    });

    res.json({ status: "ok", data: result });
  } catch (error) {
    res.json({ status: error });
  }
});

//ค้นหาแพทย์
app.get("/searchmpersonnel", async (req, res) => {
  try {
    const { keyword } = req.query; // เรียกใช้ keyword ที่ส่งมาจาก query parameters

    // ใช้ regex เพื่อค้นหาคำหลักในชื่อของคู่มือ
    const regex = new RegExp(escapeRegex(keyword), "i");

    const result = await MPersonnel.find({
      $or: [{ name: { $regex: regex } }, { nametitle: { $regex: regex } }],
    });

    res.json({ status: "ok", data: result });
  } catch (error) {
    res.json({ status: error });
  }
});

//ค้นหาอุปกรณ์
app.get("/searchequipment", async (req, res) => {
  try {
    const { keyword } = req.query; // เรียกใช้ keyword ที่ส่งมาจาก query parameters

    // ใช้ regex เพื่อค้นหาคำหลักในชื่อของคู่มือ
    const regex = new RegExp(escapeRegex(keyword), "i");

    const result = await Equipment.find({
      $or: [
        { equipment_name: { $regex: regex } },
        { equipment_type: { $regex: regex } },
      ],
    });
    res.json({ status: "ok", data: result });
  } catch (error) {
    res.json({ status: error });
  }
});

app.get("/searchadmin", async (req, res) => {
  try {
    const { keyword } = req.query; // เรียกใช้ keyword ที่ส่งมาจาก query parameters

    // ใช้ regex เพื่อค้นหาคำหลักในชื่อของคู่มือ
    const regex = new RegExp(escapeRegex(keyword), "i");

    const result = await Admins.find({
      $or: [{ username: { $regex: regex } }],
    });

    res.json({ status: "ok", data: result });
  } catch (error) {
    res.json({ status: error });
  }
});

//ผู้ป่วย
//*******************//
app.post("/adduser", async (req, res) => {
  const {
    username,
    name,
    email,
    password,
    confirmPassword,
    tel,
    gender,
    birthday,
    ID_card_number,
    nationality,
    Address,
  } = req.body;
  if (!username || !password || !email || !name) {
    return res.json({
      error: "กรุณากรอกชื่อผู้ใช้ รหัสผ่าน อีเมล และชื่อ-นามสกุล",
    });
  }
  const encryptedPassword = await bcrypt.hash(password, 10);
  try {
    const oldUser = await User.findOne({ username });
    //ชื่อมีในระบบไหม
    if (oldUser) {
      return res.json({ error: "มีชื่อผู้ใช้นี้อยู่ในระบบแล้ว" });
    }

    if (password !== confirmPassword) {
      return res.json({ error: "รหัสผ่านไม่ตรงกัน" });
    }
    await User.create({
      username,
      name,
      email,
      password: encryptedPassword,
      tel,
      gender,
      birthday,
      ID_card_number,
      nationality,
      Address,
    });
    res.send({ status: "ok" });
  } catch (error) {
    res.send({ status: "error" });
  }
});

// --------------------------- ส่วนใหม่
const auth = new google.auth.GoogleAuth({
  keyFile: "homeward-422311-4bb083e6bd1e.json", // Path to the JSON file downloaded from Google Developer Console
  scopes: "https://www.googleapis.com/auth/spreadsheets.readonly",
});

// Function to fetch data from Google Sheets
async function getDataFromGoogleSheet() {
  const sheets = google.sheets({ version: "v4", auth });
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: "1k_V4qRCTbeRtra4ccKFMA5xAo1m9mamBXxYLN0uy8bc",
    range: "Sheet1", // Range of data to fetch
  });
  return response.data.values;
}





// Function to save data to MongoDB
async function saveDataToMongoDB() {
  try {
    const data = await getDataFromGoogleSheet();
    const latestSavedData = await User.find().sort({ createdAt: -1 }).limit(1);
    const lastSavedUsername =
      latestSavedData.length > 0 ? latestSavedData[0].username : "";

    // Exclude the first row if it's a header
    const newData = data.slice(1).filter((row) => row[1] !== lastSavedUsername);

    for (const row of newData) {
      const existingUser = await User.findOne({ $or: [{ username: row[1] }, { email: row[4] }] });
      if (existingUser) {
        console.log(`User with username ${row[1]} or email ${row[4]} already exists. Skipping...`);
        continue;
      }
   
      const encryptedPassword = await bcrypt.hash(row[5], 10);
      const newUser = new User({
        username: row[1],
        password: encryptedPassword,
        email: row[4],
        tel: row[5],
        name: row[2],
        surname: row[3],
        gender: row[6],
        birthday: row[7],
        ID_card_number: row[1],
        nationality: row[8],
        Address: row[9],
      });
      await newUser.save();
      console.log(`User with username ${row[1]} saved to MongoDB.`);
    }
    console.log(
      "Data fetched from Google Sheets and saved to MongoDB successfully"
    );
  } catch (error) {
    console.error("Error fetching data from Google Sheets:", error);
  }
}
// Polling every 5 minutes to check for new data
setInterval(saveDataToMongoDB, 0.2* 60 * 1000);
// saveDataToMongoDB();
//---------------------------------------


//loginuser
app.post("/loginuser", async (req, res) => {
  const { username, password } = req.body;

  const user = await User.findOne({ username });
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

app.post("/userdata", async (req, res) => {
  const { token } = req.body;
  try {
    const user = jwt.verify(token, JWT_SECRET);
    const username = user.username;

    User.findOne({ username: username }).then((data) => {
      return res.send({ status: "Ok", data: data });
    });
  } catch (error) {
    return res.send({ error: error });
  }
});

//ค้นหาผู้ป่วย
app.get("/searchuser", async (req, res) => {
  try {
    const { keyword } = req.query; // เรียกใช้ keyword ที่ส่งมาจาก query parameters

    // ใช้ regex เพื่อค้นหาคำหลักในชื่อของคู่มือ
    const regex = new RegExp(escapeRegex(keyword), "i");

    const result = await User.find({
      $or: [{ username: { $regex: regex } }, { name: { $regex: regex } }],
    });

    res.json({ status: "ok", data: result });
  } catch (error) {
    res.json({ status: error });
  }
});

//ลบผู้ป่วย
// app.delete("/deleteUser/:id", async (req, res) => {
//   const UserId = req.params.id;
//   try {
//     const result = await User.deleteOne({ _id: UserId });

//     if (result.deletedCount === 1) {
//       res.json({ status: "OK", data: "ลบข้อมูลผู้ป่วยสำเร็จ" });
//     } else {
//       res.json({
//         status: "Not Found",
//         data: "ไม่พบข้อมูลผู้ป่วยนี้หรือข้อมูลถูกลบไปแล้ว",
//       });
//     }
//   } catch (error) {
//     console.error("Error during deletion:", error);
//     res.status(500).json({ status: "Error", data: "Internal Server Error" });
//   }
// });
app.delete("/deleteUser/:id", async (req, res) => {
  const UserId = req.params.id;
  try {
    const result = await User.findOneAndUpdate(
      { _id: UserId },
      { $set: { deletedAt: new Date() } }
    );

    if (result) {
      res.json({ status: "OK", data: "ลบข้อมูลผู้ป่วยสำเร็จ" });
    } else {
      res.json({
        status: "Not Found",
        data: "ไม่พบข้อมูลผู้ป่วยนี้หรือข้อมูลถูกลบไปแล้ว",
      });
    }
  } catch (error) {
    console.error("Error during deletion:", error);
    res.status(500).json({ status: "Error", data: "Internal Server Error" });
  }
});


//ดึงคู่ข้อมูลผู้ป่วย
app.get("/getuser/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const user = await User.findById(id);

    if (!user) {
      return res.status(404).json({ error: "user not found" });
    }

    res.json(user);
  } catch (error) {
    console.error("Error fetching user:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

//แก้ไขผู้ป่วย
app.post("/updateuser/:id", async (req, res) => {
  // const { username, name, email,tel,gender,birthday,ID_card_number, nationality,Address  } = req.body;
  const {
    username,
    name,
    email,
    password,
    tel,
    gender,
    birthday,
    ID_card_number,
    nationality,
    Address,
  } = req.body;
  const { id } = req.params;

  try {
    const updatedUser = await User.findByIdAndUpdate(
      id,
      {
        username,
        name,
        email,
        password,
        tel,
        gender,
        birthday,
        ID_card_number,
        nationality,
        Address,
      },
      { new: true }
    );

    // await Admins.findByIdAndUpdate(id, { password: encryptedNewPassword });
    if (!updatedUser) {
      return res.status(404).json({ status: "User not found" });
    }

    res.json({ status: "ok", updatedUser });
  } catch (error) {
    res.json({ status: error });
  }
});

// app.get("/getadmin/:id", async (req, res) => {
//   const { id } = req.params;

//   try {
//     const admin = await Admins.findById(id);

//     if (!admin) {
//       return res.status(404).json({ error: "admin not found" });
//     }

//     res.json(admin);
//   } catch (error) {
//     console.error("Error fetching user:", error);
//     res.status(500).json({ error: "Internal Server Error" });
//   }
// });

app.post("/updatenameadmin/:id", async (req, res) => {
  const { name } = req.body;
  const id = req.params.id;
  try {
    // อัปเดตชื่อของ admin
    // const admin = await Admins.findById(id);
    await Admins.findByIdAndUpdate(id, { name });

    res
      .status(200)
      .json({ status: "ok", message: "ชื่อผู้ใช้ถูกอัปเดตเรียบร้อยแล้ว" });
  } catch (error) {
    console.error("Error during name update:", error);
    res.status(500).json({ error: "มีข้อผิดพลาดในการอัปเดตชื่อผู้ใช้" });
  }
});

//เปลี่ยนอีเมล ส่ง otp ยังไม่มีตัวเก็บ otp เพื่อเช็คว่าตรงกับที่ส่งไหม

// app.post("/sendotp", async (req, res) => {
//   const { email } = req.body;
//   const otp = randomstring.generate(6); // สร้างรหัส OTP แบบสุ่ม

//   try {
//     // ส่งอีเมล OTP ไปยังอีเมลของผู้ใช้
//     let transporter = nodemailer.createTransport({
//       service: 'gmail',
//       auth: {
//         user: 'oysasitorn@gmail.com', // อีเมลของคุณ
//         pass: 'avyn xfwl pqio hmtr' // รหัสผ่านของคุณ
//       }
//     });

//     let mailOptions = {
//       from: 'oysasitorn@gmail.com', // อีเมลของคุณ
//       to: email,
//       subject: 'รหัส OTP สำหรับยืนยันการเปลี่ยนอีเมล',
//       text: `รหัส OTP ของคุณคือ: ${otp}`
//     };

//     transporter.sendMail(mailOptions, (error, info) => {
//       if (error) {
//         console.log(error);
//         res.json({ error: "เกิดข้อผิดพลาดในการส่งอีเมล OTP" });
//       } else {
//         console.log('Email sent: ' + info.response);
//         res.json({ success: true, otp });
//       }
//     });
//   } catch (error) {
//     console.log(error);
//     res.json({ error: "เกิดข้อผิดพลาด" });
//   }
// });

// app.post("/updateemail", async (req, res) => {
//   const { email, otp } = req.body;
//   if (!email || !otp) {
//     return res.json({ error: "กรุณากรอกอีเมลและรหัส OTP" });
//   }

//   // ตรวจสอบว่า OTP ถูกต้องหรือไม่ (ให้ส่ง OTP ไปยังอีเมลของผู้ใช้แล้วตรวจสอบ)
//   if (otp !== correctOTP) { // สมมติว่า correctOTP เป็นตัวแปรที่เก็บรหัส OTP ที่ถูกส่งไปยังอีเมลของผู้ใช้
//     return res.json({ error: "รหัส OTP ไม่ถูกต้อง" });
//   }

//   try {
//     // อัปเดตอีเมลใหม่ในฐานข้อมูลของผู้ใช้
//     await Admins.updateOne({ email: req.user.email }, { $set: { email } });
//     res.send({ status: "ok" });
//   } catch (error) {
//     res.send({ status: "error" });
//   }
// });
//----------------------------------------------

app.post("/updatemedicalinformation/:id", upload1, async (req, res) => {
  const {
    HN,
    AN,
    Date_Admit,
    Date_DC,
    Diagnosis,
    Chief_complaint,
    Present_illness,
    Phychosocial_assessment,
    Management_plan,
    selectedPersonnel,
  } = req.body;
  const { id } = req.params;

  try {
    let filePresent = "";
    let fileManage = "";
    let filePhychosocial = "";

    if (req.files["fileP"] && req.files["fileP"][0]) {
      filePresent = req.files["fileP"][0].path;
    }

    if (req.files["fileM"] && req.files["fileM"][0]) {
      fileManage = req.files["fileM"][0].path;
    }

    if (req.files["filePhy"] && req.files["filePhy"][0]) {
      filePhychosocial = req.files["filePhy"][0].path;
    }

    const oldMedicalInfo = await MedicalInformation.findById(id);

    if (!oldMedicalInfo) {
      return res.status(404).json({ status: "Medical information not found" });
    }

    let existingFilename = "";
    // ตรวจสอบว่ามีการอัปโหลดไฟล์ไม่
    if (filePresent !== "") {
      existingFilename = filePresent;
    } else {
      existingFilename = oldMedicalInfo.fileP;
    }

    let existingFilename1 = "";
    // ตรวจสอบว่ามีการอัปโหลดไฟล์ไม่
    if (fileManage !== "") {
      existingFilename1 = fileManage;
    } else {
      existingFilename1 = oldMedicalInfo.fileM;
    }

    let existingFilename2 = "";
    // ตรวจสอบว่ามีการอัปโหลดไฟล์ไม่
    if (filePhychosocial !== "") {
      existingFilename2 = filePhychosocial;
    } else {
      existingFilename2 = oldMedicalInfo.filePhy;
    }

    const updatedMedicalInformation =
      await MedicalInformation.findByIdAndUpdate(
        id,
        {
          HN,
          AN,
          Date_Admit,
          Date_DC,
          Diagnosis,
          Chief_complaint,
          Present_illness,
          Phychosocial_assessment,
          Management_plan,
          fileP: existingFilename,
          fileM: existingFilename1,
          filePhy: existingFilename2,
          selectedPersonnel: selectedPersonnel,
        },
        { new: true }
      );

    if (!updatedMedicalInformation) {
      return res.status(404).json({ status: "Medical information not found" });
    }

    res.json({ status: "ok", updatedMedicalInfo: updatedMedicalInformation });
  } catch (error) {
    res.json({ status: error });
  }
});

//ดึงแพทย์มา
app.get("/getmpersonnel/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const mpersonnel = await MPersonnel.findById(id);

    if (!mpersonnel) {
      return res.status(404).json({ error: "mpersonnel not found" });
    }

    res.json(mpersonnel);
  } catch (error) {
    console.error("Error fetching mpersonnel:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

//แก้ไขอุปกรณ์
app.post("/updatemp/:id", async (req, res) => {
  const { username, password, email, confirmPassword, tel, nametitle, name } =
    req.body;
  const { id } = req.params;

  try {
    const UpdatedMP = await MPersonnel.findByIdAndUpdate(
      id,
      {
        username,
        password,
        email,
        confirmPassword,
        tel,
        nametitle,
        name,
      },
      { new: true }
    );

    // await Admins.findByIdAndUpdate(id, { password: encryptedNewPassword });
    if (!UpdatedMP) {
      return res.status(404).json({ status: "Equip not found" });
    }

    res.json({ status: "ok", UpdatedMP });
  } catch (error) {
    res.json({ status: error });
  }
});

app.get("/equipmentuser/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const equipmentusers = await EquipmentUser.findOne({ user: id });
    if (!equipmentusers) {
      return res
        .status(404)
        .send({
          status: "error",
          message: "Medical information not found for this user",
        });
    }
    res.send({ status: "ok", data: equipmentusers });
  } catch (error) {
    console.log(error);
    res.status(500).send({ status: "error", message: "Internal Server Error" });
  }
});

//ดึงคู่ข้อมูลอุปกรณ์
app.get("/getequip/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const equip = await Equipment.findById(id);

    if (!equip) {
      return res.status(404).json({ error: "equip not found" });
    }

    res.json(equip);
  } catch (error) {
    console.error("Error fetching equip:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

//แก้ไขอุปกรณ์
app.post("/updateequip/:id", async (req, res) => {
  const { equipment_name, equipment_type } = req.body;
  const { id } = req.params;

  try {
    const UpdatedEquipment = await Equipment.findByIdAndUpdate(
      id,
      {
        equipment_name,
        equipment_type,
      },
      { new: true }
    );

    // await Admins.findByIdAndUpdate(id, { password: encryptedNewPassword });
    if (!UpdatedEquipment) {
      return res.status(404).json({ status: "Equip not found" });
    }

    res.json({ status: "ok", UpdatedEquipment });
  } catch (error) {
    res.json({ status: error });
  }
});
