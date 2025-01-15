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
require('dotenv').config();
const { google } = require("googleapis");
const axios = require('axios');
const crypto = require('crypto');
const refreshTokens = [];
const session = require('express-session');
const http = require('http');
const socketIo = require('socket.io');
const server = http.createServer(app);
const cron = require("node-cron");
const io = socketIo(server, {
  cors: {
    origin: "*",
    // origin: ["http://localhost:3000", "http://192.168.2.57:8081","http://localhost:3001"], // ให้แน่ใจว่าใส่ URL ของ front-end app
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type"],
    credentials: true,
  }
});
app.use(cors());
const admin = require('firebase-admin');
// const serviceAccount = require('./sdk/homeward-422311-firebase-adminsdk-sd9ly-3a629477d2.json');
const multerr = require('multer');
const uploadimg = multerr({ storage: multerr.memoryStorage() });
admin.initializeApp({
  credential: admin.credential.cert({
    type: process.env.FIREBASE_TYPE,
    project_id: process.env.FIREBASE_PROJECT_ID,
    private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
    private_key: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    client_email: process.env.FIREBASE_CLIENT_EMAIL,
    client_id: process.env.FIREBASE_CLIENT_ID,
    auth_uri: process.env.FIREBASE_AUTH_URI,
    token_uri: process.env.FIREBASE_TOKEN_URI,
    auth_provider_x509_cert_url: process.env.FIREBASE_AUTH_PROVIDER_X509_CERT_URL,
    client_x509_cert_url: process.env.FIREBASE_CLIENT_X509_CERT_URL
  }),
  storageBucket: 'gs://homeward-422311.appspot.com'
});
const JWT_REFRESH_SECRET = 'hvdvay6ert72eerr839289()aiyg8t87qt724tyty393293883uhefiuh78ttq3ifi78272jbkj?[]]pou89ywe';

const JWT_SECRET =
  "hvdvay6ert72839289()aiyg8t87qt72393293883uhefiuh78ttq3ifi78272jbkj?[]]pou89ywe";


const mongoUrl =
  "mongodb+srv://sasithornsorn:Sasi12345678@cluster0.faewtst.mongodb.net/?retryWrites=true&w=majority";

  app.use(session({
    secret: '127iluvuhokdkiijijijiejfiejfiejfiopoq/*-/+4554#@@!&&*(((()))))))((**&^&',  // เปลี่ยนเป็นคีย์ที่ปลอดภัย
    resave: false,
    saveUninitialized: true,
  }));

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
const Chat = mongoose.model("Chat");
const Alert = mongoose.model("Alert");
const UserThreshold = mongoose.model("UserThreshold")
const ReadinessForm = mongoose.model("ReadinessForm")
const ReadinessAssessment = mongoose.model("ReadinessAssessment")
const OTPModel = mongoose.model("OTPModel")
const OTPModelUser = mongoose.model("OTPModelUser")
const Assessinhomesss = mongoose.model("Assessinhomesss")
const Agenda = mongoose.model("Agenda")
const DefaultThreshold = mongoose.model("DefaultThreshold")
const Room = mongoose.model("Room");

//ลบข้อมูล user ที่เกิน 30 วัน ทุก เที่ยงคืน
cron.schedule("0 0 * * *", async () => {
  try {
    console.log("Running cron job to delete expired users...");
    const now = new Date();
    const result = await User.deleteMany({ deleteExpiry: { $lte: now } }); // ลบข้อมูลที่หมดอายุ
    console.log(`Deleted ${result.deletedCount} expired users.`);
  } catch (error) {
    console.error("Error in cron job:", error);
  }
});

app.post("/addadmin", async (req, res) => {
  const { username, name, surname, email, password, confirmPassword } = req.body;
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
      surname,
      email,
      password: encryptedPassword,
    });
    res.send({ status: "ok" });
  } catch (error) {
    res.send({ status: "error" });
  }
});

app.post('/send-otp1', async (req, res) => {
  try {
    const { username, email } = req.body;

    // ตรวจสอบว่ามีอีเมลหรือไม่
    if (!username || !email) {
      return res.status(400).json({ error: 'กรุณากรอก username และอีเมล' });
    }

    // ตรวจสอบว่าอีเมลที่ส่งมามีการยืนยันแล้วหรือไม่
    const existingUser = await mongoose.model('Admin').findOne({ email });
    if (existingUser && existingUser.isEmailVerified) {
      return res.status(400).json({ error: 'อีเมลนี้ได้รับการยืนยันแล้ว' });
    }

    // สร้าง OTP
    const otp = crypto.randomInt(100000, 999999).toString();
    await OTPModel.updateOne({ username }, { otp }, { upsert: true });

    // ตั้งค่าการส่งอีเมล
    const transporter = nodemailer.createTransport({
      service: 'Gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Homeward: รหัส OTP สำหรับยืนยันตัวตน',
      text: `เรียนคุณ ${username} รหัส OTP ของคุณคือ ${otp}\n\nรหัสมีอายุ 5 นาที อย่าเปิดเผยรหัสนี้กับผู้อื่น`,
    };

    // ส่งอีเมล
    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.error('Error sending mail:', error);
        return res.status(500).json({ error: 'Error sending OTP' });
      }
      res.status(200).json({ success: true, message: 'OTP sent' });
    });
  } catch (error) {
    console.error('Error during OTP creation:', error);
    res.status(500).json({ error: 'Server error' });
  }
});


app.post('/verify-otp1', async (req, res) => {
  try {
    const { username, otp, newEmail } = req.body;

    const otpRecord = await OTPModel.findOne({ username }).sort({ createdAt: -1 });

    if (!otpRecord) {
      return res.status(400).json({ error: 'OTP not found' });
    }

    const isOtpValid = otpRecord.otp === otp && Date.now() - otpRecord.createdAt < 10 * 60 * 1000;

    if (!isOtpValid) {
      return res.status(400).json({ error: 'Invalid or expired OTP' });
    }

    // อัปเดตสถานะการยืนยันอีเมลและอีเมลของผู้ใช้ โดยใช้ username แทน email
    await Admins.updateOne({ username }, { $set: { isEmailVerified: true, email: newEmail } });

    // ลบ OTP หลังจากการยืนยันเสร็จสมบูรณ์
    await OTPModel.deleteMany({ username });

    res.status(200).json({ success: true, message: 'Email verified and updated successfully' });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});


// ยืนยัน/เปลี่ยนอีเมล แพทย์
app.post('/send-otp2', async (req, res) => {
  try {
    const { username, email } = req.body;

    // ตรวจสอบว่ามีอีเมลหรือไม่
    if (!username || !email) {
      return res.status(400).json({ error: 'กรุณากรอก username และอีเมล' });
    }

    // ตรวจสอบว่าอีเมลที่ส่งมามีการยืนยันแล้วหรือไม่
    const existingUser = await mongoose.model('MPersonnel').findOne({ email });
    if (existingUser && existingUser.isEmailVerified) {
      return res.status(400).json({ error: 'อีเมลนี้ได้รับการยืนยันแล้ว' });
    }

    // สร้าง OTP
    const otp = crypto.randomInt(100000, 999999).toString();
    await OTPModel.updateOne({ username }, { otp }, { upsert: true });

    // ตั้งค่าการส่งอีเมล
    const transporter = nodemailer.createTransport({
      service: 'Gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Homeward: รหัส OTP สำหรับยืนยันตัวตน',
      text: `เรียนคุณ ${username} รหัส OTP ของคุณคือ ${otp}\n\nรหัสมีอายุ 5 นาที อย่าเปิดเผยรหัสนี้กับผู้อื่น`,
    };

    // ส่งอีเมล
    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.error('Error sending mail:', error);
        return res.status(500).json({ error: 'Error sending OTP' });
      }
      res.status(200).json({ success: true, message: 'OTP sent' });
    });
  } catch (error) {
    console.error('Error during OTP creation:', error);
    res.status(500).json({ error: 'Server error' });
  }
});


app.post('/verify-otp2', async (req, res) => {
  try {
    const { username, otp, newEmail } = req.body;

    const otpRecord = await OTPModel.findOne({ username }).sort({ createdAt: -1 });

    if (!otpRecord) {
      return res.status(400).json({ error: 'OTP not found' });
    }

    const isOtpValid = otpRecord.otp === otp && Date.now() - otpRecord.createdAt < 10 * 60 * 1000;

    if (!isOtpValid) {
      return res.status(400).json({ error: 'Invalid or expired OTP' });
    }

    // อัปเดตสถานะการยืนยันอีเมลและอีเมลของผู้ใช้ โดยใช้ username แทน email
    await MPersonnel.updateOne({ username }, { $set: { isEmailVerified: true, email: newEmail } });

    // ลบ OTP หลังจากการยืนยันเสร็จสมบูรณ์
    await OTPModel.deleteMany({ username });

    res.status(200).json({ success: true, message: 'Email verified and updated successfully' });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});


// ยืนยัน/เปลี่ยนอีเมล ผู้ป่วย
app.post('/send-otp3', async (req, res) => {
  try {
    const { username, email } = req.body;

    // ตรวจสอบว่ามีอีเมลหรือไม่
    if (!username || !email) {
      return res.status(400).json({ error: 'กรุณากรอก username และอีเมล' });
    }

    // ตรวจสอบว่าอีเมลที่ส่งมามีการยืนยันแล้วหรือไม่
    const existingUser = await mongoose.model('User').findOne({ email });
    if (existingUser && existingUser.isEmailVerified) {
      return res.status(400).json({ error: 'อีเมลนี้ได้รับการยืนยันแล้ว' });
    }

    // สร้าง OTP
    const otp = crypto.randomInt(100000, 999999).toString();
    await OTPModel.updateOne({ username }, { otp }, { upsert: true });

    // ตั้งค่าการส่งอีเมล
    const transporter = nodemailer.createTransport({
      service: 'Gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Homeward: รหัส OTP สำหรับยืนยันตัวตน',
      text: `เรียนคุณ ${username} รหัส OTP ของคุณคือ ${otp}\n\nรหัสมีอายุ 5 นาที อย่าเปิดเผยรหัสนี้กับผู้อื่น`,
    };

    // ส่งอีเมล
    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.error('Error sending mail:', error);
        return res.status(500).json({ error: 'Error sending OTP' });
      }
      res.status(200).json({ success: true, message: 'OTP sent' });
    });
  } catch (error) {
    console.error('Error during OTP creation:', error);
    res.status(500).json({ error: 'Server error' });
  }
});


