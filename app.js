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
const crypto = require('crypto');

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
const Caregiver = mongoose.model("Caregiver");
const Symptom = mongoose.model("Symptom");
const PatientForm = mongoose.model("PatientForm");
const Assessment = mongoose.model("Assessment");

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
  } catch (error) { }
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
          throw error;
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
app.post('/updateequip/:id', async (req, res) => {
  const { id } = req.params;
  const { equipment_name, equipment_type } = req.body;
  try {
    const equipment = await Equipment.findById(id);

    if (!equipment) {
      return res.status(404).json({ error: 'Equipment not found' });
    }

    equipment.equipment_name = equipment_name;
    equipment.equipment_type = equipment_type;
    await equipment.save();

    res.send({ status: 'ok', equipment });
  } catch (error) {
    console.error(error);
    res.send({ status: 'error' });
  }
});

app.post("/addequip", async (req, res) => {
  const { equipment_name, equipment_type } = req.body;
  try {
    const oldequipment = await Equipment.findOne({ equipment_name });

    if (oldequipment) {
      return res.json({ error: "Equipment Exists" });
    }
    await Equipment.create({
      equipment_name,
      equipment_type,
    });

    res.send({ status: "ok" });
  } catch (error) {
    console.error(error);
    res.send({ status: "error" });
  }
});

app.post("/addequipuser", async (req, res) => {
  try {
    const { equipments, userId } = req.body;

    if (!userId) {
      return res.json({ status: "error", message: "ไม่พบข้อมูลผู้ใช้" });
    }

    const existingEquipments = await EquipmentUser.find({ user: userId });
    const existingEquipNames = existingEquipments.map(equip => equip.equipmentname_forUser);

    const duplicateEquipments = equipments.filter(equip =>
      existingEquipNames.includes(equip.equipmentname_forUser)
    );

    if (duplicateEquipments.length > 0) {
      return res.json({ status: "error", message: "มีอุปกรณ์นี้อยู่แล้ว" });
    }

    const equipmentUsers = equipments.map((equip) => ({
      equipmentname_forUser: equip.equipmentname_forUser,
      equipmenttype_forUser: equip.equipmenttype_forUser,
      user: userId,
    }));

    const equipusers = await EquipmentUser.create(equipmentUsers);

    res.json({ status: "ok", data: equipusers });
  } catch (error) {
    console.error("Error adding equipment users:", error);
    res.status(500).json({ status: "error", message: "Internal server error" });
  }
});

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
  const { username, password, email, confirmPassword, tel, nametitle, name, surname } =
    req.body;
  const encryptedPassword = await bcrypt.hash(password, 10);
  if (!username || !password || !email || !name || !surname || !nametitle) {
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
      surname,
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

// Add medical information
app.post("/addmedicalinformation", upload1, async (req, res) => {
  try {
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
      userId // This should match the key in the frontend FormData
    } = req.body;

    // Initializing file variables
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

    // Check if userId is present
    if (!userId) {
      return res.json({ status: "error", message: "ไม่พบข้อมูลผู้ใช้" });
    }

    // Create new medical information record
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
      user: userId, // Use the userId sent from the frontend
    });

    res.json({ status: "ok", data: medicalInformation });
  } catch (error) {
    console.error("Error adding medical information:", error); // Log the error for debugging
    res.json({ status: "error", message: "เกิดข้อผิดพลาดขณะเพิ่มข้อมูล" });
  }
});


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

app.delete("/deleteEquipuser/:id", async (req, res) => {
  try {
    const { equipmentNames, userId } = req.body;

    if (!userId) {
      return res.json({ status: "error", message: "ไม่พบข้อมูลผู้ใช้" });
    }

    if (!equipmentNames || equipmentNames.length === 0) {
      return res.json({ status: "error", message: "ไม่พบชื่ออุปกรณ์ที่จะลบ" });
    }

    const deletedEquipments = await EquipmentUser.deleteMany({
      user: userId,
      equipmentname_forUser: { $in: equipmentNames },
    });

    if (deletedEquipments.deletedCount === 0) {
      return res.json({ status: "error", message: "ไม่พบอุปกรณ์ที่จะลบ" });
    }

    res.json({ status: "ok", message: "ลบอุปกรณ์สำเร็จ" });
  } catch (error) {
    console.error("Error removing equipment user:", error);
    res.status(500).json({ status: "error", message: "Internal server error" });
  }
});

app.delete("/deletemedicalInformation/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const medicalInfo = await MedicalInformation.deleteOne({ user: id });

    if (!medicalInfo.deletedCount) {
      return res.status(404).json({ error: "Medical information not found for this user" });
    }

    res.json({ message: "ลบข้อมูลการเจ็บป่วยสำเร็จ", data: medicalInfo });
  } catch (error) {
    console.error("Error deleting medical information:", error);
    res.status(500).json({ error: "Internal Server Error" });
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
  const { nametitle, name, surname, tel } = req.body;
  const id = req.params.id;
  try {
    // อัปเดตชื่อของ admin
    // const admin = await Admins.findById(id);
    await MPersonnel.findByIdAndUpdate(id, { nametitle, name, surname, tel });

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
  } catch (error) { }
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

const { GoogleAuth } = require('google-auth-library');

const auth = new GoogleAuth({
  keyFile: process.env.GOOGLE_APPLICATION_CREDENTIALS,
  scopes: 'https://www.googleapis.com/auth/spreadsheets.readonly',
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

      // Save caregiver data
      const caregiverData = {
        user: newUser._id,
        name: row[11],
        surname: row[14],
        Relationship: row[12],
        tel: row[13],
      };
      const newCaregiver = new Caregiver(caregiverData);
      await newCaregiver.save();
      console.log(`Caregiver ${row[11]} saved to MongoDB.`);
    }
    console.log(
      "Data fetched from Google Sheets and saved to MongoDB successfully"
    );
  } catch (error) {
    console.error("Error fetching data from Google Sheets:", error);
  }
}

//---------------------------------------

// async function getLatestUserId() {
//   try {
//     const latestSavedData = await User.find().sort({ createdAt: -1 }).limit(1);
//     return latestSavedData.length > 0 ? latestSavedData[0]._id : null;
//   } catch (error) {
//     console.error("Error fetching latest user ID:", error);
//     return null;
//   }
// }

// async function saveDataCaregiver() {
//   try {
//     const data = await getDataFromGoogleSheet();
//     const lastSavedUserId = await getLatestUserId();

//     const newData = data.slice(1);

//     for (const row of newData) {
//       const existingCaregiver = await Caregiver.findOne({ user: lastSavedUserId });
//       if (existingCaregiver) {
//         console.log(`Caregiver with user ID ${lastSavedUserId} already exists. Skipping...`);
//         continue;
//       }    
//       const newCaregiver = new Caregiver({
//         user: lastSavedUserId,        
//         name: row[11],
//         surname: row[14],
//         Relationship: row[12],
//         tel: row[13],
//       });
//       await newCaregiver.save();
//       console.log(`Caregiver ${row[11]} saved to MongoDB.`);
//     }
//     console.log(
//       "Data fetched from Google Sheets and saved to MongoDB successfully"
//     );
//   } catch (error) {
//     console.error("Error fetching data from Google Sheets:", error);
//   }
// }

// setInterval(saveDataToMongoDB, 0.2 * 60 * 1000);

//loginuser
// app.post("/loginuser", async (req, res) => {
//   const { username, password } = req.body;

//   const user = await User.findOne({ username });
//   if (!user) {
//     return res.json({ error: "User Not found" });
//   }
//   if (await bcrypt.compare(password, user.password)) {
//     const token = jwt.sign({ username: user.username }, JWT_SECRET, {
//       expiresIn: "15m",
//     });

//     if (res.status(201)) {
//       return res.json({ status: "ok", data: token });
//     } else {
//       return res.json({ error: "error" });
//     }
//   }
//   res.json({ status: "error", error: "InvAlid Password" });
// });

//แอป
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
// app.post("/userdata", async (req, res) => {
//   const { token } = req.body;
//   try {
//     const user = jwt.verify(token, JWT_SECRET);
//     const username = user.username;

//     User.findOne({ username: username }).then((data) => {
//       if (!data) {
//         return res.status(404).json({ error: "ไม่พบข้อมูลผู้ใช้" });
//       }
//       return res.send({ status: "Ok", data: data });
//     });
//   } catch (error) {
//     if (error.name === 'TokenExpiredError') {
//       return res.status(401).json({ error: "Token หมดอายุ" });
//     }
//     return res.status(400).json({ error: "Token ไม่ถูกต้อง" });
//   }
// });