app.post('/verify-otp3', async (req, res) => {
  try {
    const { username, otp, newEmail } = req.body;

    const otpRecord = await OTPModel.findOne({ username }).sort({ createdAt: -1 });

    if (!otpRecord) {
      return res.status(400).json({ error: 'OTP not found' });
    }

    const isOtpValid = otpRecord.otp === otp && Date.now() - otpRecord.createdAt < 10 * 60 * 1000;

    if (!isOtpValid) {
      return res.status(400).json({ error: 'Invalid or expired OTP' });
    }

    // อัปเดตสถานะการยืนยันอีเมลและอีเมลของผู้ใช้ โดยใช้ username แทน email
    await User.updateOne({ username }, { $set: { isEmailVerified: true, email: newEmail } });

    // ลบ OTP หลังจากการยืนยันเสร็จสมบูรณ์
    await OTPModel.deleteMany({ username });

    res.status(200).json({ success: true, message: 'Email verified and updated successfully' });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal server error' });
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
      expiresIn: '7d',
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
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    var mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: "Reset your password for Homeward",
      text: `Hello,\n\nFollow this link to reset your Homeward password for your ${email} account.\n${link}\n\nIf you didn't ask to reset your password,you can ignore this email.\n\nThanks,\n\nYour Homeward team`,
    };

    transporter.sendMail(mailOptions, function (error, info) {
      if (error) {
        return res.status(500).json({ status: "Error sending email" });
      } else {
        console.log("Email sent: " + info.response);
        return res.status(200).json({ status: "check your emailbox" });

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
    req.session.successMessage = "Password successfully reset!";
    req.session.email = verify.email;
    res.redirect("/success");
    // res.redirect(`/success?email=${verify.email}&message=Password%20successfully%20reset`);
    // res.render("index", { email: verify.email, status: "verified" });
  } catch (error) {
    console.log(error);
    res.send({ status: "เกิดข้อผิดพลาดบางอย่าง" });
  }
});

app.get("/success", (req, res) => {
  if (req.session.successMessage && req.session.email) {
    const { successMessage, email } = req.session;

    // ล้างข้อมูล session หลังจากการแสดงผลหน้า success
    req.session.destroy((err) => {
      if (err) {
        console.log("Error destroying session:", err);
      }
    });

    res.render("success", { message: successMessage, email: email });
  } else {
    res.redirect("/");  // ถ้าไม่พบข้อมูลใน session ก็รีไดเร็กต์ไปหน้าอื่น
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


app.post("/logout", (req, res) => {
  const refreshToken = req.cookies.refreshToken;
  refreshTokens = refreshTokens.filter(token => token !== refreshToken);
  res.clearCookie('refreshToken');
  res.sendStatus(204);
});

//แพทย์
app.get("/check-equip-name", async (req, res) => {
  const { equipment_name } = req.query;
  try {
    const existingEquip = await Equipment.findOne({ equipment_name });
    res.json({ exists: !!existingEquip });
  } catch (error) {
    console.error("Error checking equip name:", error);
    res.status(500).json({ message: "Error checking equip name" });
  }
});
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
  const { username, email, tel, nametitle, name, surname } = req.body;

  // ใช้เบอร์โทรเป็นรหัสผ่าน
  const encryptedPassword = await bcrypt.hash(tel, 10);

  if (!username || !email || !tel || !name || !surname || !nametitle) {
    return res.json({
      error:
        "กรุณากรอกเลขใบประกอบวิชาชีพ อีเมล คำนำหน้าชื่อ เบอร์โทร และชื่อ-นามสกุล",
    });
  }

  try {
    const oldUser = await MPersonnel.findOne({ username });

    // ตรวจสอบว่าชื่อผู้ใช้นี้มีอยู่ในระบบแล้วหรือยัง
    if (oldUser) {
      return res.json({ error: "มีชื่อผู้ใช้นี้อยู่ในระบบแล้ว" });
    }

    // สร้างผู้ใช้ใหม่
    await MPersonnel.create({
      username,
      password: encryptedPassword, // ใช้เบอร์โทรเป็นรหัสผ่านที่เข้ารหัสแล้ว
      email,
      tel, // เก็บเบอร์โทรไว้ในฐานข้อมูล
      nametitle,
      name,
      surname,
    });

        // ดึงผู้ป่วยทั้งหมดจากระบบ
        const allUsers = await User.find({ deletedAt: null });
  
        for (const user of allUsers) {
          const room = await Room.findOne({ roomId: user._id });
    
          if (room) {
            room.participants.push({ id: MPersonnel._id, model: "MPersonnel" }); // เพิ่มแพทย์เข้าไปใน Room
            await room.save(); // บันทึกการเปลี่ยนแปลง Room
          }
        }
    res.send({ status: "ok" });
  } catch (error) {
    res.send({ status: "error", error: error.message });
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
    const originalName = file.originalname;
    const extension = originalName.split(".").pop();
    const thaiFileName = originalName.replace(/[^\u0E00-\u0E7Fa-zA-Z0-9]/g, "");
    const uniqueSuffix = Date.now();
    const newFileName = `${uniqueSuffix}-${thaiFileName}.${extension}`;
    cb(null, newFileName);
  },
});



const upload = multer({ storage: storage }).fields([
  { name: "image", maxCount: 1 },
  { name: "file", maxCount: 1 },
]);

app.post("/addcaremanual1", uploadimg.fields([{ name: 'image' }, { name: 'file' }]), async (req, res) => {
  const { caremanual_name, detail } = req.body;

  if (!caremanual_name) {
    return res.status(400).json({ error: "กรุณากรอกหัวข้อ" });
  }

  if (!req.files['image']) {
    return res.status(400).json({ error: "กรุณาเลือกรูปภาพ" });
  }

  try {
    const existingCareManual = await Caremanual.findOne({ caremanual_name });
    if (existingCareManual) {
      return res.status(400).json({ error: "หัวข้อนี้มีอยู่แล้ว กรุณาใช้หัวข้ออื่น" });
    }

    let imageUrl = null;
    let fileUrl = null;
    const bucket = admin.storage().bucket();
    const uploadPromises = [];

    // อัปโหลดรูปภาพ
    if (req.files['image']) {
      const imageFileName = Date.now() + '-' + req.files['image'][0].originalname;
      const imageFile = bucket.file(imageFileName);

      const imageUploadPromise = new Promise((resolve, reject) => {
        const imageFileStream = imageFile.createWriteStream({
          metadata: { contentType: req.files['image'][0].mimetype }
        });

        imageFileStream.on('error', (err) => {
          console.error('Error uploading image:', err);
          reject(err);
        });

        imageFileStream.on('finish', () => {
          imageUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(imageFileName)}?alt=media`;
          resolve();
        });

        imageFileStream.end(req.files['image'][0].buffer);
      });

      uploadPromises.push(imageUploadPromise);
    }

    // อัปโหลดไฟล์ (ถ้ามี)
    if (req.files['file']) {
      const fileFileName = Date.now() + '-' + req.files['file'][0].originalname;
      const fileFile = bucket.file(fileFileName);

      const fileUploadPromise = new Promise((resolve, reject) => {
        const fileFileStream = fileFile.createWriteStream({
          metadata: { contentType: req.files['file'][0].mimetype }
        });

        fileFileStream.on('error', (err) => {
          console.error('Error uploading file:', err);
          reject(err);
        });

        fileFileStream.on('finish', () => {
          fileUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(fileFileName)}?alt=media`;
          resolve();
        });

        fileFileStream.end(req.files['file'][0].buffer);
      });

      uploadPromises.push(fileUploadPromise);
    }

    // รอให้การอัปโหลดทั้งภาพและไฟล์เสร็จสิ้นก่อนบันทึกข้อมูลและส่ง response
    await Promise.all(uploadPromises);

    const newCare = new Caremanual({
      caremanual_name,
      image: imageUrl,
      file: fileUrl,
      detail,
    });

    await newCare.save();
    return res.json({ status: "ok", success: true, message: 'Care manual saved' });

  } catch (error) {
    console.error('Error processing request:', error);
    return res.status(500).json({ success: false, message: 'Error processing request' });
  }
});
app.delete("/remove-image/:id", async (req, res) => {
  try {
    const { id } = req.params;

    // ค้นหาข้อมูลของคู่มือที่ต้องการลบรูปภาพ
    const caremanual = await Caremanual.findById(id);
    if (!caremanual) {
      return res.status(404).json({ message: "ไม่พบข้อมูลคู่มือ" });
    }

    // ลบไฟล์รูปภาพจาก Cloud Storage หรือที่เก็บรูปภาพของคุณ
    // ตัวอย่างเช่น ถ้าใช้ Firebase หรือ S3 ของ AWS ต้องเรียกฟังก์ชันเพื่อลบที่นี่
    // await deleteImageFromCloud(caremanual.image); // สมมติว่ามีฟังก์ชันนี้

    // ลบข้อมูลรูปภาพจากฐานข้อมูล
    caremanual.image = null;
    await caremanual.save();

    res.status(200).json({ message: "ลบรูปภาพสำเร็จ" });
  } catch (error) {
    console.error("เกิดข้อผิดพลาดในการลบรูปภาพ:", error);
    res.status(500).json({ message: "เกิดข้อผิดพลาดในการลบรูปภาพ" });
  }
});

// ลบไฟล์
app.delete("/remove-file/:id", async (req, res) => {
  try {
    const { id } = req.params;

    // ค้นหาข้อมูลของคู่มือที่ต้องการลบไฟล์
    const caremanual = await Caremanual.findById(id);
    if (!caremanual) {
      return res.status(404).json({ message: "ไม่พบข้อมูลคู่มือ" });
    }

    // ลบไฟล์จาก Cloud Storage หรือที่เก็บไฟล์ของคุณ
    // ตัวอย่างเช่น ถ้าใช้ Firebase หรือ S3 ของ AWS ต้องเรียกฟังก์ชันเพื่อลบที่นี่
    // await deleteFileFromCloud(caremanual.file); // สมมติว่ามีฟังก์ชันนี้

    // ลบข้อมูลไฟล์จากฐานข้อมูล
    caremanual.file = null;
    await caremanual.save();

    res.status(200).json({ message: "ลบไฟล์สำเร็จ" });
  } catch (error) {
    console.error("เกิดข้อผิดพลาดในการลบไฟล์:", error);
    res.status(500).json({ message: "เกิดข้อผิดพลาดในการลบไฟล์" });
  }
});

const bucket = admin.storage().bucket();

// Define multer storage configuration for handling file uploads
const upload1 = multer({ storage: multer.memoryStorage() }).fields([
  { name: "fileP", maxCount: 1 },
  { name: "fileM", maxCount: 1 },
  { name: "filePhy", maxCount: 1 },
]);

// Add medical information with file upload to Firebase
// app.post("/addmedicalinformation", upload1, async (req, res) => {
//   try {
//     const {
//       HN,
//       AN,
//       Date_Admit,
//       Date_DC,
//       Diagnosis,
//       Chief_complaint,
//       selectedPersonnel,
//       Present_illness,
//       Phychosocial_assessment,
//       Management_plan,
//       userId
//     } = req.body;

//     // Initializing file variables
//     let filePresent = "";
//     let fileManage = "";
//     let filePhychosocial = "";

//     // Upload fileP to Firebase Storage
//     if (req.files["fileP"] && req.files["fileP"][0]) {
//       const file = req.files["fileP"][0];
//       const fileName = Date.now() + '-' + file.originalname;
//       const fileRef = bucket.file(fileName);
//       const fileStream = fileRef.createWriteStream({
//         metadata: { contentType: file.mimetype },
//       });

//       fileStream.end(file.buffer);
//       await new Promise((resolve, reject) => {
//         fileStream.on('finish', () => {
//           filePresent = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(fileName)}?alt=media`;
//           resolve();
//         });
//         fileStream.on('error', reject);
//       });
//     }

//     // Upload fileM to Firebase Storage
//     if (req.files["fileM"] && req.files["fileM"][0]) {
//       const file = req.files["fileM"][0];
//       const fileName = Date.now() + '-' + file.originalname;
//       const fileRef = bucket.file(fileName);
//       const fileStream = fileRef.createWriteStream({
//         metadata: { contentType: file.mimetype },
//       });

//       fileStream.end(file.buffer);
//       await new Promise((resolve, reject) => {
//         fileStream.on('finish', () => {
//           fileManage = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(fileName)}?alt=media`;
//           resolve();
//         });
//         fileStream.on('error', reject);
//       });
//     }

//     // Upload filePhy to Firebase Storage
//     if (req.files["filePhy"] && req.files["filePhy"][0]) {
//       const file = req.files["filePhy"][0];
//       const fileName = Date.now() + '-' + file.originalname;
//       const fileRef = bucket.file(fileName);
//       const fileStream = fileRef.createWriteStream({
//         metadata: { contentType: file.mimetype },
//       });

//       fileStream.end(file.buffer);
//       await new Promise((resolve, reject) => {
//         fileStream.on('finish', () => {
//           filePhychosocial = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(fileName)}?alt=media`;
//           resolve();
//         });
//         fileStream.on('error', reject);
//       });
//     }

//     // Check if userId is present
//     if (!userId) {
//       return res.json({ status: "error", message: "ไม่พบข้อมูลผู้ใช้" });
//     }

//     // Create new medical information record
//     const medicalInformation = await MedicalInformation.create({
//       HN,
//       AN,
//       Date_Admit,
//       Date_DC,
//       Diagnosis,
//       Chief_complaint,
//       Present_illness,
//       selectedPersonnel,
//       Phychosocial_assessment,
//       Management_plan,
//       fileM: fileManage,
//       fileP: filePresent,
//       filePhy: filePhychosocial,
//       user: userId,
//     });

//     res.json({ status: "ok", data: medicalInformation });
//   } catch (error) {
//     console.error("Error adding medical information:", error);
//     res.json({ status: "error", message: "เกิดข้อผิดพลาดขณะเพิ่มข้อมูล" });
//   }
// });
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
      userId
    } = req.body;

    let filePresent = "";
    let fileManage = "";
    let filePhychosocial = "";
    let filePresentName = "";
    let fileManageName = "";
    let filePhychosocialName = "";
    
    // Upload fileP to Firebase Storage
    if (req.files["fileP"] && req.files["fileP"][0]) {
      const file = req.files["fileP"][0];
      const originalName = file.originalname; // เก็บชื่อไฟล์ดั้งเดิม
      const fileName = Date.now() + '-' + originalName;
      const fileRef = bucket.file(fileName);
      const fileStream = fileRef.createWriteStream({
        metadata: { contentType: file.mimetype },
      });
    
      fileStream.end(file.buffer);
      await new Promise((resolve, reject) => {
        fileStream.on('finish', () => {
          filePresent = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(fileName)}?alt=media`;
          filePresentName = originalName; // เก็บชื่อไฟล์ดั้งเดิม
          resolve();
        });
        fileStream.on('error', reject);
      });
    }
    
    // Upload fileM to Firebase Storage
    if (req.files["fileM"] && req.files["fileM"][0]) {
      const file = req.files["fileM"][0];
      const originalName = file.originalname;
      const fileName = Date.now() + '-' + originalName;
      const fileRef = bucket.file(fileName);
      const fileStream = fileRef.createWriteStream({
        metadata: { contentType: file.mimetype },
      });
    
      fileStream.end(file.buffer);
      await new Promise((resolve, reject) => {
        fileStream.on('finish', () => {
          fileManage = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(fileName)}?alt=media`;
          fileManageName = originalName;
          resolve();
        });
        fileStream.on('error', reject);
      });
    }
    
    // Upload filePhy to Firebase Storage
    if (req.files["filePhy"] && req.files["filePhy"][0]) {
      const file = req.files["filePhy"][0];
      const originalName = file.originalname;
      const fileName = Date.now() + '-' + originalName;
      const fileRef = bucket.file(fileName);
      const fileStream = fileRef.createWriteStream({
        metadata: { contentType: file.mimetype },
      });
    
      fileStream.end(file.buffer);
      await new Promise((resolve, reject) => {
        fileStream.on('finish', () => {
          filePhychosocial = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(fileName)}?alt=media`;
          filePhychosocialName = originalName;
          resolve();
        });
        fileStream.on('error', reject);
      });
    }
    
    // Save medical information with original file names
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
      fileMName: fileManageName, // เก็บชื่อไฟล์ดั้งเดิม
      filePName: filePresentName,
      filePhyName: filePhychosocialName,
      user: userId,
    });
    
    res.json({ status: "ok", data: medicalInformation });
  } catch (error) {
    console.error("Error adding medical information:", error);
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

const uploadFiles = (files) => {
  return new Promise((resolve, reject) => {
    let imageUrl = "";
    let fileUrl = "";

    const uploadImage = files["image"] && files["image"][0] ? uploadFileToBucket(files["image"][0]) : Promise.resolve("");
    const uploadFile = files["file"] && files["file"][0] ? uploadFileToBucket(files["file"][0]) : Promise.resolve("");

    Promise.all([uploadImage, uploadFile])
      .then((urls) => {
        imageUrl = urls[0];
        fileUrl = urls[1];
        resolve({ imageUrl, fileUrl });
      })
      .catch((err) => {
        reject(err);
      });
  });
};

const uploadFileToBucket = (file) => {
  return new Promise((resolve, reject) => {
    const bucket = admin.storage().bucket();
    const fileName = Date.now() + '-' + file.originalname;
    const storageFile = bucket.file(fileName);

    const fileStream = storageFile.createWriteStream({
      metadata: {
        contentType: file.mimetype
      }
    });

    fileStream.on('error', (err) => {
      reject(err);
    });

    fileStream.on('finish', () => {
      const fileUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(fileName)}?alt=media`;
      resolve(fileUrl);
    });

    fileStream.end(file.buffer);
  });
};

app.get("/check-caremanual-name", async (req, res) => {
  const { caremanual_name } = req.query;
  try {
    const existingCaremanual = await Caremanual.findOne({ caremanual_name });
    res.json({ exists: !!existingCaremanual }); // true ถ้าซ้ำ, false ถ้าไม่ซ้ำ
  } catch (error) {
    console.error("Error checking caremanual name:", error);
    res.status(500).json({ message: "Error checking caremanual name" });
  }
});