app.post("/loginuser", async (req, res) => {
  const { username, password } = req.body;

  try {
    const user = await User.findOne({ username });

    if (!user) {
      return res.status(404).json({ error: "ยังไม่มีบัญชีผู้ใช้นี้" });
    }

    if (user.deletedAt) {
      return res.status(410).json({ error: "ยังไม่มีบัญชีผู้ใช้นี้" });
    }

    if (await bcrypt.compare(password, user.password)) {
      const token = jwt.sign({ username: user.username }, JWT_SECRET, {
        expiresIn: "15m",
      });

      return res.json({ status: "ok", data: token });
    } else {
      return res.status(401).json({ error: "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง" });
    }
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

//ลืมรหัสผ่าน
app.post('/forgot-passworduser', async (req, res) => {
  const { email } = req.body;

  const user = await User.findOne({ email });
  if (!user) {
    return res.status(400).send('User not found');
  }

  const otp = crypto.randomBytes(3).toString('hex');
  const otpExpiration = Date.now() + 3600000; // 1 hour expiration

  user.otp = otp;
  user.otpExpiration = otpExpiration;
  await user.save();

  const transporter = nodemailer.createTransport({
    service: 'Gmail',
    auth: {
      user: 'oysasitorn@gmail.com',
      pass: 'avyn xfwl pqio hmtr',
    },
  });

  const mailOptions = {
    from: "oysasitorn@gmail.com",
    to: user.email,
    subject: 'Home Ward: OTP for Password Reset',
    text: `Your OTP is ${otp}`,
  };

  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      return res.status(500).send('Error sending email');
    }
    res.send('OTP sent');
  });
});

app.post('/verify-otp', async (req, res) => {
  const { email, otp } = req.body;

  const user = await User.findOne({ email, otp, otpExpiration: { $gt: Date.now() } });
  if (!user) {
    return res.status(400).send('Invalid OTP or OTP expired');
  }

  res.send('OTP verified');
});

app.post('/reset-password', async (req, res) => {
  const { email, newPassword, confirmpassword } = req.body;

  const user = await User.findOne({ email });
  if (!user) {
    return res.status(400).send('ไม่พบบัญชีนี้');
  }
  if (newPassword !== confirmpassword) {
    return res.send("รหัสผ่านไม่ตรงกัน");
  }
  const encryptedPassword = await bcrypt.hash(newPassword, 10);

  user.password = encryptedPassword;
  user.otp = undefined;
  user.otpExpiration = undefined;
  await user.save();

  res.send('เปลี่ยนรหัสสำเร็จ');
});


app.post("/updateuserinfo/:id", async (req, res) => {
  const {
    username,
    name,
    surname,
    tel,
    gender,
    birthday,
    ID_card_number,
    nationality,
    Address,
    user, // ID ของผู้ใช้ที่ใช้เชื่อมโยงกับผู้ดูแล
    caregiverName,
    caregiverSurname,
    caregiverTel,
    Relationship
  } = req.body;

  try {
    // อัปเดตข้อมูลผู้ใช้
    await User.updateOne(
      { username: username },
      {
        $set: {
          name,
          surname,
          tel,
          gender,
          birthday,
          ID_card_number,
          nationality,
          Address,
        },
      }
    );

    // อัปเดตข้อมูลผู้ดูแล
    if (user) {
      await Caregiver.updateOne(
        { user: user },
        {
          $set: {
            name: caregiverName,
            surname: caregiverSurname,
            tel: caregiverTel,
            Relationship,
          },
        }
      );
    }

    res.send({ status: "Ok", data: "Updated" });
  } catch (error) {
    console.error("Error updating user or caregiver:", error);
    return res.status(500).send({ error: "Error updating user or caregiver" });
  }
});

//ดึงข้อมูลผู้ดูแล
app.get("/getcaregiver/:id", async (req, res) => {
  const { id } = req.params;
  try {
    if (!id) {
      return res.status(400).send({
        status: "error",
        message: "id is required",
      });
    }
    const Caregiverinfo = await Caregiver.findOne({ user: id });
    if (!Caregiverinfo) {
      return res
        .status(404)
        .send({
          status: "error",
          message: "not found for this user",
        });
    }
    res.send({ status: "ok", data: Caregiverinfo });
  } catch (error) {
    console.log(error);
    res.status(500).send({ status: "error", message: "Internal Server Error" });
  }
});
//แก้ไขผู้ป่วย แอป
app.post("/updateuserapp", async (req, res) => {
  const {
    username,
    name,
    surname,
    tel,
    gender,
    birthday,
    ID_card_number,
    nationality,
    Address,
  } = req.body;

  try {
    await User.updateOne(
      { username: username },
      {
        $set: {
          name,
          surname,
          tel,
          gender,
          birthday,
          ID_card_number,
          nationality,
          Address,
        },
      },
    );
    res.send({ status: "Ok", data: "Updated" });
  } catch (error) {
    console.error("Error updating user:", error);
    return res.status(500).send({ error: "Error updating user" });
  }
});

//แก้ไขผู้ดูแล แอป
app.post("/updatecaregiver", async (req, res) => {
  const {
    user,
    name,
    surname,
    tel,
    Relationship,
  } = req.body;

  try {
    if (!user) {
      return res.status(400).send({ error: "User is required" });
    }
    await Caregiver.updateOne(
      { user: user },
      {
        $set: {
          name,
          surname,
          tel,
          Relationship,
        },
      },
    );
    res.send({ status: "Ok", data: "Updated" });
  } catch (error) {
    console.error("Error updating user:", error);
    return res.status(500).send({ error: "Error updating user" });
  }
});

//แก้ไขรหัสผ่าน
app.post("/updatepassuser", async (req, res) => {
  const {
    username,
    password,
    newPassword,
    confirmNewPassword
  } = req.body;

  try {
    if (!username || !password || !newPassword || !confirmNewPassword) {
      return res.status(400).send({ error: "Missing required fields" });
    }

    if (newPassword.trim() !== confirmNewPassword.trim()) {
      return res.status(400).json({ error: "รหัสผ่านไม่ตรงกัน" });
    }

    // ตรวจสอบรหัสผ่านเก่า
    const user = await User.findOne({ username: username });
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: "รหัสผ่านเก่าไม่ถูกต้อง" });
    }

    const encryptedNewPassword = await bcrypt.hash(newPassword, 10);

    await User.updateOne(
      { username: username },
      {
        $set: {
          password: encryptedNewPassword,
        },
      },
    );
    res.send({ status: "Ok", data: "Updated" });
  } catch (error) {
    console.error("Error updating user:", error);
    return res.status(500).send({ error: "Error updating user" });
  }
});


app.post("/addpatientform", async (req, res) => {
  const { Symptom1, Symptom2, Symptom3, Symptom4, Symptom5, BloodPressure, PulseRate, Temperature, DTX, Resptration, LevelSymptom, Painscore, request_detail, Recorder, user } = req.body;
  try {
    await PatientForm.create({
      Symptom1, Symptom2, Symptom3, Symptom4, Symptom5,
      BloodPressure,
      PulseRate,
      Temperature,
      DTX,
      Resptration,
      LevelSymptom,
      Painscore,
      request_detail,
      Recorder,
      user,
    });

    res.send({ status: "ok" });
  } catch (error) {
    console.error(error);
    res.send({ status: "error" });
  }
});

//เอาบันทึกคนนี้้มาทั้งหมด
app.get("/getpatientforms/:userId", async (req, res) => {
  const userId = req.params.userId;

  try {
    const patientForms = await PatientForm.find({ user: userId }).populate('user');
    res.send({ status: "ok", data: patientForms });
  } catch (error) {
    console.error(error);
    res.send({ status: "error" });
  }
});

//ฝั่งแพทย์
// เอาอาการที่เลือกมาแสดง
app.get("/getpatientformsone/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const patientFormsone = await PatientForm.findById(id);
    res.send({ status: "ok", data: patientFormsone });
  } catch (error) {
    console.error(error);
    res.send({ status: "error" });
  }
});

// จบแอป-------------------------------------------

//กราฟDTX แบบมีเท่าไหร่มาหมด
// app.get("/getDTXData/:userId", async (req, res) => {
//   const userId = req.params.userId;

//   try {
//     const patientForms = await PatientForm.find({ user: userId }).populate('user');

//     const dtxData = patientForms.map(form => ({ 
//       name: form.user.name, 
//       DTX: form.DTX
//     }));

//     res.send({ status: "ok", data: dtxData });
//   } catch (error) {
//     console.error("Error fetching DTX data:", error);
//     res.send({ status: "error" });
//   }
// });