app.post("/updatecaremanual/:id", uploadimg.fields([{ name: 'image' }, { name: 'file' }]), async (req, res) => {
  const { caremanual_name, detail } = req.body;
  const { id } = req.params;

  try {
    
    const files = req.files;

    const { imageUrl, fileUrl } = await uploadFiles(files);

    const updatedData = {
      caremanual_name,
      image: imageUrl || undefined,
      file: fileUrl || undefined,
      detail
    };

    Object.keys(updatedData).forEach(key => updatedData[key] === undefined && delete updatedData[key]);

    const updatedCaremanual = await Caremanual.findByIdAndUpdate(id, updatedData, { new: true });

    if (!updatedCaremanual) {
      return res.status(404).json({ status: "Caremanual not found" });
    }

    res.json({ status: "ok", updatedCaremanual });

  } catch (error) {
    console.error('Error processing request:', error);
    res.status(500).json({ success: false, message: 'Error processing request' });
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
    if (caremanual) {
      // เพิ่มจำนวนการเข้าชม
      caremanual.views += 1;
      await caremanual.save(); // บันทึกจำนวนการเข้าชมที่อัปเดตแล้ว
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
      expiresIn: "7d",
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
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    var mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: "Reset your password for Homeward",
      text: `Hello,\n\nFollow this link to reset your Homeward password for your ${email} account.\n${link}\n\nIf you didn't ask to reset your password,you can ignore this email.\n\nThanks,\n\nYour Homeward team`,
    };

    transporter.sendMail(mailOptions, function (error, info) {
      if (error) {
        return res.status(500).json({ status: "Error sending email" });
      } else {
        console.log("Email sent: " + info.response);
        return res.status(200).json({ status: "check your emailbox" });

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
    req.session.successMessage = "Password successfully reset!";
    req.session.email = verify.email;
    res.redirect("/success");

    // res.render("indexdt", { email: verify.email, status: "verified" });
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

    // รวมชื่อและนามสกุลเป็นฟิลด์เดียวชั่วคราวสำหรับการค้นหา
    const result = await MPersonnel.aggregate([
      {
        $addFields: {
          fullname: { $concat: ["$nametitle", "$name", " ", "$surname"] }
        }
      },
      {
        $match: {
          $or: [
            { nametitle: { $regex: regex } },
            { name: { $regex: regex } },
            { surname: { $regex: regex } },
            { fullname: { $regex: regex } }
          ]
        }
      }
    ]);
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

async function initializeDefaultThreshold() {
  try {
    // ตรวจสอบว่ามี DefaultThreshold ในฐานข้อมูลหรือยัง
    const existingThreshold = await DefaultThreshold.findOne();
    if (!existingThreshold) {
      // หากไม่มี ให้สร้างค่าเริ่มต้น
      const defaultThreshold = new DefaultThreshold({
        SBP: { min: 90, max: 140 },
        DBP: { min: 60, max: 90 },
        PulseRate: { min: 60, max: 100 },
        Temperature: { min: 36.5, max: 37.5 },
        DTX: { min: 80, max: 180 },
        Respiration: { min: 16, max: 20 },
        Painscore: 5,
      });
      await defaultThreshold.save();
      console.log('Default threshold initialized successfully');
    } else {
      console.log('Default threshold already exists');
    }
  } catch (error) {
    console.error('Error initializing default threshold:', error);
  }
}

// เรียกฟังก์ชันตอนเซิร์ฟเวอร์เริ่มทำงาน
initializeDefaultThreshold();

const initializeRooms = async () => {
  try {
    // ดึงรายชื่อแพทย์ทั้งหมด
    const allPersonnel = await MPersonnel.find({ deletedAt: null });

    if (!allPersonnel.length) {
      console.log("No personnel found. Skipping room creation.");
      return;
    }

    // ค้นหา User ที่ยังไม่มี Room
    const usersWithoutRoom = await User.find({
      deletedAt: null,
      _id: { $nin: (await Room.find({}).distinct("roomId")) },
    });

    if (!usersWithoutRoom.length) {
      console.log("All users already have rooms.");
      return;
    }



    // สร้าง Room สำหรับผู้ใช้เหล่านั้น
    const roomsToCreate = usersWithoutRoom.map((user) => ({
      roomId: user._id,
      participants: [
        { id: user._id, model: "User" }, // เพิ่มผู้ใช้
        ...allPersonnel.map((personnel) => ({
          id: personnel._id,
          model: "MPersonnel",
        })), // เพิ่มแพทย์ทุกคน
      ],
    }));

    // บันทึก Room ทั้งหมด
    await Room.insertMany(roomsToCreate);
    console.log(`Created ${roomsToCreate.length} rooms for users.`);
  } catch (error) {
    console.error("Error initializing rooms:", error);
  }
};

initializeRooms();
//ไปอัปเดตอันที่เคยลบไป
app.post("/adduser", async (req, res) => {
  const { username, name, surname, tel, email, physicalTherapy } = req.body;

  if (!username || !tel || !name || !surname) {
    return res.json({
      error: "กรุณากรอกเลขประจำตัวประชาชน เบอร์โทรศัพท์ ชื่อและนามสกุล",
    });
  }

  if (username.length !== 13) {
    return res.json({
      error: "ชื่อผู้ใช้ต้องมีความยาว 13 ตัวอักษร",
    });
  }

  const encryptedPassword = await bcrypt.hash(tel, 10);

  try {
    let user;
    const oldUser = await User.findOne({ username });

    if (oldUser && !oldUser.deletedAt) {
      return res.json({ error: "มีชื่อผู้ใช้นี้อยู่ในระบบแล้ว" });
    }

    if (oldUser && oldUser.deletedAt) {
      oldUser.name = name;
      oldUser.surname = surname;
      oldUser.password = encryptedPassword;
      oldUser.tel = tel;
      oldUser.deletedAt = null;
      oldUser.email = email || null;
      oldUser.physicalTherapy = physicalTherapy || false;
      user = await oldUser.save();
    } else {
      user = await User.create({
        username,
        name,
        surname,
        password: encryptedPassword,
        tel,
        ID_card_number: username,
        email: email || null,
        physicalTherapy: physicalTherapy || false,
      });
    }
   // ดึงค่า DefaultThreshold จากฐานข้อมูล
   const defaultThreshold = await DefaultThreshold.findOne();

   if (!defaultThreshold) {
     return res.status(500).json({
       status: "error",
       message: "Default threshold not set. Please configure it first.",
     });
   }

   // สร้าง threshold ค่าเริ่มต้นสำหรับผู้ใช้ใหม่
   const userThreshold = {
     user: user._id,
     SBP: defaultThreshold.SBP,
     DBP: defaultThreshold.DBP,
     PulseRate: defaultThreshold.PulseRate,
     Temperature: defaultThreshold.Temperature,
     DTX: defaultThreshold.DTX,
     Respiration: defaultThreshold.Respiration,
     Painscore: defaultThreshold.Painscore,
   };
   await UserThreshold.create(userThreshold);
   
      // ดึงรายชื่อแพทย์ทั้งหมด
      const allPersonnel = await MPersonnel.find({ deletedAt: null });

      // สร้าง Room ใหม่
      const room = {
        roomId: user._id, // ใช้ _id ของผู้ป่วยเป็น Room ID
        participants: [
          { id: user._id, model: "User" }, // เพิ่มผู้ป่วยเข้า Room
          ...allPersonnel.map((personnel) => ({ id: personnel._id, model: "MPersonnel" })), // เพิ่มแพทย์ทุกคนเข้า Room
        ],

      };
  
      await Room.create(room); // บันทึก Room ลงฐานข้อมูล
    res.send({ status: "ok", user }); // ส่งข้อมูลผู้ใช้กลับไปด้วย
  } catch (error) {
    console.error("Error creating user:", error);
    res.send({ status: "error", error: error.message });
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
    spreadsheetId: "1scjY-w7mdPUJglcFem97S4wXrKpOoYwaH4BdAAlHkGE",
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

app.post("/loginuser", async (req, res) => {
  const { username, password } = req.body;

  try {
    const user = await User.findOne({ username: username });

    if (!user) {
      return res.status(404).json({ error: "ยังไม่มีบัญชีผู้ใช้นี้" });
    }

    if (user.deletedAt) {
      return res.status(410).json({ error: "ยังไม่มีบัญชีผู้ใช้นี้" });
    }

    if (await bcrypt.compare(password, user.password)) {
      const token = jwt.sign({ username: user.username }, JWT_SECRET, { expiresIn: "30d" });
      return res.status(201).send({
        status: "ok",
        data: token,
        addDataFirst: user.AdddataFirst,
      });
    } else {
      return res.status(401).json({ error: "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง" });
    }
  } catch (error) {
    return res.status(500).json({ error: "เกิดข้อผิดพลาดในการเข้าสู่ระบบ" });
  }
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

//เพิ่มข้อมูลครั้งแรก

// app.post('/updateuserinfo', async (req, res) => {
//   const {
//     username,
//     name,
//     surname,
//     tel,
//     email,
//     gender,
//     birthday,
//     ID_card_number,
//     nationality,
//     Address,
//     user, // id ของ user
//     caregivers, // array ของข้อมูลผู้ดูแล
//   } = req.body;

//   try {
//     if (username) {
//       // แก้ไขข้อมูลของ User
//       await User.updateOne(
//         { username },
//         {
//           $set: {
//             name,
//             surname,
//             tel,
//             email,
//             gender,
//             birthday,
//             ID_card_number,
//             nationality,
//             Address,
//             AdddataFirst: true,
//           },
//         }
//       );

//       for (const caregiver of caregivers) {
//         const existingCaregiver = await Caregiver.findOne({
//           user,
//           name: caregiver.caregivername,
//         });

//         if (existingCaregiver) {
//           // อัปเดตข้อมูลผู้ดูแลที่มีอยู่
//           await Caregiver.updateOne(
//             { user, name: caregiver.caregivername },
//             {
//               $set: {
//                 surname: caregiver.caregiversurname,
//                 tel: caregiver.caregivertel,
//                 Relationship: caregiver.Relationship,
//               },
//             }
//           );
//         } else {
//           // เพิ่มผู้ดูแลใหม่
//           await Caregiver.create({
//             user,
//             name: caregiver.caregivername,
//             surname: caregiver.caregiversurname,
//             tel: caregiver.caregivertel,
//             Relationship: caregiver.Relationship,
//           });
//         }
//       }

//       res.send({ status: 'Ok', data: 'User and Caregivers Updated' });
//     } else {
//       res.status(400).send({ error: 'Invalid request data' });
//     }
//   } catch (error) {
//     console.error('Error updating user or caregivers:', error);
//     return res.status(500).send({ error: 'Error updating user or caregivers' });
//   }
// });

// app.post('/updateuserinfo', async (req, res) => {
//   const {
//     username,
//     name,
//     surname,
//     tel,
//     email,
//     gender,
//     birthday,
//     ID_card_number,
//     nationality,
//     Address,
//     user, // id ของ user
//     caregivers, // array ของข้อมูลผู้ดูแล
//   } = req.body;

//   try {
//     if (username) {
//       // แก้ไขข้อมูลของ User
//       await User.updateOne(
//         { username },
//         {
//           $set: {
//             name,
//             surname,
//             tel,
//             email,
//             gender,
//             birthday,
//             ID_card_number,
//             nationality,
//             Address,
//             // AdddataFirst: true,
//           },
//         }
//       );

//       // จัดการข้อมูล caregivers
//       for (const caregiver of caregivers) {
//         if (caregiver._id) {
//           // หากมี _id ให้แก้ไขข้อมูลผู้ดูแลที่มีอยู่
//           await Caregiver.updateOne(
//             { _id: caregiver._id },
//             {
//               $set: {
//                 name: caregiver.caregivername,
//                 surname: caregiver.caregiversurname,
//                 tel: caregiver.caregivertel,
//                 Relationship: caregiver.Relationship,
//               },
//             }
//           );
//         } else {
//           // หากไม่มี _id ให้เพิ่มข้อมูลผู้ดูแลใหม่
//           await Caregiver.create({
//             user,
//             name: caregiver.caregivername,
//             surname: caregiver.caregiversurname,
//             tel: caregiver.caregivertel,
//             Relationship: caregiver.Relationship,
//           });
//         }
//       }

//       res.send({ status: 'Ok', data: 'User and Caregivers Updated' });
//     } else {
//       res.status(400).send({ error: 'Invalid request data' });
//     }
//   } catch (error) {
//     console.error('Error updating user or caregivers:', error);
//     return res.status(500).send({ error: 'Error updating user or caregivers' });
//   }
// });
app.post('/updateuserinfo', async (req, res) => {
  const {
    username,
    name,
    surname,
    tel,
    email,
    gender,
    birthday,
    ID_card_number,
    nationality,
    Address,
    user, // id ของ user
    caregivers, // array ของข้อมูลผู้ดูแล
  } = req.body;

  try {
    if (username) {
      // อัปเดตข้อมูล User
      await User.updateOne(
        { username },
        {
          $set: {
            name,
            surname,
            tel,
            email,
            gender,
            birthday,
            ID_card_number,
            nationality,
            Address,
          },
        }
      );

      // จัดการข้อมูล caregivers
      for (const caregiver of caregivers) {
        if (caregiver._id) {
          // หากมี _id ให้ตรวจสอบและอัปเดตข้อมูลผู้ดูแลที่มีอยู่
          const existingCaregiver = await Caregiver.findOne({ _id: caregiver._id });
          if (existingCaregiver) {
            await Caregiver.updateOne(
              { _id: caregiver._id },
              {
                $set: {
                  name: caregiver.caregivername,
                  surname: caregiver.caregiversurname,
                  tel: caregiver.caregivertel,
                  Relationship: caregiver.Relationship,
                },
              }
            );
          } else {
            // หาก _id ไม่ตรงกับข้อมูลใดๆ ในฐานข้อมูล ให้สร้างใหม่
            await Caregiver.create({
              user,
              name: caregiver.caregivername,
              surname: caregiver.caregiversurname,
              tel: caregiver.caregivertel,
              Relationship: caregiver.Relationship,
            });
          }
        } else {
          // หากไม่มี _id ให้สร้างข้อมูลผู้ดูแลใหม่
          await Caregiver.create({
            user,
            name: caregiver.caregivername,
            surname: caregiver.caregiversurname,
            tel: caregiver.caregivertel,
            Relationship: caregiver.Relationship,
          });
        }
      }

      res.send({ status: 'Ok', data: 'User and Caregivers Updated' });
    } else {
      res.status(400).send({ error: 'Invalid request data' });
    }
  } catch (error) {
    console.error('Error updating user or caregivers:', error);
    res.status(500).send({ error: 'Error updating user or caregivers' });
  }
});


//ลืมรหัสผ่าน
app.post('/forgot-passworduser', async (req, res) => {
  const { email } = req.body;

  const user = await User.findOne({ email });
  if (!user) {
    return res.status(400).send('User not found');
  }

  const otp = crypto.randomInt(100000, 999999).toString();
  const otpExpiration = Date.now() + 300000;


  await OTPModelUser.updateOne({ email }, { otp, otpExpiration }, { upsert: true });


  const transporter = nodemailer.createTransport({
    service: 'Gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: user.email,
    subject: 'Homeward: รหัส OTP สำหรับเปลี่ยนรหัสผ่าน',
    text: `รหัส OTP ของคุณคือ ${otp}\nรหัสมีอายุ 5 นาที อย่าเปิดเผยรหัสนี้กับผู้อื่น`,
  };

  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      return res.status(500).send('ไม่สามารถส่งรหัส OTP ได้');
    }
    res.send('OTP sent');
  });
});

app.post('/verify-otp', async (req, res) => {
  const { email, otp } = req.body;

  const otpRecord = await OTPModelUser.findOne({ email }).sort({ createdAt: -1 });
  if (!otpRecord) {
    return res.status(400).send('รหัส OTP หมดอายุหรือไม่ถูกต้อง');
  }
  const isOtpValid = otpRecord.otp === otp && Date.now() - otpRecord.createdAt < 10 * 60 * 1000;

  if (!isOtpValid) {
    return res.status(400).json({ error: 'Invalid or expired OTP' });
  }

  await OTPModelUser.deleteMany({ email });
  res.send('ส่งรหัส OTP แล้ว');
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
    user,
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
// app.get("/getcaregiver/:id", async (req, res) => {
//   const { id } = req.params;
//   try {
//     if (!id) {
//       return res.status(400).send({
//         status: "error",
//         message: "id is required",
//       });
//     }
//     const Caregiverinfo = await Caregiver.findOne({ user: id });
//     if (!Caregiverinfo) {
//       return res
//         .status(404)
//         .send({
//           status: "error",
//           message: "not found for this user",
//         });
//     }
//     res.send({ status: "ok", data: Caregiverinfo });
//   } catch (error) {
//     console.log(error);
//     res.status(500).send({ status: "error", message: "Internal Server Error" });
//   }
// });
app.get("/getcaregiver/:id", async (req, res) => {
  const { id } = req.params;
  try {
    if (!id) {
      return res.status(400).send({
        status: "error",
        message: "id is required",
      });
    }
    // ค้นหาผู้ดูแลทั้งหมดที่เกี่ยวข้องกับ user
    const caregivers = await Caregiver.find({ user: id });
    if (!caregivers || caregivers.length === 0) {
      return res.status(404).send({
        status: "error",
        message: "No caregivers found for this user",
      });
    }
    res.send({ status: "ok", data: caregivers });
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
    email,
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
          email,
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
// app.post("/updatecaregiver", async (req, res) => {
//   const {
//     user,
//     name,
//     surname,
//     tel,
//     Relationship,
//   } = req.body;

//   try {
//     if (!user) {
//       return res.status(400).send({ error: "User is required" });
//     }
//     await Caregiver.updateOne(
//       { user: user },
//       {
//         $set: {
//           name,
//           surname,
//           tel,
//           Relationship,
//         },
//       },
//     );
//     res.send({ status: "Ok", data: "Updated" });
//   } catch (error) {
//     console.error("Error updating user:", error);
//     return res.status(500).send({ error: "Error updating user" });
//   }
// });
app.post("/addcaregiver", async (req, res) => {
  const { user, name, surname, tel, Relationship } = req.body;

  if (!user || !name || !surname) {
    return res.status(400).send({ error: "ชื่อ และนามสกุล ไม่ควรเป็นค่าว่าง" });
  }

  try {
    const newCaregiver = await Caregiver.create({
      user,
      name,
      surname,
      tel,
      Relationship,
    });

    res.send({ status: "Ok", message: "Caregiver added successfully", newCaregiver });
  } catch (error) {
    console.error("Error adding caregiver:", error);
    res.status(500).send({ error: "Error adding caregiver" });
  }
});

app.post("/deletecaregiver", async (req, res) => {
  const { _id } = req.body;

  if (!_id) {
    return res.status(400).send({ error: "Caregiver ID is required" });
  }

  try {
    const deletedCaregiver = await Caregiver.findByIdAndDelete(_id);
    if (!deletedCaregiver) {
      return res.status(404).send({ error: "Caregiver not found" });
    }

    res.send({ status: "Ok", message: "Caregiver deleted successfully" });
  } catch (error) {
    console.error("Error deleting caregiver:", error);
    res.status(500).send({ error: "Error deleting caregiver" });
  }
});

app.post("/updatecaregiver", async (req, res) => {
  const {
    _id,
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
      { _id: _id }, 
      {
        $set: {
          name,
          surname,
          tel,
          Relationship,
          user
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
      return res.status(400).send({ error: "กรุณากรอกรหัส" });
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
app.get('/get-default-threshold', async (req, res) => {
  try {
    // ดึงข้อมูล DefaultThreshold จากฐานข้อมูล
    const defaultThreshold = await DefaultThreshold.findOne();  // หาค่าที่บันทึกไว้ใน collection
    if (!defaultThreshold) {
      return res.status(404).json({ status: 'error', message: 'Default threshold not found' });
    }
    res.json({ status: 'success', data: defaultThreshold });
  } catch (error) {
    console.error('Error fetching default threshold:', error);
    res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
});

//อันแก้แค่ค่าเริ่มต้นเพื่อนำไปใช้ผู้ใช้ใหม่
// app.post('/update-default-threshold', async (req, res) => {
//   const { min, max, painscore } = req.body; 
//   try {
//     // ตรวจสอบว่า DefaultThreshold มีอยู่หรือไม่
//     let defaultThreshold = await DefaultThreshold.findOne();
//     if (!defaultThreshold) {
//       defaultThreshold = new DefaultThreshold();
//     }

//     // อัปเดตค่า Threshold
//     defaultThreshold.SBP = { min: parseFloat(min.SBP), max: parseFloat(max.SBP) };
//     defaultThreshold.DBP = { min: parseFloat(min.DBP), max: parseFloat(max.DBP) };
//     defaultThreshold.PulseRate = { min: parseFloat(min.PulseRate), max: parseFloat(max.PulseRate) };
//     defaultThreshold.Temperature = { min: parseFloat(min.Temperature), max: parseFloat(max.Temperature) };
//     defaultThreshold.DTX = { min: parseFloat(min.DTX), max: parseFloat(max.DTX) };
//     defaultThreshold.Respiration = { min: parseFloat(min.Respiration), max: parseFloat(max.Respiration) };
//     defaultThreshold.Painscore = painscore || 5; 
//     await defaultThreshold.save();
//     res.json({ status: 'success', message: 'Default threshold updated successfully' });
//   } catch (error) {
//     console.error('Error updating default threshold:', error);
//     res.status(500).json({ status: 'error', message: 'Internal server error' });
//   }
// });

const threshold = {
  SBP: { min: 90, max: 140 },
  DBP: { min: 60, max: 90 },
  PulseRate: { min: 60, max: 100 },
  Temperature: { min: 36.5, max: 37.5 },
  DTX: { min: 80, max: 180 },
  Respiration: { min: 16, max: 20 },
  Painscore:5,
};

//แบบแก้ค่าเริ่มต้นที่ยังไม่ได้แก้ไขรายบุคคลทั้งระบบ ตรงตรงทุกอันถึงจะเปลี่ยน
app.post('/update-default-threshold', async (req, res) => {
  const { min, max, painscore } = req.body;

  try {
    // ตรวจสอบว่า DefaultThreshold มีอยู่หรือไม่
    let defaultThreshold = await DefaultThreshold.findOne();
    if (!defaultThreshold) {
      defaultThreshold = new DefaultThreshold();
    }

    // เก็บค่าของ DefaultThreshold เก่าไว้เพื่อใช้เปรียบเทียบ
    const previousDefaultThreshold = { ...defaultThreshold.toObject() };

    // อัปเดตค่า Threshold ใหม่
    defaultThreshold.SBP = { min: parseFloat(min.SBP), max: parseFloat(max.SBP) };
    defaultThreshold.DBP = { min: parseFloat(min.DBP), max: parseFloat(max.DBP) };
    defaultThreshold.PulseRate = { min: parseFloat(min.PulseRate), max: parseFloat(max.PulseRate) };
    defaultThreshold.Temperature = { min: parseFloat(min.Temperature), max: parseFloat(max.Temperature) };
    defaultThreshold.DTX = { min: parseFloat(min.DTX), max: parseFloat(max.DTX) };
    defaultThreshold.Respiration = { min: parseFloat(min.Respiration), max: parseFloat(max.Respiration) };
    defaultThreshold.Painscore = painscore || 5;

    // บันทึก DefaultThreshold ใหม่
    await defaultThreshold.save();

    // อัปเดต UserThresholds ถ้าค่าปัจจุบันตรงกับ DefaultThreshold เก่า
    const updatedFields = ['SBP', 'DBP', 'PulseRate', 'Temperature', 'DTX', 'Respiration', 'Painscore'];
    const matchConditions = updatedFields.reduce((acc, field) => {
      if (typeof previousDefaultThreshold[field] === 'object') {
        acc[`${field}.min`] = previousDefaultThreshold[field].min;
        acc[`${field}.max`] = previousDefaultThreshold[field].max;
      } else {
        acc[field] = previousDefaultThreshold[field];
      }
      return acc;
    }, {});

    await UserThreshold.updateMany(
      matchConditions,
      {
        $set: {
          SBP: { min: parseFloat(min.SBP), max: parseFloat(max.SBP) },
          DBP: { min: parseFloat(min.DBP), max: parseFloat(max.DBP) },
          PulseRate: { min: parseFloat(min.PulseRate), max: parseFloat(max.PulseRate) },
          Temperature: { min: parseFloat(min.Temperature), max: parseFloat(max.Temperature) },
          DTX: { min: parseFloat(min.DTX), max: parseFloat(max.DTX) },
          Respiration: { min: parseFloat(min.Respiration), max: parseFloat(max.Respiration) },
          Painscore: painscore || 5,
        },
      }
    );

    res.json({
      status: 'success',
      message: 'Default threshold and matching user thresholds updated successfully',
    });
  } catch (error) {
    console.error('Error updating default threshold:', error);
    res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
});


app.post("/update-threshold", async (req, res) => {
  const { userId, min, max,painscore } = req.body;
  try {
    let userThreshold = await UserThreshold.findOne({ user: userId });
    if (!userThreshold) {
      userThreshold = new UserThreshold({ user: userId });
    }
    userThreshold.SBP = { min: parseFloat(min.SBP), max: parseFloat(max.SBP) };
    userThreshold.DBP = { min: parseFloat(min.DBP), max: parseFloat(max.DBP) };
    userThreshold.PulseRate = { min: parseFloat(min.PulseRate), max: parseFloat(max.PulseRate) };
    userThreshold.Temperature = { min: parseFloat(min.Temperature), max: parseFloat(max.Temperature) };
    userThreshold.DTX = { min: parseFloat(min.DTX), max: parseFloat(max.DTX) };
    userThreshold.Respiration = { min: parseFloat(min.Respiration), max: parseFloat(max.Respiration) };
    userThreshold.Painscore = parseFloat(painscore);
    await userThreshold.save();
    res.json({ status: "success" });
  } catch (error) {
    console.error("Error updating threshold:", error);
    res.status(500).json({ status: "error" });
  }
});



app.post('/get-threshold', async (req, res) => {
  const { userId } = req.body;
  try {
    const userThreshold = await UserThreshold.findOne({ user: userId });

    if (!userThreshold) {
      res.status(404).json({ status: 'error', message: 'Threshold not found for the user' });
    } else {
      res.json({
        status: 'success',
        min: {
          SBP: userThreshold.SBP.min,
          DBP: userThreshold.DBP.min,
          PulseRate: userThreshold.PulseRate.min,
          Temperature: userThreshold.Temperature.min,
          DTX: userThreshold.DTX.min,
          Respiration: userThreshold.Respiration.min
        },
        max: {
          SBP: userThreshold.SBP.max,
          DBP: userThreshold.DBP.max,
          PulseRate: userThreshold.PulseRate.max,
          Temperature: userThreshold.Temperature.max,
          DTX: userThreshold.DTX.max,
          Respiration: userThreshold.Respiration.max
        },
        Painscore:userThreshold.Painscore,
      });
    }
  } catch (error) {
    console.error('Error retrieving threshold:', error);
    res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
});

// app.post("/addpatientform", async (req, res) => {
//   const {
//     Symptoms,
//     SBP,
//     DBP,
//     PulseRate,
//     Temperature,
//     DTX,
//     Respiration,
//     LevelSymptom,
//     Painscore,
//     request_detail,
//     Recorder,
//     user
//   } = req.body;

//   try {
//     const patientForm = new PatientForm({
//       Symptoms,
//       SBP: SBP.trim() !== '' ? SBP : null,
//       DBP: DBP.trim() !== '' ? DBP : null,
//       PulseRate: PulseRate.trim() !== '' ? PulseRate : null,
//       Temperature: Temperature.trim() !== '' ? Temperature : null,
//       DTX: DTX.trim() !== '' ? DTX : null,
//       Respiration: Respiration.trim() !== '' ? Respiration : null,
//       LevelSymptom,
//       Painscore,
//       request_detail,
//       Recorder,
//       user,
//     });

//     await patientForm.save();

//     const userThreshold = await UserThreshold.findOne({ user });
//     const thresholds = userThreshold || threshold;

//     let alerts = [];

//     if (SBP && SBP.trim() !== '') {
//       const SBPValue = parseFloat(SBP);
//       if (SBPValue < thresholds.SBP.min || SBPValue > thresholds.SBP.max) {
//         alerts.push("ความดันตัวบน");
//       }
//     }

//     if (DBP && DBP.trim() !== '') {
//       const DBPValue = parseFloat(DBP);
//       if (DBPValue < thresholds.DBP.min || DBPValue > thresholds.DBP.max) {
//         alerts.push("ความดันตัวล่าง");
//       }
//     }

//     if (PulseRate && PulseRate.trim() !== '') {
//       const PulseRateValue = parseFloat(PulseRate);
//       if (PulseRateValue < thresholds.PulseRate.min || PulseRateValue > thresholds.PulseRate.max) {
//         alerts.push("ชีพจร");
//       }
//     }

//     if (Temperature && Temperature.trim() !== '') {
//       const TemperatureValue = parseFloat(Temperature);
//       if (TemperatureValue < thresholds.Temperature.min || TemperatureValue > thresholds.Temperature.max) {
//         alerts.push("อุณหภูมิ");
//       }
//     }

//     if (DTX && DTX.trim() !== '') {
//       const DTXValue = parseFloat(DTX);
//       if (DTXValue < thresholds.DTX.min || DTXValue > thresholds.DTX.max) {
//         alerts.push("ระดับน้ำตาลในเลือด");
//       }
//     }

//     if (Respiration && Respiration.trim() !== '') {
//       const RespirationValue = parseFloat(Respiration);
//       if (RespirationValue < thresholds.Respiration.min || RespirationValue > thresholds.Respiration.max) {
//         alerts.push("การหายใจ");
//       }
//     }
//     if (Painscore > 5) {
//       alerts.push("Painscore สูงกว่า 5"); // การแจ้งเตือนหาก Painscore มากกว่า 5
//     }

//     if (alerts.length > 0) {
//       const alertMessage = `ค่า ${alerts.join(', ')} มีความผิดปกติ`;
//       await Alert.create({ patientFormId: patientForm._id, alertMessage, user });
    
//       io.emit('newAlert', { alertMessage, patientFormId: patientForm._id });

//     }

//     res.send({ status: "ok", patientForm });
//   } catch (error) {
//     console.error(error);
//     res.status(500).send({ status: "error", message: error.message });
//   }
// });


app.get("/getpatientform/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const patientForm = await PatientForm.findById(id).exec();
    if (!patientForm) {
      return res.status(404).send({ status: "error", message: "Patient form not found" });
    }

    res.send({ status: "ok", patientForm });
  } catch (error) {
    console.error(error);
    res.status(500).send({ status: "error", message: error.message });
  }
});


// app.put("/updatepatientform/:id", async (req, res) => {
//   const {
//     Symptoms,
//     SBP,
//     DBP,
//     PulseRate,
//     Temperature,
//     DTX,
//     Respiration,
//     LevelSymptom,
//     Painscore,
//     request_detail,
//     Recorder,
//     user
//   } = req.body;

//   const { id } = req.params;

//   try {
//     const updatedFields = {
//       Symptoms,
//       SBP: SBP !== '' ? SBP : null,
//       DBP: DBP !== '' ? DBP : null,
//       PulseRate: PulseRate !== '' ? PulseRate : null,
//       Temperature: Temperature !== '' ? Temperature : null,
//       DTX: DTX !== '' ? DTX : null,
//       Respiration: Respiration !== '' ? Respiration : null,
//       LevelSymptom,
//       Painscore,
//       request_detail,
//       Recorder,
//       user,
//     };

//     Object.keys(updatedFields).forEach(key => updatedFields[key] === undefined && delete updatedFields[key]);

//     const patientForm = await PatientForm.findByIdAndUpdate(id, updatedFields, { new: true });

//     if (!patientForm) {
//       return res.status(404).send({ status: "error", message: "Patient form not found" });
//     }

//     const userThreshold = await UserThreshold.findOne({ user });
//     const thresholds = userThreshold || threshold;

//     let alerts = [];

//     const isString = value => typeof value === 'string';

//     if (SBP && isString(SBP) && SBP.trim() !== '') {
//       const SBPValue = parseFloat(SBP);
//       if (SBPValue < thresholds.SBP.min || SBPValue > thresholds.SBP.max) {
//         alerts.push("ความดันตัวบน");
//       }
//     }

//     if (DBP && isString(DBP) && DBP.trim() !== '') {
//       const DBPValue = parseFloat(DBP);
//       if (DBPValue < thresholds.DBP.min || DBPValue > thresholds.DBP.max) {
//         alerts.push("ความดันตัวล่าง");
//       }
//     }

//     if (PulseRate && isString(PulseRate) && PulseRate.trim() !== '') {
//       const PulseRateValue = parseFloat(PulseRate);
//       if (PulseRateValue < thresholds.PulseRate.min || PulseRateValue > thresholds.PulseRate.max) {
//         alerts.push("ชีพจร");
//       }
//     }

//     if (Temperature && isString(Temperature) && Temperature.trim() !== '') {
//       const TemperatureValue = parseFloat(Temperature);
//       if (TemperatureValue < thresholds.Temperature.min || TemperatureValue > thresholds.Temperature.max) {
//         alerts.push("อุณหภูมิ");
//       }
//     }

//     if (DTX && isString(DTX) && DTX.trim() !== '') {
//       const DTXValue = parseFloat(DTX);
//       if (DTXValue < thresholds.DTX.min || DTXValue > thresholds.DTX.max) {
//         alerts.push("ระดับน้ำตาลในเลือด");
//       }
//     }

//     if (Respiration && isString(Respiration) && Respiration.trim() !== '') {
//       const RespirationValue = parseFloat(Respiration);
//       if (RespirationValue < thresholds.Respiration.min || RespirationValue > thresholds.Respiration.max) {
//         alerts.push("การหายใจ");
//       }
//     }

//     if (alerts.length > 0) {
//       const alertMessage = `มีการแก้ไขการบันทึก แล้วค่า ${alerts.join(', ')} มีความผิดปกติ`;
//       await Alert.create({ patientFormId: patientForm._id, alertMessage, user });
      
//       io.emit('newAlert', { alertMessage, patientFormId: patientForm._id });

//     }

//     res.send({ status: "ok", patientForm });
//   } catch (error) {
//     console.error(error);
//     res.status(500).send({ status: "error", message: error.message });
//   }
// });

// const checkAbnormalities = async (data, thresholds, patientFormId, user, isUpdate = false) => {
//   let alerts = [];

//   const checkThreshold = (value, key) => {
//     if (value !== null && value !== undefined) {
//       const strValue = typeof value === 'string' ? value.trim() : value.toString();
//       const numValue = parseFloat(strValue);
//       if (numValue < thresholds[key].min || numValue > thresholds[key].max) {
//         alerts.push(key);
//       }
//     }
//   };

//   checkThreshold(data.SBP, 'SBP');
//   checkThreshold(data.DBP, 'DBP');
//   checkThreshold(data.PulseRate, 'PulseRate');
//   checkThreshold(data.Temperature, 'Temperature');
//   checkThreshold(data.DTX, 'DTX');
//   checkThreshold(data.Respiration, 'Respiration');

//   if (data.Painscore > 5) alerts.push("Painscore สูงกว่า 5");

//   if (alerts.length > 0) {
//     const prefix = isUpdate ? "มีการแก้ไขการบันทึก แล้วค่า" : "ค่า";
//     const alertMessage = `${prefix} ${alerts.join(', ')} มีความผิดปกติ`;

//     // ตรวจสอบว่ามีการแจ้งเตือนเดิมอยู่แล้วหรือไม่
//     const existingAlert = await Alert.findOne({ patientFormId, user });
//     if (existingAlert) {
//       // อัปเดตการแจ้งเตือนเดิม
//       existingAlert.alertMessage = alertMessage;
//       await existingAlert.save();
//     } else {
//       // สร้างการแจ้งเตือนใหม่หากไม่มี
//       await Alert.create({ patientFormId, alertMessage, user });
//     }

//     // ส่งการแจ้งเตือนผ่าน WebSocket
//     io.emit('newAlert', { alertMessage, patientFormId , user});
//   }
// };


const checkAbnormalities = async (data, thresholds, patientFormId, userId, isUpdate = false) => {
  let alerts = [];

  const keyToLabel = {
    SBP: "ความดันตัวบน",
    DBP: "ความดันตัวล่าง",
    PulseRate: "อัตราชีพจร",
    Temperature: "อุณหภูมิ",
    DTX: "น้ำตาลในเลือด",
    Respiration: "อัตราการหายใจ",
    Painscore: "ระดับความเจ็บปวด"
  };
  const checkThreshold = (value, key) => {
    if (value !== null && value !== undefined) {
      const strValue = typeof value === 'string' ? value.trim() : value.toString();
      const numValue = parseFloat(strValue);
      if (numValue < thresholds[key].min || numValue > thresholds[key].max) {
        alerts.push(keyToLabel[key] || key);
      }
    }
  };

  checkThreshold(data.SBP, 'SBP');
  checkThreshold(data.DBP, 'DBP');
  checkThreshold(data.PulseRate, 'PulseRate');
  checkThreshold(data.Temperature, 'Temperature');
  checkThreshold(data.DTX, 'DTX');
  checkThreshold(data.Respiration, 'Respiration');

  if (data.Painscore > 5) alerts.push(keyToLabel["Painscore"] || "Painscore สูงกว่า 5");

  if (alerts.length === 0) {
    await Alert.deleteMany({ patientFormId, user: userId });
    io.emit('deletedAlert', { patientFormId });
    return;
  }

  if (alerts.length > 0) {
    const prefix = isUpdate ? "มีการแก้ไขการบันทึก แล้วค่า" : "ค่า";
    const alertMessage = `${prefix} ${alerts.join(', ')} มีความผิดปกติ`;

    // ตรวจสอบว่ามีการแจ้งเตือนเดิมอยู่แล้วหรือไม่
    const existingAlert = await Alert.findOne({ patientFormId, user: userId });
    let alert;
    if (existingAlert) {
      // อัปเดตการแจ้งเตือนเดิม
      existingAlert.alertMessage = alertMessage;
      alert = await existingAlert.save();
    } else {
      // สร้างการแจ้งเตือนใหม่หากไม่มี
      alert = await Alert.create({ patientFormId, alertMessage, user: userId });
    }

    // ดึงข้อมูล user เพื่อให้ได้ name และ surname
    const user = await User.findById(userId).select('name surname');
    if (!user) throw new Error('User not found');
    const patientForm = await PatientForm.findById(patientFormId).select("createdAt updatedAt");
    if (!patientForm) throw new Error("Patient form not found");

    // ส่งการแจ้งเตือนผ่าน WebSocket
    io.emit('newAlert', {
      _id: alert._id, 
      alertMessage,
      patientFormId,
      user: { id: userId, name: user.name, surname: user.surname },
      createdAt: alert.createdAt, // ใช้ createdAt ของ alert เอง
      patientFormCreatedAt: patientForm?.createdAt || null, 
      patientFormUpdatedAt : patientForm?.updatedAt || null,
      updatedAt: alert.updatedAt,
      viewedBy: alert.viewedBy || [],
    });
  }
};


app.post("/addpatientform", async (req, res) => {
  const {
    Symptoms,
    SBP,
    DBP,
    PulseRate,
    Temperature,
    DTX,
    Respiration,
    LevelSymptom,
    Painscore,
    request_detail,
    Recorder,
    user
  } = req.body;

  try {
    const patientForm = new PatientForm({
      Symptoms,
      SBP: SBP.trim() !== '' ? SBP : null,
      DBP: DBP.trim() !== '' ? DBP : null,
      PulseRate: PulseRate.trim() !== '' ? PulseRate : null,
      Temperature: Temperature.trim() !== '' ? Temperature : null,
      DTX: DTX.trim() !== '' ? DTX : null,
      Respiration: Respiration.trim() !== '' ? Respiration : null,
      LevelSymptom,
      Painscore,
      request_detail,
      Recorder,
      user,
    });

    await patientForm.save();

    const userThreshold = await UserThreshold.findOne({ user });
    const thresholds = userThreshold || threshold;

    await checkAbnormalities(req.body, thresholds, patientForm._id, user);

    res.send({ status: "ok", patientForm });
  } catch (error) {
    console.error(error);
    res.status(500).send({ status: "error", message: error.message });
  }
});

app.put("/updatepatientform/:id", async (req, res) => {
  const {
    Symptoms,
    SBP,
    DBP,
    PulseRate,
    Temperature,
    DTX,
    Respiration,
    LevelSymptom,
    Painscore,
    request_detail,
    Recorder,
    user
  } = req.body;

  const { id } = req.params;

  try {
    const updatedFields = {
      Symptoms,
      SBP: SBP !== '' ? SBP : null,
      DBP: DBP !== '' ? DBP : null,
      PulseRate: PulseRate !== '' ? PulseRate : null,
      Temperature: Temperature !== '' ? Temperature : null,
      DTX: DTX !== '' ? DTX : null,
      Respiration: Respiration !== '' ? Respiration : null,
      LevelSymptom,
      Painscore,
      request_detail,
      Recorder,
      user,
      updatedAt: new Date(),
    };

    Object.keys(updatedFields).forEach(key => updatedFields[key] === undefined && delete updatedFields[key]);

    const patientForm = await PatientForm.findByIdAndUpdate(id, updatedFields, { new: true });

    if (!patientForm) {
      return res.status(404).send({ status: "error", message: "Patient form not found" });
    }

    await Alert.updateMany(
      { patientFormId: id }, // เงื่อนไขเพื่อค้นหา Alert ที่เกี่ยวข้อง
      { $set: { viewedBy: [],
        updatedAt: new Date() 
      } } // รีเซ็ตฟิลด์ viewedBy
    );

    const userThreshold = await UserThreshold.findOne({ user });
    const thresholds = userThreshold || threshold;

    await checkAbnormalities(req.body, thresholds, patientForm._id, user, true);

    res.send({ status: "ok", patientForm });
  } catch (error) {
    console.error(error);
    res.status(500).send({ status: "error", message: error.message });
  }
});

// app.get("/alerts", async (req, res) => {
//   try {
//     const alerts = await Alert.find().populate('user', 'name surname').sort({ createdAt: -1 });
//     res.json({ alerts });
//   } catch (error) {
//     console.error("Error fetching alerts:", error);
//     res.status(500).send({ status: "error", message: error.message });
//   }
// });
// app.get("/alerts", async (req, res) => { 
//   try {
//     const alerts = await Alert.find()
//     .sort({ updatedAt: -1 })
//       .populate({
//         path: 'user',
//         select: 'name surname',
//         match: { deletedAt: null } 
//       });

//     res.json({ alerts });

//   } catch (error) {
//     console.error("Error fetching alerts:", error);
//     res.status(500).send({ status: "error", message: error.message });
//   }
// });
app.get("/alerts", async (req, res) => {
  try {
    // ดึงข้อมูล alerts และเชื่อมโยงข้อมูล user และ patientForm
    const alerts = await Alert.find()
      .sort({ updatedAt: -1 })
      .populate({
        path: 'user',
        select: 'name surname',
        match: { deletedAt: null } // ดึงเฉพาะ user ที่ไม่มี deletedAt
      })
      .populate({
        path: 'patientFormId', // เชื่อมโยงกับ patientForm
        select: 'createdAt updatedAt' // ดึงเฉพาะฟิลด์ createdAt จาก patientForm
      });

      const updatedAlerts = alerts.map(alert => ({
        ...alert.toObject(),
        patientFormId: alert.patientFormId?._id || alert.patientFormId || null, // ใช้ _id ถ้ามี
        patientFormCreatedAt: alert.patientFormId?.createdAt || null, // เพิ่ม patientFormCreatedAt
        patientFormUpdatedAt: alert.patientFormId?.updatedAt || null, // เพิ่ม patientFormCreatedAt
      }));
  
      res.json({ alerts: updatedAlerts });
  } catch (error) {
    console.error("Error fetching alerts:", error);
    res.status(500).send({ status: "error", message: error.message });
  }
});

app.put("/alerts/:id/viewed", async (req, res) => {
  try {
    const alertId = req.params.id;
    const userId = req.body.userId;

    const alert = await Alert.findByIdAndUpdate(
      alertId,
      { $addToSet: { viewedBy: userId } },
      { new: true }
    );

    res.json({ alert });
  } catch (error) {
    console.error("Error updating alert viewed status:", error);
    res.status(500).send({ status: "error", message: error.message });
  }
});


app.put("/alerts/mark-all-viewed", async (req, res) => {
  try {
    const userId = req.body.userId;

    if (!userId) {
      return res.status(400).json({ status: "error", message: "User ID is required." });
    }

    await Alert.updateMany(
      { viewedBy: { $ne: userId } }, // Select alerts not viewed by this user
      { $addToSet: { viewedBy: userId } } // Add userId to viewedBy array
    );

    res.json({ status: "success", message: "All alerts marked as viewed by the user." });
  } catch (error) {
    console.error("Error marking all alerts as viewed:", error);
    res.status(500).json({ status: "error", message: error.message });
  }
});



//นับความถี่อาการ
app.get("/countSymptoms/:userId/:formId", async (req, res) => {
  const { userId, formId } = req.params;
  try {
    const symptomsCount = await PatientForm.aggregate([
      {
        $match: {
          user: new mongoose.Types.ObjectId(userId),
          _id: { $lte: new mongoose.Types.ObjectId(formId) } // นับรวมถึงอันที่เข้ามา ถ้าไม่นับ lt
        }
      },
      { $unwind: "$Symptoms" },
      { $group: { _id: "$Symptoms", count: { $sum: 1 } } },
      { $sort: { count: -1 } }

    ]);

    res.send({ status: "ok", symptomsCount });
  } catch (error) {
    console.error(error);
    res.status(500).send({ status: "error" });
  }
});





//เอาบันทึกคนนี้้มาทั้งหมด
app.get("/getpatientforms/:userId", async (req, res) => {
  const userId = req.params.userId;

  try {
    const patientForms = await PatientForm.find({ user: userId });
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


//ดึงข้อมูลกราฟทั้งหมด
app.get("/getPatientData/:userId/:formId", async (req, res) => {
  const { userId, formId } = req.params;

  try {
    const patientForm = await PatientForm.findById(formId);

    if (!patientForm) {
      return res.send({ status: "error", message: "Form not found" });
    }

    const patientForms = await PatientForm.find({
      user: userId,
      createdAt: { $lte: patientForm.createdAt }
    })
      .populate('user')
      .sort({ createdAt: -1 });

    const PatientData = patientForms.map(form => ({
      name: form.user.name,
      SBP: form.SBP,
      DBP: form.DBP,
      Temperature: form.Temperature,
      Painscore: form.Painscore,
      DTX: form.DTX,
      PulseRate: form.PulseRate,
      Respiration: form.Respiration,
      createdAt: form.createdAt
    })).reverse();

    res.send({ status: "ok", data: PatientData });
  } catch (error) {
    console.error("Error fetching SBP data:", error);
    res.send({ status: "error" });
  }
});

//แบบไม่มีชื่อผู้ประเมิน
app.post("/addassessment", async (req, res) => {
  const { suggestion, detail, status_name, PPS, MPersonnel, PatientForm: patientFormId } = req.body;

  try {
    const patientForm = await PatientForm.findById(patientFormId).populate('user').exec();

    if (!patientForm) {
      return res.status(404).send({ status: "error", message: "PatientForm not found." });
    }
    const assessment = await Assessment.create({
      suggestion, detail, status_name, PPS, MPersonnel, PatientForm: patientForm._id,
    });
    
    const createdAtAss = assessment.createdAt;
    let alert;
    if (status_name === 'เคสฉุกเฉิน') {
      const alertMessage = `เป็นเคสฉุกเฉิน`;

      const { _id: userId, name, surname } = patientForm.user;
      
      alert = await Alert.create({
        patientFormId: patientForm._id,
        alertMessage,
        user: patientForm.user._id,
        createdAtAss: new Date() 
      });
      
      io.emit('newAlert', { 
        _id: alert._id, 
        alertMessage, 
        patientFormId: patientForm._id,
        createdAt: alert.createdAt, // ใช้ createdAt ของ alert เอง
        patientFormCreatedAt: patientForm?.createdAt || null,
        patientFormUpdatedAt : patientForm?.updatedAt || null,
        createdAtAss ,
        updatedAt: alert.updatedAt,
        user: { id: userId, name, surname } ,
        viewedBy:[]});
    }

   
    res.send({ status: "ok" });
  } catch (error) {
    console.error("Error:", error);
    if (error.code === 11000 && error.keyPattern.PatientForm) {
      res.status(400).send({ status: "error", message: "PatientForm already has an assessment." });
    } else {
      res.status(500).send({ status: "error", message: "An error occurred while adding assessment." });
    }
  }
});


app.put("/updateassessment/:id", async (req, res) => {
  const { id } = req.params;
  const { suggestion, detail, status_name, PPS, MPersonnel } = req.body;

  try {
    const assessment = await Assessment.findById(id).populate('PatientForm').exec();

    if (!assessment) {
      return res.status(404).send({ status: "error", message: "Assessment not found." });
    }

    const previousStatus = assessment.status_name;

    // บันทึกการแก้ไขลงใน history
    assessment.history.push({
      suggestion: assessment.suggestion,
      detail: assessment.detail,
      status_name: previousStatus,
      PPS: assessment.PPS,
      updatedBy: MPersonnel,
    });

    // อัปเดตข้อมูลใหม่
    assessment.suggestion = suggestion;
    assessment.detail = detail;
    assessment.status_name = status_name;
    assessment.PPS = PPS;

    // ตรวจสอบว่ามีการเปลี่ยนแปลงสถานะจาก 'เคสฉุกเฉิน'
    if (previousStatus === 'เคสฉุกเฉิน' && status_name !== 'เคสฉุกเฉิน') {
      console.log(`Deleting alert for patientFormId: ${assessment.PatientForm._id} with message: 'เป็นเคสฉุกเฉิน'`);
      
      // ลบ alert ที่เกี่ยวข้อง
      const deleteResult = await Alert.deleteOne({
        patientFormId: assessment.PatientForm._id,
        alertMessage: 'เป็นเคสฉุกเฉิน'
      });

      console.log(`Delete result: ${deleteResult}`);

      io.emit('deletedAlert', { patientFormId: assessment.PatientForm._id, alertMessage: 'เป็นเคสฉุกเฉิน' });

    }
    let alert;

    // ถ้าเป็นเคสฉุกเฉินให้สร้าง alert ใหม่
    if (status_name === 'เคสฉุกเฉิน' && previousStatus !== 'เคสฉุกเฉิน') {
      const alertMessage = `เป็นเคสฉุกเฉิน`;
      const patientFormCreatedAt = assessment.PatientForm.createdAt;
      const user = await User.findById(assessment.PatientForm.user._id).select('name surname');
      if (!user) throw new Error('User not found');
      console.log(`Creating alert for patientFormId: ${assessment.PatientForm._id} with message: 'เป็นเคสฉุกเฉิน'`);
      alert = await Alert.create({
        patientFormId: assessment.PatientForm._id,
        alertMessage,
        user: assessment.PatientForm.user._id,
        createdAtAss: new Date() 
      });

      io.emit('newAlert', { 
        _id: alert._id, 
        alertMessage, 
        patientFormId: assessment.PatientForm._id ,
        viewedBy:[], 
        user: { id: assessment.PatientForm.user._id, name: user.name, surname: user.surname },
        createdAtAss: alert.createdAt,
        createdAt: alert.createdAt, // ใช้ createdAt ของ alert เอง
        patientFormCreatedAt: patientFormCreatedAt || null, 
        patientFormUpdatedAt : patientForm?.updatedAt || null,
        updatedAt: alert.updatedAt,
      });

    }

    await assessment.save();

    res.send({ status: "ok", message: "Assessment updated successfully." });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).send({ status: "error", message: "An error occurred while updating assessment." });
  }
});


app.get("/assessment/:assessmentId", async (req, res) => {
  const { assessmentId } = req.params; // รับ assessmentId จาก URL

  try {
    // ค้นหา Assessment โดยใช้ assessmentId
    const assessment = await Assessment.findById(assessmentId)
      .populate("history.updatedBy", "name surname") // ดึงข้อมูลชื่อของผู้ที่อัพเดตจาก MPersonnel
      .exec();

    if (!assessment) {
      return res.status(404).json({ message: "Assessment not found" });
    }

    // ส่งข้อมูลของ Assessment รวมถึง history
    res.json({ data: assessment });
  } catch (error) {
    console.error("Error fetching assessment:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});


app.get("/searchassessment", async (req, res) => {
  try {
    const { keyword } = req.query; // เรียกใช้ keyword ที่ส่งมาจาก query parameters
    const regex = new RegExp(escapeRegex(keyword), "i");

    // รวมชื่อและนามสกุลเป็นฟิลด์เดียวชั่วคราวสำหรับการค้นหา
    const users = await User.aggregate([
      {
        $addFields: {
          fullname: { $concat: ["$name", " ", "$surname"] }
        }
      },
      {
        $match: {
          $or: [
            { name: { $regex: regex } },
            { surname: { $regex: regex } },
            { fullname: { $regex: regex } }
          ]
        }
      }
    ]);

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

// เเอาไปเช็คว่าจบการรักษายัง
app.get('/assessments', async (req, res) => {
  try {
    const { patientFormIds } = req.query;
    const assessments = await Assessment.find({
      PatientForm: { $in: patientFormIds }
    }).populate('PatientForm');
    res.json({ data: assessments });
  } catch (error) {
    res.status(500).json({ error: 'เกิดข้อผิดพลาดในการดึงข้อมูล Assessments' });
  }
});


// --------------------------
//ค้นหาผู้ป่วย
app.get("/searchuser", async (req, res) => {
  try {
    const { keyword } = req.query; // เรียกใช้ keyword ที่ส่งมาจาก query parameters

    // ใช้ regex เพื่อค้นหาคำหลักในชื่อของคู่มือ
    const regex = new RegExp(escapeRegex(keyword), "i");

    // รวมชื่อและนามสกุลเป็นฟิลด์เดียวชั่วคราวสำหรับการค้นหา
    const result = await User.aggregate([
      {
        $addFields: {
          fullname: { $concat: ["$name", " ", "$surname"] }
        }
      },
      {
        $match: {
          $or: [
            { username: { $regex: regex } },
            { name: { $regex: regex } },
            { surname: { $regex: regex } },
            { fullname: { $regex: regex } }
          ]
        }
      }
    ]);

    res.json({ status: "ok", data: result });
  } catch (error) {
    res.json({ status: error.message });
  }
});


//ลบผู้ป่วย

//verไม่มีใส่รหัสผ่านแอดมิน
// app.delete("/deleteUser/:id", async (req, res) => {
//   const UserId = req.params.id;
//   try {
//     const result = await User.findOneAndUpdate(
//       { _id: UserId },
//       { $set: { deletedAt: new Date() } }
//     );

//     if (result) {
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
  const { adminPassword, adminId } = req.body; // adminId ต้องถูกส่งมาจากฝั่ง frontend
  try {
    // ตรวจสอบว่ามี Admin ที่ส่งคำขอหรือไม่
    const admin = await Admins.findById(adminId);

    if (!admin) {
      return res.status(401).json({
        status: "Unauthorized",
        data: "ไม่พบข้อมูลผู้ดูแลระบบหรือไม่ได้เข้าสู่ระบบ",
      });
    }

    // ตรวจสอบรหัสผ่าน Admin
    const isPasswordCorrect = await bcrypt.compare(adminPassword, admin.password); // Assuming passwords are hashed
    if (!isPasswordCorrect) {
      return res.status(401).json({
        status: "Unauthorized",
        data: "รหัสผ่านผู้ดูแลระบบไม่ถูกต้อง",
      });
    }

    // Mark user as deleted
    const result = await User.findByIdAndUpdate(
      UserId,
      {
        $set: {
          deletedAt: new Date(),
          deleteExpiry: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // +30 วัน
        },
      },
      { new: true }
    );


    if (result) {
      res.json({ status: "OK", data: "ลบข้อมูลผู้ป่วยสำเร็จ" });
    } else {
      res.status(404).json({
        status: "Not Found",
        data: "ไม่พบข้อมูลผู้ป่วยนี้หรือข้อมูลถูกลบไปแล้ว",
      });
    }
  } catch (error) {
    console.error("Error during deletion:", error);
    res.status(500).json({ status: "Error", data: "Internal Server Error" });
  }
});

//กู้คืน
app.post("/recoveruser/:id", async (req, res) => {
  const userId = req.params.id;
  try {
    const user = await User.findByIdAndUpdate(
      userId,
      { deletedAt: null },
      { new: true }
    );
    if (!user) {
      return res.status(404).json({ success: false, message: "ไม่พบผู้ใช้" });
    }
    res.json({ success: true, message: "กู้คืนข้อมูลสำเร็จ", data: user });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "เกิดข้อผิดพลาด" });
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
  const { name, surname } = req.body;
  const id = req.params.id;
  try {
    // อัปเดตชื่อของ admin
    // const admin = await Admins.findById(id);
    await Admins.findByIdAndUpdate(id, { name, surname });

    res
      .status(200)
      .json({ status: "ok", message: "ชื่อผู้ใช้ถูกอัปเดตเรียบร้อยแล้ว" });
  } catch (error) {
    console.error("Error during name update:", error);
    res.status(500).json({ error: "มีข้อผิดพลาดในการอัปเดตชื่อผู้ใช้" });
  }
});


//----------------------------------------------

// app.post("/updatemedicalinformation/:id", upload1, async (req, res) => {
//   const {
//     HN,
//     AN,
//     Date_Admit,
//     Date_DC,
//     Diagnosis,
//     Chief_complaint,
//     Present_illness,
//     Phychosocial_assessment,
//     Management_plan,
//     selectedPersonnel,
//   } = req.body;
//   const { id } = req.params;

//   try {
//     let filePresent = "";
//     let fileManage = "";
//     let filePhychosocial = "";

//     const bucket = admin.storage().bucket();

//     // Upload fileP to Firebase Storage (if exists)
//     if (req.files["fileP"] && req.files["fileP"][0]) {
//       const file = req.files["fileP"][0];
//       const fileName = Date.now() + '-' + file.originalname;
//       const fileRef = bucket.file(fileName);
//       const fileStream = fileRef.createWriteStream({
//         metadata: { contentType: file.mimetype },
//       });

//       fileStream.end(file.buffer);
//       await new Promise((resolve, reject) => {
//         fileStream.on('finish', () => {
//           filePresent = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(fileName)}?alt=media`;
//           resolve();
//         });
//         fileStream.on('error', reject);
//       });
//     }

//     // Upload fileM to Firebase Storage (if exists)
//     if (req.files["fileM"] && req.files["fileM"][0]) {
//       const file = req.files["fileM"][0];
//       const fileName = Date.now() + '-' + file.originalname;
//       const fileRef = bucket.file(fileName);
//       const fileStream = fileRef.createWriteStream({
//         metadata: { contentType: file.mimetype },
//       });

//       fileStream.end(file.buffer);
//       await new Promise((resolve, reject) => {
//         fileStream.on('finish', () => {
//           fileManage = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(fileName)}?alt=media`;
//           resolve();
//         });
//         fileStream.on('error', reject);
//       });
//     }

//     // Upload filePhy to Firebase Storage (if exists)
//     if (req.files["filePhy"] && req.files["filePhy"][0]) {
//       const file = req.files["filePhy"][0];
//       const fileName = Date.now() + '-' + file.originalname;
//       const fileRef = bucket.file(fileName);
//       const fileStream = fileRef.createWriteStream({
//         metadata: { contentType: file.mimetype },
//       });

//       fileStream.end(file.buffer);
//       await new Promise((resolve, reject) => {
//         fileStream.on('finish', () => {
//           filePhychosocial = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(fileName)}?alt=media`;
//           resolve();
//         });
//         fileStream.on('error', reject);
//       });
//     }

//     const oldMedicalInfo = await MedicalInformation.findById(id);
//     if (!oldMedicalInfo) {
//       return res.status(404).json({ status: "Medical information not found" });
//     }

//     // ตรวจสอบว่ามีการอัปโหลดไฟล์ไม่ ถ้าไม่มี ใช้ไฟล์เดิมจากฐานข้อมูล
//     const updatedMedicalInformation = await MedicalInformation.findByIdAndUpdate(
//       id,
//       {
//         HN,
//         AN,
//         Date_Admit,
//         Date_DC,
//         Diagnosis,
//         Chief_complaint,
//         Present_illness,
//         Phychosocial_assessment,
//         Management_plan,
//         fileP: filePresent || oldMedicalInfo.fileP,
//         fileM: fileManage || oldMedicalInfo.fileM,
//         filePhy: filePhychosocial || oldMedicalInfo.filePhy,
//         selectedPersonnel,
//       },
//       { new: true }
//     );

//     if (!updatedMedicalInformation) {
//       return res.status(404).json({ status: "Medical information not found" });
//     }

//     res.json({ status: "ok", updatedMedicalInfo: updatedMedicalInformation });
//   } catch (error) {
//     console.error("Error updating medical information:", error);
//     res.status(500).json({ status: "error", message: "Error updating medical information" });
//   }
// });
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

    let filePresentName = "";
    let fileManageName = "";
    let filePhychosocialName = "";

    const bucket = admin.storage().bucket();

  if (req.files["fileP"] && req.files["fileP"][0]) {
      const file = req.files["fileP"][0];
      const originalName = file.originalname; // เก็บชื่อไฟล์ดั้งเดิม
      const fileName = Date.now() + '-' + originalName;
      const fileRef = bucket.file(fileName);
      const fileStream = fileRef.createWriteStream({
        metadata: { contentType: file.mimetype },
      });

      fileStream.end(file.buffer);
      await new Promise((resolve, reject) => {
        fileStream.on('finish', () => {
          filePresent = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(fileName)}?alt=media`;
          filePresentName = originalName; // เก็บชื่อไฟล์ดั้งเดิม
          resolve();
        });
        fileStream.on('error', reject);
      });
    }

    // Upload fileM to Firebase Storage (if exists)
    if (req.files["fileM"] && req.files["fileM"][0]) {
      const file = req.files["fileM"][0];
      const originalName = file.originalname;
      const fileName = Date.now() + '-' + originalName;
      const fileRef = bucket.file(fileName);
      const fileStream = fileRef.createWriteStream({
        metadata: { contentType: file.mimetype },
      });

      fileStream.end(file.buffer);
      await new Promise((resolve, reject) => {
        fileStream.on('finish', () => {
          fileManage = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(fileName)}?alt=media`;
          fileManageName = originalName;
          resolve();
        });
        fileStream.on('error', reject);
      });
    }

    // Upload filePhy to Firebase Storage (if exists)
    if (req.files["filePhy"] && req.files["filePhy"][0]) {
      const file = req.files["filePhy"][0];
      const originalName = file.originalname;
      const fileName = Date.now() + '-' + originalName;
      const fileRef = bucket.file(fileName);
      const fileStream = fileRef.createWriteStream({
        metadata: { contentType: file.mimetype },
      });

      fileStream.end(file.buffer);
      await new Promise((resolve, reject) => {
        fileStream.on('finish', () => {
          filePhychosocial = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(fileName)}?alt=media`;
          filePhychosocialName = originalName;
          resolve();
        });
        fileStream.on('error', reject);
      });
    }

    const oldMedicalInfo = await MedicalInformation.findById(id);
    if (!oldMedicalInfo) {
      return res.status(404).json({ status: "Medical information not found" });
    }

    // ตรวจสอบว่ามีการอัปโหลดไฟล์ใหม่หรือไม่
    const updatedMedicalInformation = await MedicalInformation.findByIdAndUpdate(
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
        fileP: filePresent || oldMedicalInfo.fileP,
        filePName: filePresentName || oldMedicalInfo.filePName, // อัปเดตชื่อไฟล์ดั้งเดิม
        fileM: fileManage || oldMedicalInfo.fileM,
        fileMName: fileManageName || oldMedicalInfo.fileMName,
        filePhy: filePhychosocial || oldMedicalInfo.filePhy,
        filePhyName: filePhychosocialName || oldMedicalInfo.filePhyName,
        selectedPersonnel,
      },
      { new: true }
    );
    if (!updatedMedicalInformation) {
      return res.status(404).json({ status: "Medical information not found" });
    }

    res.json({ status: "ok", updatedMedicalInfo: updatedMedicalInformation });
  } catch (error) {
    console.error("Error updating medical information:", error);
    res.status(500).json({ status: "error", message: "Error updating medical information" });
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

    if (!name) {
      return res.json({ error: "Name cannot be empty" });
    }

    if (oldesymptom) {
      return res.json({ error: "ชื่ออาการนี้มีในระบบแล้ว" });
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
app.get("/check-symptom-name", async (req, res) => {
  const { name } = req.query;
  try {
    const existingSymptom = await Symptom.findOne({ name });
    res.json({ exists: !!existingSymptom });
  } catch (error) {
    console.error("Error checking symptom name:", error);
    res.status(500).json({ message: "Error checking symptom name" });
  }
});

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


// แชทฝั่งหมอ

app.get("/searchuserchat", async (req, res) => {
  try {
    const { keyword } = req.query;

    const regex = new RegExp(escapeRegex(keyword), "i");

    const result = await User.aggregate([
      {
        $addFields: {
          fullname: { $concat: ["$name", " ", "$surname"] }
        }
      },
      {
        $match: {
          $or: [
            { username: { $regex: regex } },
            { name: { $regex: regex } },
            { surname: { $regex: regex } },
            { fullname: { $regex: regex } }
          ]
        }
      }
    ]);

    res.json({ status: "ok", data: result });
  } catch (error) {
    res.json({ status: error });
  }
});


//เริ่มต้นแก้ใหม่ 191267
io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

  // เข้าห้องแชท
  socket.on('joinRoom', (roomId) => {
    socket.join(roomId);
    console.log(`User joined room: ${roomId}`);
  });

   
    // อัปเดตข้อความเมื่อมีการอ่านข้อความ
    socket.on("markAsRead", async ({ roomId, messageId, userId }) => {
      try {
        // ตรวจสอบ userId ว่าเป็น ObjectId ที่ถูกต้อง
        if (!mongoose.Types.ObjectId.isValid(userId)) {
          console.error(`Invalid userId: ${userId}`);
          return;
        }
        const chatMessage = await Chat.findById(messageId);
        if (chatMessage) {
          const isAlreadyRead = chatMessage.readBy.some(
            (readerId) => readerId.toString() === userId
          );
          if (!isAlreadyRead && chatMessage.sender.toString() !== userId) {
            await Chat.findByIdAndUpdate(
              messageId,
              { $addToSet: { readBy: userId } }, // ป้องกันค่าซ้ำใน readBy
              { new: true } // คืนค่าที่อัปเดตกลับมา
            );
         const chats = await Chat.find({
          roomId,
          sender: { $ne: userId },
          readBy: { $nin: [userId] },
        });
            // ส่งข้อมูลอัปเดตให้ทุกคนในห้อง
            io.to(roomId).emit("readByUpdated", {
              messageId,
              readBy: [...chatMessage.readBy, userId], // รวม userId ใหม่
              unreadCount: chats.length,
            });
            console.log(`Message ${messageId} marked as read by ${userId}`);

            const updatedUsers = await User.find(
              { deletedAt: null },
              "name surname username"
            ).lean();
    
            const updatedMPersonnel = await MPersonnel.find(
              { deletedAt: null },
              "name surname username"
            ).lean();
        
            // รวม User และ MPersonnel
            const allParticipants = [...updatedUsers, ...updatedMPersonnel];
        
            // ดึงข้อมูลห้องทั้งหมดที่ผู้ใช้และ MPersonnel เป็นสมาชิก
            const totalrooms = await Room.find({
              "participants.id": { $in: allParticipants.map((participant) => participant._id) },
            }).lean();
        
            // คำนวณ unread count สำหรับแต่ละผู้ใช้ในห้องนี้
            const usersWithUnreadCounts = await Promise.all(
              allParticipants.map(async (participant) => {
                // หาห้องที่ผู้ใช้อยู่
                const userRooms = totalrooms.filter((room) =>
                  room.participants.some((p) => String(p.id) === String(participant._id))
                );
        
                if (userRooms.length === 0) {
                  return null;  // ถ้าผู้ใช้ไม่ได้อยู่ในห้องใดๆ ให้ข้ามไป
                }
        
                let unreadCount = {};
        
                // คำนวณ unread count สำหรับแต่ละห้องที่ผู้ใช้เป็นสมาชิก
                for (const room of userRooms) {
                  const excludedUsers = await User.find({ deletedAt: { $ne: null } }).lean();
                  const excludedUserIds = excludedUsers.map((user) => String(user._id));
            
                  // ถ้าห้องมี roomId ที่ตรงกับ excludedUserIds ให้ข้ามห้องนี้
                  if (excludedUserIds.includes(String(room.roomId))) {
                    continue;
                  }

                  const roomUnreadCount = await Chat.countDocuments({
                    roomId: room.roomId,
                    readBy: { $ne: participant._id }, // ตรวจสอบว่าแชทที่ยังไม่ได้อ่าน
                  });
        
                  unreadCount[room.roomId] = roomUnreadCount;
                }
        
                // คำนวณ total unread count สำหรับผู้ใช้
                const totalUnreadCount = Object.values(unreadCount).reduce(
                  (acc, count) => acc + count,
                  0
                );
        
                console.log(`📦 Total Unread Count for ${participant._id}:`, totalUnreadCount);
        
                return {
                  userId: participant._id,
                  unreadCount,
                  totalUnreadCount,
                };
              })
            );
        
            // กรองเฉพาะผู้ใช้ที่มีข้อมูล (ไม่เป็น null)
            const totalfilteredUsers = usersWithUnreadCounts.filter((user) => user !== null);
            console.log('รวม:', totalfilteredUsers);
            io.emit("TotalUnreadCounts", totalfilteredUsers);
          }
        }
       
      } catch (error) {
        console.error("Error updating readBy:", error);
      }
    });
  
  socket.on('disconnect', () => {
    console.log('A user disconnected:', socket.id);
  });
});


app.post("/sendchat", uploadimg.single("image"), async (req, res) => {
  try {
    const { message, roomId, senderId, senderModel } = req.body;
    let sender;
    if (message.length > 10000) {
      return res.status(400).json({
        success: false,
        message: "Message exceeds the maximum length of 1000 characters.",
      });
    }

    if (senderModel === "User") {
      sender = await User.findById(senderId);
    } else if (senderModel === "MPersonnel") {
      sender = await MPersonnel.findById(senderId);
    }

    if (!sender) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    let newChat;

    // ตรวจสอบว่ามีการอัปโหลดไฟล์มาหรือไม่
    if (req.file) {
      const bucket = admin.storage().bucket();
      const fileName = req.file.originalname;
      const file = bucket.file(fileName);
      const originalFileName = Buffer.from(
        req.file.originalname,
        "latin1"
      ).toString("utf8");

      const fileStream = file.createWriteStream({
        metadata: {
          contentType: req.file.mimetype,
        },
      });

      fileStream.on("error", (err) => {
        console.error("Error uploading image:", err);
        return res
          .status(500)
          .json({ success: false, message: "Error uploading image" });
      });

      fileStream.on("finish", async () => {
        const [metadata] = await file.getMetadata();
        const fileSize = metadata.size;

        const imageUrl = `https://firebasestorage.googleapis.com/v0/b/${
          bucket.name
        }/o/${encodeURIComponent(fileName)}?alt=media`;

        newChat = new Chat({
          message,
          image: imageUrl,
          imageName: originalFileName,
          sender: sender._id,
          senderModel,
          roomId,
          fileSize,
          readBy: [senderId],
        });

        await newChat.save();
        await newChat.populate("sender", "name surname");

        // กระจายข้อความแบบเรียลไทม์
        io.to(roomId).emit("receiveMessage", newChat);

        const updatedUsers = await User.find(
          { deletedAt: null },
          "name surname username"
        ).lean();

        const updatedMPersonnel = await MPersonnel.find(
          { deletedAt: null },
          "name surname username"
        ).lean();

        const rooms = await Room.find({
          "participants.id": { $in: updatedUsers.map((user) => user._id) },
        }).lean();

        const usersWithChats = await Promise.all(
          updatedUsers.map(async (user) => {
            const userRooms = rooms.filter((room) =>
              room.participants.some((p) => String(p.id) === String(user._id))
            );

            if (userRooms.length === 0) {
              return null;
            }

            let latestChat = null;
            let unreadCount = {};

            for (const room of userRooms) {
              // ดึงแชทล่าสุดในห้อง
              const roomLatestChat = await Chat.findOne({ roomId: room.roomId })
                .sort({ createdAt: -1 })
                .populate("sender", "name surname")
                .lean();

              if (roomLatestChat) {
                if (
                  !latestChat ||
                  new Date(roomLatestChat.createdAt) >
                    new Date(latestChat.createdAt)
                ) {
                  latestChat = {
                    message: roomLatestChat.message,
                    file: roomLatestChat.image,
                    senderId: roomLatestChat.sender._id,
                    senderName: `${roomLatestChat.sender.name} ${roomLatestChat.sender.surname}`,
                    createdAt: roomLatestChat.createdAt,
                  };
                }
              }

              // ดึงจำนวนข้อความที่ยังไม่ได้อ่านสำหรับทุก participants ในห้องนี้
              for (const participant of room.participants) {
                const unreadCounts = await Chat.countDocuments({
                  roomId: room.roomId,
                  readBy: { $ne: participant.id }, // ตรวจสอบว่าใครยังไม่ได้อ่าน
                });

                unreadCount[participant.id] = unreadCounts;
              }
            }

            return {
              _id: user._id,
              name: user.name,
              surname: user.surname,
              username: user.username,
              latestChat,
              unreadCount,
            };
          })
        );
        const filteredUsers = usersWithChats.filter((user) => user !== null);

        io.emit("usersUpdated", filteredUsers);

        const allParticipants = [...updatedUsers, ...updatedMPersonnel];

        const totalrooms = await Room.find({
          "participants.id": {
            $in: allParticipants.map((participant) => participant._id),
          },
        }).lean();

        const usersWithUnreadCounts = await Promise.all(
          allParticipants.map(async (participant) => {
            const userRooms = totalrooms.filter((room) =>
              room.participants.some(
                (p) => String(p.id) === String(participant._id)
              )
            );

            if (userRooms.length === 0) {
              return null; 
            }

            let unreadCount = {};

            for (const room of userRooms) {
              const excludedUsers = await User.find({
                deletedAt: { $ne: null },
              }).lean();
              const excludedUserIds = excludedUsers.map((user) =>
                String(user._id)
              );

              // ถ้าห้องมี roomId ที่ตรงกับ excludedUserIds ให้ข้ามห้องนี้
              if (excludedUserIds.includes(String(room.roomId))) {
                continue;
              }
              const roomUnreadCount = await Chat.countDocuments({
                roomId: room.roomId,
                readBy: { $ne: participant._id },
              });

              unreadCount[room.roomId] = roomUnreadCount;
            }

            const totalUnreadCount = Object.values(unreadCount).reduce(
              (acc, count) => acc + count,
              0
            );

           console.log(
              `Total Unread Count for ${participant._id}:`,
              totalUnreadCount
            );

            return {
              userId: participant._id,
              unreadCount,
              totalUnreadCount,
            };
          })
        );

        // กรองเฉพาะผู้ใช้ที่มีข้อมูล (ไม่เป็น null)
        const totalfilteredUsers = usersWithUnreadCounts.filter(
          (user) => user !== null
        );
        console.log("รวม:", totalfilteredUsers);
        io.emit("TotalUnreadCounts", totalfilteredUsers);

        res.json({
          success: true,
          message: "Chat message with image saved",
          newChat,
          imageUrl, 
          imageName: originalFileName,
          fileSize,
          roomId,
          readBy: [senderId],
        });
      });

      fileStream.end(req.file.buffer);
    } else {
      // กรณีไม่มีไฟล์
      newChat = new Chat({
        message,
        sender: sender._id,
        senderModel,
        roomId,
        readBy: [senderId],
      });

      await newChat.save();
      await newChat.populate("sender", "name surname");

      io.to(roomId).emit("receiveMessage", newChat);

      const updatedUsers = await User.find(
        { deletedAt: null },
        "name surname username"
      ).lean();

      const updatedMPersonnel = await MPersonnel.find(
        { deletedAt: null },
        "name surname username"
      ).lean();

      const rooms = await Room.find({
        "participants.id": { $in: updatedUsers.map((user) => user._id) },
      }).lean();

      const usersWithChats = await Promise.all(
        updatedUsers.map(async (user) => {
          const userRooms = rooms.filter((room) =>
            room.participants.some((p) => String(p.id) === String(user._id))
          );

          if (userRooms.length === 0) {
            return null;
          }

          let latestChat = null;
          let unreadCount = {};

          for (const room of userRooms) {
            // ดึงแชทล่าสุดในห้อง
            const roomLatestChat = await Chat.findOne({ roomId: room.roomId })
              .sort({ createdAt: -1 })
              .populate("sender", "name surname")
              .lean();

            if (roomLatestChat) {
              if (
                !latestChat ||
                new Date(roomLatestChat.createdAt) >
                  new Date(latestChat.createdAt)
              ) {
                latestChat = {
                  message: roomLatestChat.message,
                  file: roomLatestChat.image,
                  senderId: roomLatestChat.sender._id,
                  senderName: `${roomLatestChat.sender.name} ${roomLatestChat.sender.surname}`,
                  createdAt: roomLatestChat.createdAt,
                };
              }
            }

            // ดึงจำนวนข้อความที่ยังไม่ได้อ่านสำหรับทุก participants ในห้องนี้
            for (const participant of room.participants) {
              const unreadCounts = await Chat.countDocuments({
                roomId: room.roomId,
                readBy: { $ne: participant.id }, // ตรวจสอบว่าใครยังไม่ได้อ่าน
              });

              unreadCount[participant.id] = unreadCounts;
            }
          }

          return {
            _id: user._id,
            name: user.name,
            surname: user.surname,
            username: user.username,
            latestChat,
            unreadCount,
          };
        })
      );
      const filteredUsers = usersWithChats.filter((user) => user !== null);

      io.emit("usersUpdated", filteredUsers);

      // รวม User และ MPersonnel
      const allParticipants = [...updatedUsers, ...updatedMPersonnel];

      // ดึงข้อมูลห้องทั้งหมดที่ผู้ใช้และ MPersonnel เป็นสมาชิก
      const totalrooms = await Room.find({
        "participants.id": {
          $in: allParticipants.map((participant) => participant._id),
        },
      }).lean();

      // คำนวณ unread count สำหรับแต่ละผู้ใช้ในห้องนี้
      const usersWithUnreadCounts = await Promise.all(
        allParticipants.map(async (participant) => {
          // หาห้องที่ผู้ใช้อยู่
          const userRooms = totalrooms.filter((room) =>
            room.participants.some(
              (p) => String(p.id) === String(participant._id)
            )
          );

          if (userRooms.length === 0) {
            return null; // ถ้าผู้ใช้ไม่ได้อยู่ในห้องใดๆ ให้ข้ามไป
          }

          let unreadCount = {};

          // คำนวณ unread count สำหรับแต่ละห้องที่ผู้ใช้เป็นสมาชิก
          for (const room of userRooms) {
            const excludedUsers = await User.find({
              deletedAt: { $ne: null },
            }).lean();
            const excludedUserIds = excludedUsers.map((user) =>
              String(user._id)
            );

            // ถ้าห้องมี roomId ที่ตรงกับ excludedUserIds ให้ข้ามห้องนี้
            if (excludedUserIds.includes(String(room.roomId))) {
              continue;
            }

            const roomUnreadCount = await Chat.countDocuments({
              roomId: room.roomId,
              readBy: { $ne: participant._id }, // ตรวจสอบว่าแชทที่ยังไม่ได้อ่าน
            });

            unreadCount[room.roomId] = roomUnreadCount;
          }

          // คำนวณ total unread count สำหรับผู้ใช้
          const totalUnreadCount = Object.values(unreadCount).reduce(
            (acc, count) => acc + count,
            0
          );

          console.log(
            `📦 Total Unread Count for ${participant._id}:`,
            totalUnreadCount
          );

          return {
            userId: participant._id,
            unreadCount,
            totalUnreadCount,
          };
        })
      );

      // กรองเฉพาะผู้ใช้ที่มีข้อมูล (ไม่เป็น null)
      const totalfilteredUsers = usersWithUnreadCounts.filter(
        (user) => user !== null
      );
      console.log("รวม:", totalfilteredUsers);
      io.emit("TotalUnreadCounts", totalfilteredUsers);

      res.json({ success: true, message: "Chat message saved", newChat });
    }
  } catch (error) {
    console.error("Error saving chat message:", error);
    res
      .status(500)
      .json({ success: false, message: "Error saving chat message" });
  }
});



app.get("/getChatHistory/:roomId", async (req, res) => {
  try {
    const { roomId } = req.params;

    const chatHistory = await Chat.find({ roomId: roomId }) 
      .populate("sender", "name username surname") 
      .sort({ createdAt: 1 }); 
    if (!chatHistory || chatHistory.length === 0) {
      return res.json({
        success: true,
        message: "No chat history found for this roomId",
        chatHistory: [],
      });
    }

    res.json({ success: true, chatHistory });
  } catch (error) {
    console.error("Error fetching chat history:", error);
    res
      .status(500)
      .json({ success: false, message: "Error fetching chat history" });
  }
});

app.get("/users", async (req, res) => {
  try {
    const userId = req.query.senderId;
    const updatedUsers = await User.find(
      { deletedAt: null },
      "name surname username"
    ).lean();

    const rooms = await Room.find({
      "participants.id": { $in: updatedUsers.map((user) => user._id) },
    }).lean();

    const usersWithChats = await Promise.all(
      updatedUsers.map(async (user) => {
        const userRooms = rooms.filter((room) =>
          room.participants.some((p) => String(p.id) === String(user._id))
        );

        if (userRooms.length === 0) {
          return null;
        }

        let latestChat = null;
        let unreadCount = {};

        for (const room of userRooms) {
          // ดึงแชทล่าสุดในห้อง
          const roomLatestChat = await Chat.findOne({ roomId: room.roomId })
            .sort({ createdAt: -1 })
            .populate("sender", "name surname")
            .lean();

          if (roomLatestChat) {
            if (
              !latestChat ||
              new Date(roomLatestChat.createdAt) >
                new Date(latestChat.createdAt)
            ) {
              latestChat = {
                message: roomLatestChat.message,
                file: roomLatestChat.image,
                senderId: roomLatestChat.sender._id,
                senderName: `${roomLatestChat.sender.name} ${roomLatestChat.sender.surname}`,
                createdAt: roomLatestChat.createdAt,
              };
            }
          }

          // ดึงจำนวนข้อความที่ยังไม่ได้อ่านสำหรับทุก participants ในห้องนี้
          for (const participant of room.participants) {
            const unreadCounts = await Chat.countDocuments({
              roomId: room.roomId,
              readBy: { $ne: participant.id }, // ตรวจสอบว่าใครยังไม่ได้อ่าน
            });

            unreadCount[participant.id] = unreadCounts;
          }
        }

        return {
          _id: user._id,
          name: user.name,
          surname: user.surname,
          username: user.username,
          latestChat,
          unreadCount,
        };
      })
    );
    const filteredUsers = usersWithChats.filter((user) => user !== null);
    console.log("📦 Filtered Users with Chats777:", filteredUsers);
    res.json({ success: true, users: filteredUsers });
  } catch (error) {
    console.error("Error fetching users with chats:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching users with chats",
    });
  }
});


app.get("/update-unread-count", async (req, res) => {
  try {

    // ดึงข้อมูลผู้ใช้ที่ไม่ถูกลบ
    const updatedUsers = await User.find(
      { deletedAt: null },
      "name surname username"
    ).lean();

    // ดึงข้อมูล MPersonnel
    const updatedMPersonnel = await MPersonnel.find(
      { deletedAt: null },
      "name surname username"
    ).lean();

    // รวม User และ MPersonnel
    const allParticipants = [...updatedUsers, ...updatedMPersonnel];

    // ดึงข้อมูลห้องทั้งหมดที่ผู้ใช้และ MPersonnel เป็นสมาชิก
    const rooms = await Room.find({
      "participants.id": { $in: allParticipants.map((participant) => participant._id) },
    }).lean();

    // คำนวณ unread count สำหรับแต่ละผู้ใช้ในห้องนี้
    const usersWithUnreadCounts = await Promise.all(
      allParticipants.map(async (participant) => {
        // หาห้องที่ผู้ใช้อยู่
        const userRooms = rooms.filter((room) =>
          room.participants.some((p) => String(p.id) === String(participant._id))
        );

        if (userRooms.length === 0) {
          return null;  // ถ้าผู้ใช้ไม่ได้อยู่ในห้องใดๆ ให้ข้ามไป
        }

        let unreadCount = {};

        // คำนวณ unread count สำหรับแต่ละห้องที่ผู้ใช้เป็นสมาชิก
        for (const room of userRooms) {

          const excludedUsers = await User.find({ deletedAt: { $ne: null } }).lean();
          const excludedUserIds = excludedUsers.map((user) => String(user._id));
    
          // ถ้าห้องมี roomId ที่ตรงกับ excludedUserIds ให้ข้ามห้องนี้
          if (excludedUserIds.includes(String(room.roomId))) {
            continue;
          }

          const roomUnreadCount = await Chat.countDocuments({
            roomId: room.roomId,
            readBy: { $ne: participant._id }, // ตรวจสอบว่าแชทที่ยังไม่ได้อ่าน
          });

          unreadCount[room.roomId] = roomUnreadCount;
        }

        // คำนวณ total unread count สำหรับผู้ใช้
        const totalUnreadCount = Object.values(unreadCount).reduce(
          (acc, count) => acc + count,
          0
        );

        console.log(`📦 Total Unread Count for ${participant._id}:`, totalUnreadCount);

        return {
          userId: participant._id,
          unreadCount,
          totalUnreadCount,
        };
      })
    );

    // กรองเฉพาะผู้ใช้ที่มีข้อมูล (ไม่เป็น null)
    const filteredUsers = usersWithUnreadCounts.filter((user) => user !== null);
    console.log('📦 Users with Unread Counts:', filteredUsers);
    io.emit('updateUnreadCounts', filteredUsers);
    res.status(200).send({ success: true, users: filteredUsers });

  } catch (error) {
    console.error("Error updating unread count:", error);
    res.status(500).json({ success: false, message: "Error updating unread count" });
  }
});


app.get('/getUserById/:id', async (req, res) => {
  const { id } = req.params; // ดึง ID จาก URL

  try {
    const user = await User.findById(id); // ค้นหาผู้ใช้จาก ID
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json({ user }); // ส่งข้อมูลของผู้ใช้กลับไป
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// API สำหรับดึงข้อมูล MPersonnel ทั้งหมด
app.get('/getMPersonnelList', async (req, res) => {
  try {
    const personnelList = await MPersonnel.find({ deletedAt: null }); // สามารถเพิ่มเงื่อนไขที่ต้องการ
    res.json(personnelList);
  } catch (error) {
    console.error('Error fetching MPersonnel list:', error);
    res.status(500).json({ success: false, message: 'Error fetching MPersonnel list' });
  }
});

// ----------------

app.get('/alluserchat', async (req, res) => {
  try {
    const userId = req.query.userId;
    const users = await User.find({ deletedAt: null }).lean();

    const usersWithLastMessage = await Promise.all(
      users.map(async (user) => {
        const lastMessage = await Chat.findOne({
          $or: [{ sender: userId, recipient: user._id }, { sender: user._id, recipient: userId }],
        })
          .sort({ createdAt: -1 })
          .select('message createdAt sender senderModel isRead recipient image')
          .populate({
            path: 'sender recipient',
            select: 'name',
          })
          .lean();

        const unreadCount = await Chat.countDocuments({
          recipient: userId,
          sender: user._id,
          isRead: false,
        });

        return { ...user, lastMessage: lastMessage ? lastMessage : null, unreadCount };
      })
    );

    res.json({ data: usersWithLastMessage });
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.get('/lastmessage/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const loginUserId = req.query.loginUserId;
    const lastMessage = await Chat.findOne({
      $or: [
        { sender: userId, recipient: loginUserId },
        { sender: loginUserId, recipient: userId }
      ]
    })
      .sort({ createdAt: -1 })
      .select('message createdAt sender senderModel isRead recipient image')
      .populate({
        path: 'sender recipient',
        select: 'name',
      })
      .lean();

    res.json({ lastMessage: lastMessage ? lastMessage : null });
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
});


//รายชื่อ chat หมอ ที่ฝั่งผู้ป่วย
app.get("/allMpersonnelchat1", async (req, res) => {
  try {
    const userId = req.query.userId;
    const allMpersonnel = await MPersonnel.find({}).lean();

    const usersWithLastMessage = await Promise.all(
      allMpersonnel.map(async (user) => {
        const lastMessage = await Chat.findOne({
          $or: [{ sender: userId, recipient: user._id }, { sender: user._id, recipient: userId }],
        })
          .sort({ createdAt: -1 })
          .select('message createdAt sender senderModel isRead recipient image')
          .populate({
            path: 'sender recipient',
            select: 'name',
          })
          .lean();

        const unreadCount = await Chat.countDocuments({
          recipient: userId,
          sender: user._id,
          isRead: false,
        });

        return { ...user, lastMessage: lastMessage ? lastMessage : null, unreadCount };
      })
    );

    res.json({ data: usersWithLastMessage });
  } catch (error) {
    console.error("Error in /allMpersonnelchat1 endpoint:", error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// --------------------------------

//แดชบอร์ด
app.get("/diagnosis-count", async (req, res) => {
  try {
    const diagnosisCounts = await MedicalInformation.aggregate([
      { $group: { _id: "$Diagnosis", count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    res.json({ status: "ok", data: diagnosisCounts });
  } catch (error) {
    console.error("Error counting diagnosis:", error);
    res.json({ status: "error", message: "เกิดข้อผิดพลาดขณะนับ Diagnosis" });
  }
});

//ประเมินความพร้อม
app.post('/submitReadinessForm/:id', async (req, res) => {
  const { userId, Readiness1, Readiness2, status_name, MPersonnel } = req.body;

  try {
    const newReadinessForm = new ReadinessForm({
      user: userId,
      MPersonnel,
      Readiness1,
      Readiness2,
      status_name,
    });
    await newReadinessForm.save();
    res.status(201).json({ success: true, message: 'ReadinessForm saved successfully' });
  } catch (error) {
    console.error('Error saving ReadinessForm:', error);
    res.status(500).json({ success: false, message: 'Error saving ReadinessForm' });
  }
});


//เอาบันทึกคนนี้้มาทั้งหมด
app.get("/getpatientforms/:userId", async (req, res) => {
  const userId = req.params.userId;

  try {
    const patientForms = await PatientForm.find({ user: userId });
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


//เอาบันทึกของ user id มาทั้งหมด หน้าตารางบันทึกการประเมิน
app.get("/getReadinessForms/:userId", async (req, res) => {
  const userId = req.params.userId;

  try {
    const readinessForms = await ReadinessForm.find({ user: userId }).populate('MPersonnel');;
    res.send({ status: "ok", data: readinessForms });
  } catch (error) {
    console.error(error);
    res.send({ status: "error" });
  }
});

// ดึงข้อมูล ReadinessForm โดยใช้ ID
//คลิกที่การประเมินเพื่อดูรายละเอียด id ประเมินนี้
app.get('/getReadinessForm/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const readinessForm = await ReadinessForm.findById(id);

    if (!readinessForm) {
      return res.status(404).json({ success: false, message: 'ReadinessForm not found' });
    }

    res.status(200).json({ success: true, data: readinessForm });
  } catch (error) {
    console.error('Error fetching ReadinessForm:', error);
    res.status(500).json({ success: false, message: 'Error fetching ReadinessForm' });
  }
});

app.post('/addReadinessAssessment', async (req, res) => {
  const { readiness_status, detail, MPersonnel, ReadinessForm } = req.body;

  try {
    // Ensure that ReadinessForm ID is included in the new readiness assessment data
    await ReadinessAssessment.create({
      readiness_status,
      detail,
      MPersonnel,
      ReadinessForm,  // Include the form ID here
    });
    res.send({ status: "ok" });
  } catch (error) {
    if (error.code === 11000 && error.keyPattern.ReadinessForm) {
      res.status(400).send({ status: "error", message: "PatientForm already has an assessment." });
    } else {
      console.error(error);
      res.status(500).send({ status: "error", message: "An error occurred while adding assessment." });
    }
  }
});

//หน้าตารางการบันทึก
app.get("/allReadinessAssessment", async (req, res) => {
  try {
    const allReadinessAssessment = await ReadinessAssessment.find({});
    res.send({ status: "ok", data: allReadinessAssessment });
  } catch (error) {
    console.log(error);
  }
});

//หน้ารายละเอียดประเมินความพร้อมการดูแล
app.get("/allReadinessAssessments", async (req, res) => {
  try {
    const readinessAssessments = await ReadinessAssessment.find().populate('MPersonnel');
    res.send({ status: "ok", data: readinessAssessments });
  } catch (error) {
    console.log(error);
  }
});

// Example in Express.js
app.get('/completedAssessmentsCount', async (req, res) => {
  try {
    const completedCount = await Assessment.countDocuments({ status_name: "จบการรักษา" });
    res.json({ count: completedCount });
  } catch (error) {
    res.status(500).json({ error: 'Error fetching completed assessments count' });
  }
});

// const PORT = process.env.PORT || 5000;
//   server.listen(PORT, () => {
//     console.log('Server is running on port 5000');
//   });
server.listen(5000, () => {
  console.log('Server is running on port 5000');
});


app.post('/submitassessinhome/:id', async (req, res) => {
  const {
    userId,
    MPersonnel,
    Caregiver,
    status_inhome,
    Immobility,
    Nutrition,
    Housing,
    OtherPeople,
    Medication,
    PhysicalExamination,
    SSS,
  } = req.body;

  try {
    // ตรวจสอบว่า Caregiver Array มีข้อมูลหรือไม่
    if (!Caregiver || Caregiver.length === 0) {
      return res.status(400).json({ success: false, message: 'Caregiver array is required' });
    }

    // Map Caregiver IDs ไปยัง existingCaregivers
    const updatedExistingCaregivers = Caregiver.map((caregiver, index) => {
      const caregiverId = typeof caregiver === 'object' ? caregiver.CaregiverId || caregiver : caregiver;

      return {
        CaregiverId: caregiverId,
        firstName: caregiver.name || OtherPeople?.existingCaregivers?.[index]?.firstName || "",
        lastName: caregiver.surname || OtherPeople?.existingCaregivers?.[index]?.lastName || "",
        birthDate: OtherPeople?.existingCaregivers?.[index]?.birthDate || "",
        role: OtherPeople?.existingCaregivers?.[index]?.role || "",
        occupation: OtherPeople?.existingCaregivers?.[index]?.occupation || "",
        status: OtherPeople?.existingCaregivers?.[index]?.status || "",
        education: OtherPeople?.existingCaregivers?.[index]?.education || "",
        income: OtherPeople?.existingCaregivers?.[index]?.income || "",
        benefit: OtherPeople?.existingCaregivers?.[index]?.benefit || "",
        ud: OtherPeople?.existingCaregivers?.[index]?.ud || "",
        habit: OtherPeople?.existingCaregivers?.[index]?.habit || "",
        careDetails: OtherPeople?.existingCaregivers?.[index]?.careDetails || "",
        isNew: false,
      };
    });

    // เพิ่ม Caregiver ใหม่
    const newCaregivers = OtherPeople?.newCaregivers?.map((caregiver) => ({
      firstName: caregiver.firstName,
      lastName: caregiver.lastName,
      birthDate: caregiver.birthDate,
      role: caregiver.role,
      occupation: caregiver.occupation,
      status: caregiver.status,
      education: caregiver.education,
      income: caregiver.income,
      benefit: caregiver.benefit,
      ud: caregiver.ud,
      habit: caregiver.habit,
      careDetails: caregiver.careDetails,
      isNew: true,
    })) || [];

    // ปรับปรุงโครงสร้าง PhysicalExamination ให้รองรับ isOther
    const updatedPhysicalExamination = {};
    Object.keys(PhysicalExamination).forEach((key) => {
      if (Array.isArray(PhysicalExamination[key])) {
        // แปลงข้อมูลเป็นรูปแบบที่รองรับ isOther
        updatedPhysicalExamination[key] = PhysicalExamination[key].map((item) => {
          if (typeof item === 'string') {
            if (item.startsWith("อื่นๆ:")) {
              return {
                value: item.replace("อื่นๆ: ", "").trim(),
                isOther: true,
              };
            } else {
              return {
                value: item,
                isOther: false,
              };
            }
          } else if (typeof item === 'object' && item.value) {
            // หากเป็น object อยู่แล้ว
            return item;
          }
          return null;
        }).filter((item) => item); // ลบค่าที่ไม่ใช้งานออก
      } else {
        updatedPhysicalExamination[key] = PhysicalExamination[key];
      }
    });

    const newAssessinhomesss = new Assessinhomesss({
      user: userId,
      MPersonnel,
      Caregiver,
      Immobility,
      Nutrition,
      Housing,
      OtherPeople: {
        existingCaregivers: updatedExistingCaregivers,
        newCaregivers: newCaregivers,
      },
      Medication,
      PhysicalExamination: updatedPhysicalExamination,
      SSS,
      status_inhome,
    });

    await newAssessinhomesss.save();
    res.status(201).json({ success: true, message: 'Assessinhomesss saved successfully' });
  } catch (error) {
    console.error('Error saving Assessinhomesss:', error);
    res.status(500).json({ success: false, message: 'Error saving Assessinhomesss', error: error.message });
  }
});


//เอาบันทึกของ user id มาทั้งหมด หน้าตารางบันทึกการประเมิน
app.get("/getAssessinhomeForms/:userId", async (req, res) => {
  const userId = req.params.userId;

  try {
    const assessinhomeForms = await Assessinhomesss.find({ user: userId }).populate('MPersonnel');;
    res.send({ status: "ok", data: assessinhomeForms });
  } catch (error) {
    console.error(error);
    res.send({ status: "error" });
  }
});


// ดึงข้อมูล ReadinessForm โดยใช้ ID
//คลิกที่การประเมินเพื่อดูรายละเอียด id ประเมินนี้
app.get('/getAssessinhomeForm/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const AssessinhomesssForm = await Assessinhomesss.findById(id);

    if (!AssessinhomesssForm) {
      return res.status(404).json({ success: false, message: 'AssessinhomesssForm not found' });
    }

    res.status(200).json({ success: true, data: AssessinhomesssForm });
  } catch (error) {
    console.error('Error fetching AssessinhomesssForm:', error);
    res.status(500).json({ success: false, message: 'Error fetching AssessinhomesssForm' });
  }
});

//แก้ไข inhomesss
app.post('/updateAssessinhomesss/:id', async (req, res) => {
  try {
      const { id } = req.params;
      const updateData = req.body;

      // ค้นหาและอัปเดตข้อมูลในฐานข้อมูล
      const updatedAssessinhomesss = await Assessinhomesss.findByIdAndUpdate(
          id,
          { $set: updateData },
          { new: true } // คืนค่าเอกสารที่อัปเดตแล้ว
      );

      if (!updatedAssessinhomesss) {
          return res.status(404).json({ message: 'Assessinhomesss not found' });
      }

      res.status(200).json({ message: 'Assessinhomesss updated successfully', data: updatedAssessinhomesss });
  } catch (error) {
      console.error('Error updating Assessinhomesss:', error);
      res.status(500).json({ message: 'Internal server error', error: error.message });
  }
});

app.post('/submitagenda/:id', async (req, res) => {
  const { userId, MPersonnel, Caregiver, newCaregivers, status_agenda, PatientAgenda, CaregiverAgenda, CaregiverAssessment, Zaritburdeninterview } = req.body;

  console.log("Received newCaregivers:", newCaregivers); // ตรวจสอบว่าได้รับ newCaregivers หรือไม่

  try {
    // สร้างเอกสาร Agenda ใหม่
    const newAgenda = new Agenda({
      user: userId,
      MPersonnel,
      Caregiver,
      newCaregivers, // บันทึก newCaregivers ที่ได้รับ
      PatientAgenda,
      CaregiverAgenda,
      CaregiverAssessment,
      Zaritburdeninterview,
      status_agenda,
    });

    await newAgenda.save();
    res.status(201).json({ success: true, message: 'Agenda saved successfully', agenda: newAgenda });
  } catch (error) {
    console.error('Error saving Agenda:', error);
    res.status(500).json({ success: false, message: 'Error saving Agenda' });
  }
});

app.get('/getAgendaForm/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const agendaForm = await Agenda.findById(id);

    if (!agendaForm) {
      return res.status(404).json({ success: false, message: 'agendaForm not found' });
    }

    res.status(200).json({ success: true, data: agendaForm });
  } catch (error) {
    console.error('Error fetching agendaForm:', error);
    res.status(500).json({ success: false, message: 'Error fetching agendaForm' });
  }
});

app.get("/getAgendaForms/:userId", async (req, res) => {
  const userId = req.params.userId;

  try {
    const agendaForms = await Agenda.find({ user: userId }).populate('MPersonnel');;
    res.send({ status: "ok", data: agendaForms });
  } catch (error) {
    console.error(error);
    res.send({ status: "error" });
  }
});
//แก้ไข inhomesss
app.post('/updateAgenda/:id', async (req, res) => {
  try {
      const { id } = req.params;
      const updateData = req.body;

      // ค้นหาและอัปเดตข้อมูลในฐานข้อมูล
      const updatedAgenda = await Agenda.findByIdAndUpdate(
          id,
          { $set: updateData },
          { new: true } // คืนค่าเอกสารที่อัปเดตแล้ว
      );

      if (!updatedAgenda) {
          return res.status(404).json({ message: 'Agenda not found' });
      }

      res.status(200).json({ message: 'Agenda updated successfully', data: updatedAgenda });
  } catch (error) {
      console.error('Error updating Agenda:', error);
      res.status(500).json({ message: 'Internal server error', error: error.message });
  }
});

//ดึงชื่อนามสกุลผู้ดูแลในประเมินเยี่ยมบ้าน
app.get('/getcaregivers/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const caregivers = await Caregiver.find({ user: userId }, 'name surname');

    // ใช้ Map กรองข้อมูลซ้ำ
    const uniqueCaregivers = Array.from(new Map(
      caregivers.map(item => [`${item.name} ${item.surname}`, item])
    ).values());

    res.status(200).json({
      status: 'ok',
      data: uniqueCaregivers,
    });
  } catch (error) {
    console.error("Error fetching caregivers:", error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch caregivers.',
    });
  }
});

//ดึงชื่อผู้ดูแลมาแสดงหน้า Agenda
app.get('/getCaregiverstoAgenda/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    // ดึงข้อมูล Caregiver ของ User นี้
    const caregivers = await Caregiver.find({ user: userId }, 'id name surname');

    // กรอง Caregiver ที่ชื่อ-นามสกุลซ้ำ
    const uniqueCaregivers = Array.from(new Map(
      caregivers.map(item => [`${item.name} ${item.surname}`, item])
    ).values());

    res.status(200).json({
      status: 'ok',
      data: uniqueCaregivers,
    });
  } catch (error) {
    console.error("Error fetching caregivers:", error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch caregivers.',
    });
  }
});


//ดึง caregiver ทั้งหมดที่มี เพื่อบันทึกลงอีกตาราง
app.get('/getCaregiversByUser/:userId', async (req, res) => {
  const userId = req.params.userId; // รับ userId จาก URL parameter

  try {
    // ค้นหา Caregiver ที่เกี่ยวข้องกับ userId
    const caregivers = await Caregiver.find({ user: userId }, '_id');

    // ตรวจสอบว่าพบข้อมูลหรือไม่
    if (!caregivers || caregivers.length === 0) {
      return res.status(404).json({ status: 'error', message: 'No caregivers found for this user.' });
    }

    // ส่งคืน ID ของ Caregiver ทั้งหมด
    res.status(200).json({
      status: 'ok',
      data: caregivers.map((caregiver) => caregiver._id),
    });
  } catch (error) {
    console.error('Error fetching caregivers:', error);
    res.status(500).json({ status: 'error', message: 'Internal Server Error', error: error.message });
  }
});

//Agenda
app.get('/getcaregivesotherpeople/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    // ค้นหาเอกสารทั้งหมดที่เกี่ยวข้องกับ userId
    const users = await Assessinhomesss.find({ user: userId }).lean();

    if (!users || users.length === 0) {
      return res.status(404).json({ status: 'error', message: 'User not found' });
    }

    // รวมข้อมูล newCaregivers จากทุกเอกสาร
    const newCaregivers = users.flatMap((user) =>
      user?.OtherPeople?.newCaregivers?.map((caregiver) => ({
        id: caregiver?._id,
        firstName: `${caregiver?.firstName || 'Unknown'} `,
        lastName: `${caregiver?.lastName || 'Unknown'}`,
      })) || []
    );

    res.status(200).json({
      status: 'ok',
      data: newCaregivers,
    });
  } catch (error) {
    console.error('Error fetching new caregivers:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch new caregivers',
      error: error.message,
    });
  }
});


//home

app.get("/immobility/group3", async (req, res) => {
  try {
    const data = await Assessinhomesss.find({
      "Immobility.totalScore": { $gte: 36, $lte: 48 }, // เงื่อนไขสำหรับกลุ่มที่ 3
    }).populate("user"); // ดึงข้อมูล user เพิ่มเติม (ถ้าต้องการ)

    res.status(200).json({ data });
  } catch (error) {
    console.error("Error fetching group 3 data:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});