//แค่7
app.get("/getDTXData/:userId", async (req, res) => {
  const userId = req.params.userId;

  try {
    const patientForms = await PatientForm.find({ user: userId })
      .populate('user')
      .sort({ createdAt: -1 }) // เรียงลำดับตาม createdAt จากใหม่สุดไปเก่าสุด
      .limit(7); // จำกัดให้แสดงเฉพาะ 7 อันแรก

    const dtxData = patientForms.map(form => ({
      name: form.user.name,
      DTX: form.DTX,
      createdAt: form.createdAt
    })).reverse();

    res.send({ status: "ok", data: dtxData });
  } catch (error) {
    console.error("Error fetching DTX data:", error);
    res.send({ status: "error" });
  }
});


app.get("/getPainscoreData/:userId", async (req, res) => {
  const userId = req.params.userId;

  try {
    const patientForms = await PatientForm.find({ user: userId })
      .populate('user')
      .sort({ createdAt: -1 }) // เรียงลำดับตาม createdAt จากใหม่สุดไปเก่าสุด
      .limit(7); // จำกัดให้แสดงเฉพาะ 7 อันแรก

    const PainscoreData = patientForms.map(form => ({
      name: form.user.name,
      Painscore: form.Painscore,
      createdAt: form.createdAt
    })).reverse();

    res.send({ status: "ok", data: PainscoreData });
  } catch (error) {
    console.error("Error fetching Painscore data:", error);
    res.send({ status: "error" });
  }
});


app.get("/getTemperatureData/:userId", async (req, res) => {
  const userId = req.params.userId;

  try {
    const patientForms = await PatientForm.find({ user: userId })
      .populate('user')
      .sort({ createdAt: -1 }) // เรียงลำดับตาม createdAt จากใหม่สุดไปเก่าสุด
      .limit(7); // จำกัดให้แสดงเฉพาะ 7 อันแรก

    const TemperatureData = patientForms.map(form => ({
      name: form.user.name,
      Temperature: form.Temperature,
      createdAt: form.createdAt
    })).reverse();

    res.send({ status: "ok", data: TemperatureData });
  } catch (error) {
    console.error("Error fetching  Temperature data:", error);
    res.send({ status: "error" });
  }
});

app.get("/getBloodPressureData/:userId", async (req, res) => {
  const userId = req.params.userId;

  try {
    const patientForms = await PatientForm.find({ user: userId })
      .populate('user')
      .sort({ createdAt: -1 }) // เรียงลำดับตาม createdAt จากใหม่สุดไปเก่าสุด
      .limit(7); // จำกัดให้แสดงเฉพาะ 7 อันแรก

    const BloodPressureData = patientForms.map(form => ({
      name: form.user.name,
      BloodPressure: form.BloodPressure,
      createdAt: form.createdAt
    })).reverse();

    res.send({ status: "ok", data: BloodPressureData });
  } catch (error) {
    console.error("Error fetching  BloodPressure data:", error);
    res.send({ status: "error" });
  }
});

app.get("/getPulseRateData/:userId", async (req, res) => {
  const userId = req.params.userId;

  try {
    const patientForms = await PatientForm.find({ user: userId })
      .populate('user')
      .sort({ createdAt: -1 }) // เรียงลำดับตาม createdAt จากใหม่สุดไปเก่าสุด
      .limit(7); // จำกัดให้แสดงเฉพาะ 7 อันแรก

    const PulseRateData = patientForms.map(form => ({
      name: form.user.name,
      PulseRate: form.PulseRate,
      createdAt: form.createdAt
    })).reverse();

    res.send({ status: "ok", data: PulseRateData });
  } catch (error) {
    console.error("Error fetching  PulseRate data:", error);
    res.send({ status: "error" });
  }
});


app.get("/getResptrationData/:userId", async (req, res) => {
  const userId = req.params.userId;

  try {
    const patientForms = await PatientForm.find({ user: userId })
      .populate('user')
      .sort({ createdAt: -1 }) // เรียงลำดับตาม createdAt จากใหม่สุดไปเก่าสุด
      .limit(7); // จำกัดให้แสดงเฉพาะ 7 อันแรก

    const ResptrationData = patientForms.map(form => ({
      name: form.user.name,
      Resptration: form.Resptration,
      createdAt: form.createdAt
    })).reverse();

    res.send({ status: "ok", data: ResptrationData });
  } catch (error) {
    console.error("Error fetching  Resptration data:", error);
    res.send({ status: "error" });
  }
});
//ประเมิน
app.post("/addassessment", async (req, res) => {
  const { suggestion, detail, status_name, PPS, MPersonnel, PatientForm } = req.body;
  try {
    await Assessment.create({
      suggestion, detail, status_name, PPS, MPersonnel, PatientForm,
    });
    res.send({ status: "ok" });
  } catch (error) {
    if (error.code === 11000 && error.keyPattern.PatientForm) {
      res.status(400).send({ status: "error", message: "PatientForm already has an assessment." });
    } else {
      console.error(error);
      res.status(500).send({ status: "error", message: "An error occurred while adding assessment." });
    }
  }
});

// app.get("/searchassessment", async (req, res) => {
//   try {
//     const { keyword } = req.query; // เรียกใช้ keyword ที่ส่งมาจาก query parameters

//     // ใช้ regex เพื่อค้นหาคำหลักในชื่อของคู่มือ
//     const regex = new RegExp(escapeRegex(keyword), "i");

//     const result = await User.find({
//       $or: [ { name: { $regex: regex } },{ surname: { $regex: regex } }],
//     });

//     res.json({ status: "ok", data: result });
//   } catch (error) {
//     res.json({ status: error });
//   }
// });
app.get("/searchassessment", async (req, res) => {
  try {
    const { keyword } = req.query; // เรียกใช้ keyword ที่ส่งมาจาก query parameters
    const regex = new RegExp(escapeRegex(keyword), "i");

    // Search in User collection for name and surname
    const users = await User.find({
      $or: [{ name: { $regex: regex } }, { surname: { $regex: regex } }],
    });

    // Search in MedicalInformation collection for Diagnosis, HN, and AN
    const medicalInfos = await MedicalInformation.find({
      $or: [
        { Diagnosis: { $regex: regex } },
        { HN: { $regex: regex } },
        { AN: { $regex: regex } },
      ],
    });

    // Combine user IDs from both searches
    const userIdsFromUsers = users.map(user => user._id);
    const userIdsFromMedicalInfos = medicalInfos.map(info => info.user);

    const uniqueUserIds = [...new Set([...userIdsFromUsers, ...userIdsFromMedicalInfos])];

    const result = await User.find({ _id: { $in: uniqueUserIds } });

    res.json({ status: "ok", data: result });
  } catch (error) {
    console.log(error);
    res.json({ status: "error", message: "An error occurred while searching" });
  }
});

//ดึงแบบประเมิน
app.get("/getassessment/:Patientid", async (req, res) => {
  const { Patientid } = req.params;
  try {

    const Assessmentdata = await Assessment.findOne({ PatientForm: Patientid });
    if (!Assessmentdata) {
      return res
        .status(404)
        .send({
          status: "error",
          message: "not found for this user",
        });
    }
    res.send({ status: "ok", data: Assessmentdata });
  } catch (error) {
    console.log(error);
    res.status(500).send({ status: "error", message: "Internal Server Error" });
  }
});

//ดึงประเมินทั้งหมด
app.get("/allAssessment", async (req, res) => {
  try {
    const allAssessment = await Assessment.find({});
    res.send({ status: "ok", data: allAssessment });
  } catch (error) {
    console.log(error);
  }
});

app.get("/allAssessments", async (req, res) => {
  try {
    const assessments = await Assessment.find().populate('MPersonnel');
    res.send({ status: "ok", data: assessments });
  } catch (error) {
    console.log(error);
  }
});

// --------------------------
//ค้นหาผู้ป่วย
app.get("/searchuser", async (req, res) => {
  try {
    const { keyword } = req.query; // เรียกใช้ keyword ที่ส่งมาจาก query parameters

    // ใช้ regex เพื่อค้นหาคำหลักในชื่อของคู่มือ
    const regex = new RegExp(escapeRegex(keyword), "i");

    const result = await User.find({
      $or: [{ username: { $regex: regex } }, { surname: { $regex: regex } }, { name: { $regex: regex } }],
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
  const {
    username,
    name,
    surname,
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
        surname,
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

//ดึงข้อมูลแพทย์
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


// app.get("/getmpersonnelass/:id", async (req, res) => {
//   const { id } = req.params;
//   try {
//     const mpersonnel = await MPersonnel.findOne(id);

//     if (!mpersonnel) {
//       return res.status(404).json({ error: "mpersonnel not found" });
//     }

//     res.json(mpersonnel);
//   } catch (error) {
//     console.error("Error fetching mpersonnel:", error);
//     res.status(500).json({ error: "Internal Server Error" });
//   }
// });

//แก้ไขแพทย์
app.post("/updatemp/:id", async (req, res) => {
  const { username, password, email, confirmPassword, tel, nametitle, name, surname } =
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
        surname,
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
app.post("/updateequipuser/:id", async (req, res) => {
  try {
    const userId = req.params.id;
    const { equipments } = req.body;

    // ตรวจสอบว่ามีอุปกรณ์ที่ต้องการอัปเดตหรือไม่
    if (!equipments || equipments.length === 0) {
      return res.json({ status: "error", message: "ไม่มีข้อมูลอุปกรณ์" });
    }

    // สร้างอาเรย์ของอุปกรณ์ผู้ใช้ใหม่
    const updatedEquipmentUsers = equipments.map((equip) => ({
      equipmentname_forUser: equip.equipmentname_forUser,
      equipmenttype_forUser: equip.equipmenttype_forUser,
      user: userId,
    }));

    // ลบอุปกรณ์เดิมของผู้ใช้
    await EquipmentUser.deleteMany({ user: userId });

    // เพิ่มข้อมูลอุปกรณ์ใหม่ลงในฐานข้อมูล
    const equipusers = await EquipmentUser.create(updatedEquipmentUsers);

    // ส่งข้อมูลการอัปเดตกลับไปยังไคลเอนต์
    res.json({ status: "ok", data: equipusers });
  } catch (error) {
    console.error("Error updating equipment users:", error);
    res.status(500).json({ status: "error", message: "Internal server error" });
  }
});

// --------------------------------------------------
//เพิ่มอาการ
app.post("/addsymptom", async (req, res) => {
  const { name } = req.body;
  try {
    const oldesymptom = await Symptom.findOne({ name });

    if (oldesymptom) {
      return res.json({ error: "Symptom Exists" });
    }


    await Symptom.create({
      name,
    });

    res.send({ status: "ok" });
  } catch (error) {
    console.error(error);
    res.send({ status: "error" });
  }
});


app.get("/searchsymptom", async (req, res) => {
  try {
    const { keyword } = req.query; // เรียกใช้ keyword ที่ส่งมาจาก query parameters

    // ใช้ regex เพื่อค้นหาคำหลักในชื่อของคู่มือ
    const regex = new RegExp(escapeRegex(keyword), "i");

    const result = await Symptom.find({
      $or: [{ name: { $regex: regex } }],
    });

    res.json({ status: "ok", data: result });
  } catch (error) {
    res.json({ status: error });
  }
});


app.get("/allSymptom", async (req, res) => {
  try {
    const allSymptom = await Symptom.find({});
    res.send({ status: "ok", data: allSymptom });
  } catch (error) {
    console.log(error);
  }
});

//ลบอาการ
app.delete("/deletesymptom/:id", async (req, res) => {
  const SymptomId = req.params.id;
  try {
    const result = await Symptom.deleteOne({ _id: SymptomId });

    if (result.deletedCount === 1) {
      res.json({ status: "OK", data: "ลบข้อมูลอาการผู้ป่วยสำเร็จ" });
    } else {
      res.json({
        status: "Not Found",
        data: "ไม่พบข้อมูลอาการนี้หรือข้อมูลถูกลบไปแล้ว",
      });
    }
  } catch (error) {
    console.error("Error during deletion:", error);
    res.status(500).json({ status: "Error", data: "Internal Server Error" });
  }
});

//แก้ไขอาการ
app.post("/updatesymptom/:id", async (req, res) => {
  const { name } = req.body;
  const { id } = req.params;

  try {
    const UpdatedSymptom = await Symptom.findByIdAndUpdate(
      id,
      {
        name,
      },
      { new: true }
    );

    // await Admins.findByIdAndUpdate(id, { password: encryptedNewPassword });
    if (!UpdatedSymptom) {
      return res.status(404).json({ status: "Symptom not found" });
    }

    res.json({ status: "ok", UpdatedSymptom });
  } catch (error) {
    res.json({ status: error });
  }
});

app.get("/getsymptom/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const symptom = await Symptom.findById(id);

    if (!symptom) {
      return res.status(404).json({ error: "symptom not found" });
    }

    res.json(symptom);
  } catch (error) {
    console.error("Error fetching symptom:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});


// ------------------------------------------------