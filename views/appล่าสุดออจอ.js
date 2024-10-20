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

const http = require('http');
const socketIo = require('socket.io');
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: ["http://localhost:3000", "http://192.168.2.57:8081","http://localhost:3001"], // ให้แน่ใจว่าใส่ URL ของ front-end app
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
const Assessreadiness = mongoose.model("Assessreadiness")
const OTPModel = mongoose.model("OTPModel")
const OTPModelUser = mongoose.model("OTPModelUser")

app.post("/addadmin", async (req, res) => {
  const { username, name,surname, email, password, confirmPassword } = req.body;
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

// app.post('/verify-otp1', async (req, res) => {
//   try {
//     const { username, otp, newEmail } = req.body;

//     // ตรวจสอบ OTP จากฐานข้อมูล
//     const otpRecord = await OTPModel.findOne({ username }).sort({ createdAt: -1 });

//     if (!otpRecord) {
//       return res.status(400).json({ error: 'OTP not found' });
//     }

//     // ตรวจสอบความถูกต้องของ OTP และอายุ OTP
//     const currentTime = Date.now();
//     const otpCreationTime = new Date(otpRecord.createdAt).getTime(); // แปลงเป็น timestamp
//     const isOtpValid = otpRecord.otp === otp && (currentTime - otpCreationTime) < 10 * 60 * 1000; // อายุ OTP 10 นาที

//     if (!isOtpValid) {
//       return res.status(400).json({ error: 'Invalid or expired OTP' });
//     }

//     // ตรวจสอบอีเมลใหม่ในฐานข้อมูล
//     const existingUser = await Admins.findOne({ email: newEmail });
//     if (existingUser) {
//       return res.status(400).json({ error: 'อีเมลนี้มีผู้ใช้แล้ว' });
//     }

//     // อัปเดตสถานะการยืนยันอีเมลและอีเมลของผู้ใช้
//     await Admins.updateOne({ username }, { $set: { isEmailVerified: true, email: newEmail } });

//     // ลบ OTP หลังจากการยืนยันเสร็จสมบูรณ์
//     await OTPModel.deleteMany({ username });

//     res.status(200).json({ success: true, message: 'Email verified and updated successfully' });
//   } catch (error) {
//     console.error('Error:', error);
//     res.status(500).json({ error: 'Internal server error' });
//   }
// });

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
// app.post("/profile", (req, res) => {
//   const refreshToken = req.cookies.refreshToken;
//   if (!refreshToken || !refreshTokens.includes(refreshToken)) {
//     return res.sendStatus(403);
//   }

//   jwt.verify(refreshToken, JWT_REFRESH_SECRET, (err, user) => {
//     if (err) {
//       return res.sendStatus(403);
//     }
//     const accessToken = jwt.sign({ username: user.username }, JWT_SECRET, {
//       expiresIn: "15m",
//     });
//     res.json({ accessToken });
//   });
// });

app.post("/logout", (req, res) => {
  const refreshToken = req.cookies.refreshToken;
  refreshTokens = refreshTokens.filter(token => token !== refreshToken);
  res.clearCookie('refreshToken');
  res.sendStatus(204);
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
// app.post("/addcaremanual", upload, async (req, res) => {
//   const { caremanual_name, detail } = req.body;

//   if (!caremanual_name) {
//     return res.json({ error: "กรุณากรอกหัวข้อ และเลือกรูปภาพ" });
//   }

//   try {
//     let imagename = "";
//     let filename = "";

//     if (req.files["image"] && req.files["image"][0]) {
//       imagename = req.files["image"][0].filename;
//     }

//     if (req.files["file"] && req.files["file"][0]) {
//       filename = req.files["file"][0].filename;
//     }

//     await Caremanual.create({
//       caremanual_name,
//       image: imagename,
//       file: filename,
//       detail,
//     });
//     res.json({ status: "ok" });
//   } catch (error) {
//     res.json({ status: error });
//   }
// });

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

    // Initializing file variables
    let filePresent = "";
    let fileManage = "";
    let filePhychosocial = "";

    // Upload fileP to Firebase Storage
    if (req.files["fileP"] && req.files["fileP"][0]) {
      const file = req.files["fileP"][0];
      const fileName = Date.now() + '-' + file.originalname;
      const fileRef = bucket.file(fileName);
      const fileStream = fileRef.createWriteStream({
        metadata: { contentType: file.mimetype },
      });

      fileStream.end(file.buffer);
      await new Promise((resolve, reject) => {
        fileStream.on('finish', () => {
          filePresent = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(fileName)}?alt=media`;
          resolve();
        });
        fileStream.on('error', reject);
      });
    }

    // Upload fileM to Firebase Storage
    if (req.files["fileM"] && req.files["fileM"][0]) {
      const file = req.files["fileM"][0];
      const fileName = Date.now() + '-' + file.originalname;
      const fileRef = bucket.file(fileName);
      const fileStream = fileRef.createWriteStream({
        metadata: { contentType: file.mimetype },
      });

      fileStream.end(file.buffer);
      await new Promise((resolve, reject) => {
        fileStream.on('finish', () => {
          fileManage = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(fileName)}?alt=media`;
          resolve();
        });
        fileStream.on('error', reject);
      });
    }

    // Upload filePhy to Firebase Storage
    if (req.files["filePhy"] && req.files["filePhy"][0]) {
      const file = req.files["filePhy"][0];
      const fileName = Date.now() + '-' + file.originalname;
      const fileRef = bucket.file(fileName);
      const fileStream = fileRef.createWriteStream({
        metadata: { contentType: file.mimetype },
      });

      fileStream.end(file.buffer);
      await new Promise((resolve, reject) => {
        fileStream.on('finish', () => {
          filePhychosocial = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(fileName)}?alt=media`;
          resolve();
        });
        fileStream.on('error', reject);
      });
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

// app.post("/updatecaremanual/:id", upload, async (req, res) => {
//   const { caremanual_name, detail } = req.body;
//   const { id } = req.params;

//   try {
//     let imagename = "";
//     let filename = "";


//     if (req.files["image"] && req.files["image"][0]) {
//       imagename = req.files["image"][0].filename;
//     }
//     if (req.files["file"] && req.files["file"][0]) {
//       filename = req.files["file"][0].filename;
//     }
//     if (imagename !== "") {
//       const updatedWithImage = await Caremanual.findByIdAndUpdate(
//         id,
//         {
//           caremanual_name,
//           image: imagename,
//           file: filename,
//           detail,
//         },
//         { new: true }
//       );

//       if (!updatedWithImage) {
//         return res.status(404).json({ status: "Caremanual not found" });
//       }

//       res.json({ status: "ok", updatedCaremanual: updatedWithImage });
//     } else {
//       const oleCaremanual = await Caremanual.findById(id);

//       if (!oleCaremanual) {
//         return res.status(404).json({ status: "Caremanual not found" });
//       }

//       let existingFilename = "";
//       if (filename !== "") {
//         existingFilename = filename;
//       } else {
//         existingFilename = oleCaremanual.file;
//       }

//       const updatedWithoutFile = await Caremanual.findByIdAndUpdate(
//         id,
//         {
//           caremanual_name,
//           image: oleCaremanual.image,
//           file: existingFilename,
//           detail,
//         },
//         { new: true }
//       );

//       res.json({ status: "ok", updatedCaremanual: updatedWithoutFile });
//     }
//   } catch (error) {
//     res.json({ status: error });
//   }
// });

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
      expiresIn: "30d",
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

    // รวมชื่อและนามสกุลเป็นฟิลด์เดียวชั่วคราวสำหรับการค้นหา
    const result = await MPersonnel.aggregate([
      {
        $addFields: {
          fullname: { $concat: ["$nametitle","$name", " ", "$surname"] }
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
// app.post("/adduser", async (req, res) => {
//   const {
//     username,
//     name,
//     email,
//     password,
//     confirmPassword,
//     tel,
//     gender,
//     birthday,
//     ID_card_number,
//     nationality,
//     Address,
//   } = req.body;
//   if (!username || !password || !email || !name) {
//     return res.json({
//       error: "กรุณากรอกชื่อผู้ใช้ รหัสผ่าน อีเมล และชื่อ-นามสกุล",
//     });
//   }
//   const encryptedPassword = await bcrypt.hash(password, 10);
//   try {
//     const oldUser = await User.findOne({ username });
//     //ชื่อมีในระบบไหม
//     if (oldUser) {
//       return res.json({ error: "มีชื่อผู้ใช้นี้อยู่ในระบบแล้ว" });
//     }

//     if (password !== confirmPassword) {
//       return res.json({ error: "รหัสผ่านไม่ตรงกัน" });
//     }
//     await User.create({
//       username,
//       name,
//       email,
//       password: encryptedPassword,
//       tel,
//       gender,
//       birthday,
//       ID_card_number,
//       nationality,
//       Address,
//     });
//     res.send({ status: "ok" });
//   } catch (error) {
//     res.send({ status: "error" });
//   }
// });

//แบบซ้ำกับที่ลบไปแล้วไม่ได้
// app.post("/adduser", async (req, res) => {
//   const { username, name, surname, tel } = req.body;

//   if (!username || !tel || !name || !surname) {
//     return res.json({
//       error: "กรุณากรอกเลขประจำตัวประชาชน เบอร์โทรศัพท์ ชื่อและนามสกุล",
//     });
//   }

//   const encryptedPassword = await bcrypt.hash(tel, 10);

//   try {
//     const oldUser = await User.findOne({ username });
//     if (oldUser) {
//       return res.json({ error: "มีชื่อผู้ใช้นี้อยู่ในระบบแล้ว" });
//     }
//     await User.create({
//       username,
//       name,
//       surname,
//       password: encryptedPassword,
//       tel,
//     });
//     res.send({ status: "ok" });
//   } catch (error) {
//     console.error("Error creating user:", error);
//     res.send({ status: "error", error: error.message });
//   }
// });

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
    const user = await User.findOne({ username:username });

    if (!user) {
      return res.status(404).json({ error: "ยังไม่มีบัญชีผู้ใช้นี้" });
    }

    if (user.deletedAt) {
      return res.status(410).json({ error: "ยังไม่มีบัญชีผู้ใช้นี้" });
    }

    if (await bcrypt.compare(password, user.password)) {
      const token = jwt.sign({ username: user.username }, JWT_SECRET,{ expiresIn: "30d" });
      return res.status(201).send({ 
        status: "ok", 
        data: token, 
        addDataFirst: user.AdddataFirst ,
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
    user, // id ของ user ที่จะใช้อัพเดต caregiver
    Relationship,
    caregivername,
    caregiversurname,
    caregivertel,
  } = req.body;

  try {
    if (username) {
      // แก้ไขข้อมูลของ User
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
            AdddataFirst: true,
          },
        }
      );

      // ตรวจสอบว่ามี Caregiver อยู่แล้วหรือไม่
      const caregiver = await Caregiver.findOne({ user });
      if (caregiver) {
        // แก้ไขข้อมูลของ Caregiver ที่มีอยู่แล้ว
        await Caregiver.updateOne(
          { user },
          {
            $set: {
              name: caregivername,
              surname: caregiversurname,
              tel: caregivertel,
              Relationship,
            },
          }
        );
        res.send({ status: 'Ok', data: 'User and Caregiver Updated' });
      } else {
        // สร้าง Caregiver ใหม่หากไม่พบ
        await Caregiver.create({
          user,
          name: caregivername,
          surname: caregiversurname,
          tel: caregivertel,
          Relationship,
        });
        res.send({ status: 'Ok', data: 'User Updated, Caregiver Created' });
      }
    } else {
      res.status(400).send({ error: 'Invalid request data' });
    }
  } catch (error) {
    console.error('Error updating user or caregiver:', error);
    return res.status(500).send({ error: 'Error updating user or caregiver' });
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

    await OTPModelUser.deleteMany({ email});
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


const threshold = {
  SBP: { min: 90, max: 140 },
  DBP: { min: 60, max: 90 },
  PulseRate: { min: 60, max: 100 },
  Temperature: { min: 36.5, max: 37.5 },
  DTX: { min: 70, max: 110 },
  Respiration: { min: 16, max: 20 }
};

app.post("/update-threshold", async (req, res) => {
  const { userId, min, max } = req.body;
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
        }
      });
    }
  } catch (error) {
    console.error('Error retrieving threshold:', error);
    res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
});

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

    let alerts = [];

    if (SBP && SBP.trim() !== '') {
      const SBPValue = parseFloat(SBP);
      if (SBPValue < thresholds.SBP.min || SBPValue > thresholds.SBP.max) {
        alerts.push("ความดันตัวบน");
      }
    }

    if (DBP && DBP.trim() !== '') {
      const DBPValue = parseFloat(DBP);
      if (DBPValue < thresholds.DBP.min || DBPValue > thresholds.DBP.max) {
        alerts.push("ความดันตัวล่าง");
      }
    }

    if (PulseRate && PulseRate.trim() !== '') {
      const PulseRateValue = parseFloat(PulseRate);
      if (PulseRateValue < thresholds.PulseRate.min || PulseRateValue > thresholds.PulseRate.max) {
        alerts.push("ชีพจร");
      }
    }

    if (Temperature && Temperature.trim() !== '') {
      const TemperatureValue = parseFloat(Temperature);
      if (TemperatureValue < thresholds.Temperature.min || TemperatureValue > thresholds.Temperature.max) {
        alerts.push("อุณหภูมิ");
      }
    }

    if (DTX && DTX.trim() !== '') {
      const DTXValue = parseFloat(DTX);
      if (DTXValue < thresholds.DTX.min || DTXValue > thresholds.DTX.max) {
        alerts.push("ระดับน้ำตาลในเลือด");
      }
    }

    if (Respiration && Respiration.trim() !== '') {
      const RespirationValue = parseFloat(Respiration);
      if (RespirationValue < thresholds.Respiration.min || RespirationValue > thresholds.Respiration.max) {
        alerts.push("การหายใจ");
      }
    }

    if (alerts.length > 0) {
      const alertMessage = `ค่า ${alerts.join(', ')} มีความผิดปกติ`;
      await Alert.create({ patientFormId: patientForm._id, alertMessage, user });
    
      io.emit('newAlert', { alertMessage, patientFormId: patientForm._id });

    }

    res.send({ status: "ok", patientForm });
  } catch (error) {
    console.error(error);
    res.status(500).send({ status: "error", message: error.message });
  }
});


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
    };

    Object.keys(updatedFields).forEach(key => updatedFields[key] === undefined && delete updatedFields[key]);

    const patientForm = await PatientForm.findByIdAndUpdate(id, updatedFields, { new: true });

    if (!patientForm) {
      return res.status(404).send({ status: "error", message: "Patient form not found" });
    }

    const userThreshold = await UserThreshold.findOne({ user });
    const thresholds = userThreshold || threshold;

    let alerts = [];

    const isString = value => typeof value === 'string';

    if (SBP && isString(SBP) && SBP.trim() !== '') {
      const SBPValue = parseFloat(SBP);
      if (SBPValue < thresholds.SBP.min || SBPValue > thresholds.SBP.max) {
        alerts.push("ความดันตัวบน");
      }
    }

    if (DBP && isString(DBP) && DBP.trim() !== '') {
      const DBPValue = parseFloat(DBP);
      if (DBPValue < thresholds.DBP.min || DBPValue > thresholds.DBP.max) {
        alerts.push("ความดันตัวล่าง");
      }
    }

    if (PulseRate && isString(PulseRate) && PulseRate.trim() !== '') {
      const PulseRateValue = parseFloat(PulseRate);
      if (PulseRateValue < thresholds.PulseRate.min || PulseRateValue > thresholds.PulseRate.max) {
        alerts.push("ชีพจร");
      }
    }

    if (Temperature && isString(Temperature) && Temperature.trim() !== '') {
      const TemperatureValue = parseFloat(Temperature);
      if (TemperatureValue < thresholds.Temperature.min || TemperatureValue > thresholds.Temperature.max) {
        alerts.push("อุณหภูมิ");
      }
    }

    if (DTX && isString(DTX) && DTX.trim() !== '') {
      const DTXValue = parseFloat(DTX);
      if (DTXValue < thresholds.DTX.min || DTXValue > thresholds.DTX.max) {
        alerts.push("ระดับน้ำตาลในเลือด");
      }
    }

    if (Respiration && isString(Respiration) && Respiration.trim() !== '') {
      const RespirationValue = parseFloat(Respiration);
      if (RespirationValue < thresholds.Respiration.min || RespirationValue > thresholds.Respiration.max) {
        alerts.push("การหายใจ");
      }
    }

    if (alerts.length > 0) {
      const alertMessage = `มีการแก้ไขการบันทึก แล้วค่า ${alerts.join(', ')} มีความผิดปกติ`;
      await Alert.create({ patientFormId: patientForm._id, alertMessage, user });
      
      io.emit('newAlert', { alertMessage, patientFormId: patientForm._id });

    }

    res.send({ status: "ok", patientForm });
  } catch (error) {
    console.error(error);
    res.status(500).send({ status: "error", message: error.message });
  }
});

app.get("/alerts", async (req, res) => {
  try {
    const alerts = await Alert.find().populate('user', 'name surname').sort({ createdAt: -1 });
    res.json({ alerts });
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
app.get("/getDTXData/:userId/:formId", async (req, res) => {
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



// app.get("/getDTXData/:userId/:formId", async (req, res) => {
//   const { userId, formId } = req.params;

//   try {
//     const patientForms = await PatientForm.find({ user: userId })
//       .populate('user')
//       .sort({ createdAt: -1 }); 
//     const dtxData = [];
//     for (const form of patientForms) {
//       dtxData.push({
//         name: form.user.name,
//         DTX: form.DTX,
//         createdAt: form.createdAt
//       });
//       if (form._id.toString() === formId) break;
//     }

//     res.send({ status: "ok", data: dtxData.reverse() });
//   } catch (error) {
//     console.error("Error fetching DTX data:", error);
//     res.send({ status: "error" });
//   }
// });


app.get("/getPainscoreData/:userId/:formId", async (req, res) => {
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


app.get("/getTemperatureData/:userId/:formId", async (req, res) => {
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

    const TemperatureData = patientForms.map(form => ({
      name: form.user.name,
      Temperature: form.Temperature,
      createdAt: form.createdAt
    })).reverse();

    res.send({ status: "ok", data: TemperatureData });
  } catch (error) {
    console.error("Error fetching Temperature data:", error);
    res.send({ status: "error" });
  }
});


// app.get("/getBloodPressureData/:userId", async (req, res) => {
//   const userId = req.params.userId;

//   try {
//     const patientForms = await PatientForm.find({ user: userId })
//       .populate('user')
//       .sort({ createdAt: -1 }) // เรียงลำดับตาม createdAt จากใหม่สุดไปเก่าสุด
//       // .limit(7); 

//     const  BloodPressureData = patientForms.map(form => ({ 
//       name: form.user.name, 
//       BloodPressure: form.BloodPressure,
//       createdAt: form.createdAt 
//     })).reverse(); 

//     res.send({ status: "ok", data: BloodPressureData });
//   } catch (error) {
//     console.error("Error fetching  SBP data:", error);
//     res.send({ status: "error" });
//   }
// });

app.get("/getBloodPressureData/:userId/:formId", async (req, res) => {
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

    const bloodPressureData = patientForms.map(form => ({
      name: form.user.name,
      SBP: form.SBP,
      DBP: form.DBP,
      createdAt: form.createdAt
    })).reverse();

    res.send({ status: "ok", data: bloodPressureData });
  } catch (error) {
    console.error("Error fetching SBP data:", error);
    res.send({ status: "error" });
  }
});


app.get("/getPulseRateData/:userId/:formId", async (req, res) => {
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


app.get("/getRespirationData/:userId/:formId", async (req, res) => {
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

    const RespirationData = patientForms.map(form => ({
      name: form.user.name,
      Respiration: form.Respiration,
      createdAt: form.createdAt
    })).reverse();

    res.send({ status: "ok", data: RespirationData });
  } catch (error) {
    console.error("Error fetching  Respiration data:", error);
    res.send({ status: "error" });
  }
});
//ประเมิน แบบไม่แจ้งเตือน
// app.post("/addassessment", async (req, res) => {
//   const { suggestion, detail, status_name, PPS, MPersonnel, PatientForm } = req.body;
//   try {
//     await Assessment.create({
//       suggestion, detail, status_name, PPS, MPersonnel, PatientForm,
//     });
//     res.send({ status: "ok" });
//   } catch (error) {
//     if (error.code === 11000 && error.keyPattern.PatientForm) {
//       res.status(400).send({ status: "error", message: "PatientForm already has an assessment." });
//     } else {
//       console.error(error);
//       res.status(500).send({ status: "error", message: "An error occurred while adding assessment." });
//     }
//   }
// });

//แบบไม่มีชื่อผู้ประเมิน
app.post("/addassessment", async (req, res) => {
  const { suggestion, detail, status_name, PPS, MPersonnel, PatientForm: patientFormId } = req.body;

  try {
    const patientForm = await PatientForm.findById(patientFormId).populate('user').exec();

    if (!patientForm) {
      return res.status(404).send({ status: "error", message: "PatientForm not found." });
    }

    if (status_name === 'เคสฉุกเฉิน') {
      const alertMessage = `เป็นเคสฉุกเฉิน`;

      await Alert.create({
        patientFormId: patientForm._id,
        alertMessage,
        user: patientForm.user._id 
      });
    }

    await Assessment.create({
      suggestion, detail, status_name, PPS, MPersonnel, PatientForm: patientForm._id,
    });

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
// แบบมีชื่อผู้ประเมิน
// app.post("/addassessment", async (req, res) => {
//   const { suggestion, detail, status_name, PPS, MPersonnel: mPersonnelId, PatientForm: patientFormId } = req.body;

//   try {
//     const patientForm = await PatientForm.findById(patientFormId).populate('user').exec();

//     if (!patientForm) {
//       return res.status(404).send({ status: "error", message: "PatientForm not found." });
//     }

//     const mPersonnel = await MPersonnel.findById(mPersonnelId).exec();

//     if (!mPersonnel) {
//       return res.status(404).send({ status: "error", message: "MPersonnel not found." });
//     }

//     // Prepare the alert message including MPersonnel name
//     if (status_name === 'เคสฉุกเฉิน') {
//       const alertMessage = `เป็นเคสฉุกเฉิน\n
//       ผู้ประเมิน: ${mPersonnel.nametitle}${mPersonnel.name} ${mPersonnel.surname}`;

//       await Alert.create({
//         patientFormId: patientForm._id,
//         alertMessage,
//         user: patientForm.user._id 
//       });
//     }

//     await Assessment.create({
//       suggestion,
//       detail,
//       status_name,
//       PPS,
//       MPersonnel: mPersonnel._id, 
//       PatientForm: patientForm._id,
//     });

//     res.send({ status: "ok" });
//   } catch (error) {
//     console.error("Error:", error);
//     if (error.code === 11000 && error.keyPattern.PatientForm) {
//       res.status(400).send({ status: "error", message: "PatientForm already has an assessment." });
//     } else {
//       res.status(500).send({ status: "error", message: "An error occurred while adding assessment." });
//     }
//   }
// });




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
  const { name,surname } = req.body;
  const id = req.params.id;
  try {
    // อัปเดตชื่อของ admin
    // const admin = await Admins.findById(id);
    await Admins.findByIdAndUpdate(id, { name,surname  });

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

    const bucket = admin.storage().bucket();

    // Upload fileP to Firebase Storage (if exists)
    if (req.files["fileP"] && req.files["fileP"][0]) {
      const file = req.files["fileP"][0];
      const fileName = Date.now() + '-' + file.originalname;
      const fileRef = bucket.file(fileName);
      const fileStream = fileRef.createWriteStream({
        metadata: { contentType: file.mimetype },
      });

      fileStream.end(file.buffer);
      await new Promise((resolve, reject) => {
        fileStream.on('finish', () => {
          filePresent = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(fileName)}?alt=media`;
          resolve();
        });
        fileStream.on('error', reject);
      });
    }

    // Upload fileM to Firebase Storage (if exists)
    if (req.files["fileM"] && req.files["fileM"][0]) {
      const file = req.files["fileM"][0];
      const fileName = Date.now() + '-' + file.originalname;
      const fileRef = bucket.file(fileName);
      const fileStream = fileRef.createWriteStream({
        metadata: { contentType: file.mimetype },
      });

      fileStream.end(file.buffer);
      await new Promise((resolve, reject) => {
        fileStream.on('finish', () => {
          fileManage = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(fileName)}?alt=media`;
          resolve();
        });
        fileStream.on('error', reject);
      });
    }

    // Upload filePhy to Firebase Storage (if exists)
    if (req.files["filePhy"] && req.files["filePhy"][0]) {
      const file = req.files["filePhy"][0];
      const fileName = Date.now() + '-' + file.originalname;
      const fileRef = bucket.file(fileName);
      const fileStream = fileRef.createWriteStream({
        metadata: { contentType: file.mimetype },
      });

      fileStream.end(file.buffer);
      await new Promise((resolve, reject) => {
        fileStream.on('finish', () => {
          filePhychosocial = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(fileName)}?alt=media`;
          resolve();
        });
        fileStream.on('error', reject);
      });
    }

    const oldMedicalInfo = await MedicalInformation.findById(id);
    if (!oldMedicalInfo) {
      return res.status(404).json({ status: "Medical information not found" });
    }

    // ตรวจสอบว่ามีการอัปโหลดไฟล์ไม่ ถ้าไม่มี ใช้ไฟล์เดิมจากฐานข้อมูล
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
        fileM: fileManage || oldMedicalInfo.fileM,
        filePhy: filePhychosocial || oldMedicalInfo.filePhy,
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
//แชทส่งรูปไม่ได้
// app.post('/sendchat', uploadimg.single('image'), async (req, res) => {
//   try {
//     const { message, recipientId, senderId, recipientModel, senderModel } = req.body;

//     // Validate required fields
//     if (!message || !recipientId || !senderId || !recipientModel || !senderModel) {
//       return res.status(400).json({ success: false, message: 'Missing required fields' });
//     }

//     let recipient, sender;

//     // Find recipient
//     recipient = recipientModel === 'User' 
//       ? await User.findById(recipientId) 
//       : await MPersonnel.findById(recipientId);
      
//     // Find sender
//     sender = senderModel === 'User' 
//       ? await User.findById(senderId) 
//       : await MPersonnel.findById(senderId);

//     if (!recipient || !sender) {
//       return res.status(404).json({ success: false, message: 'Sender or recipient not found' });
//     }

//     let imageUrl;

//     if (req.file) {
//       imageUrl = await uploadImage(req.file);
//     }

//     const newChat = new Chat({
//       message,
//       image: imageUrl || undefined,
//       recipient: recipient._id,
//       sender: sender._id,
//       recipientModel,
//       senderModel
//     });

//     await newChat.save();
//     res.json({ success: true, message: 'Chat message saved', imageUrl });
//   } catch (error) {
//     console.error('Error saving chat message:', error);
//     res.status(500).json({ success: false, message: 'Error saving chat message' });
//   }
// });

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

app.post('/sendchat', uploadimg.single('image'), async (req, res) => {
  try {
    const { message, recipientId, senderId, recipientModel, senderModel } = req.body;

    let recipient, sender;

    if (recipientModel === 'User') {
      recipient = await User.findById(recipientId);
    } else if (recipientModel === 'MPersonnel') {
      recipient = await MPersonnel.findById(recipientId);
    }

    if (senderModel === 'User') {
      sender = await User.findById(senderId);
    } else if (senderModel === 'MPersonnel') {
      sender = await MPersonnel.findById(senderId);
    }

    if (!recipient) {
      return res.status(404).json({ success: false, message: 'Recipient not found' });
    }

    if (!sender) {
      return res.status(404).json({ success: false, message: 'Sender not found' });
    }

    let newChat;

    if (req.file) {
      const bucket = admin.storage().bucket();
      const fileName = req.file.originalname;
      const file = bucket.file(fileName);
      const originalFileName = Buffer.from(req.file.originalname, 'latin1').toString('utf8');

      const fileStream = file.createWriteStream({
        metadata: {
          contentType: req.file.mimetype
        }
      });

      fileStream.on('error', (err) => {
        console.error('Error uploading image:', err);
        res.status(500).json({ success: false, message: 'Error uploading image' });
      });

      fileStream.on('finish', async () => {
        const [metadata] = await file.getMetadata();
        const fileSize = metadata.size;

        const imageUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${fileName}?alt=media`;

        newChat = new Chat({
          message,
          image: imageUrl,
          imageName: originalFileName, 
          recipient: recipient._id,
          sender: sender._id,
          recipientModel,
          senderModel,
          fileSize
        });

        await newChat.save();

        // ส่งข้อความใหม่ให้ผู้ใช้ทุกนที่เชื่อมต่อ

        res.json({ success: true, message: 'Chat message with image saved', imageUrl,imageName: originalFileName, fileSize });
      });

      fileStream.end(req.file.buffer);
    } else {
      newChat = new Chat({
        message,
        recipient: recipient._id,
        sender: sender._id,
        recipientModel,
        senderModel
      });

      await newChat.save();
    

      res.json({ success: true, message: 'Chat message without image saved' });
    }
  } catch (error) {
    console.error('Error saving chat message:', error);
    res.status(500).json({ success: false, message: 'Error saving chat message' });
  }
});




app.get('/chat/:recipientId/:recipientModel/:senderId/:senderModel', async (req, res) => {
  try {
    const { recipientId, recipientModel, senderId, senderModel } = req.params;

    const recipientChats = await Chat.find({
      $or: [
        { recipient: recipientId, recipientModel, sender: senderId, senderModel },
        { recipient: senderId, recipientModel: senderModel, sender: recipientId, senderModel: recipientModel }
      ]
    })
      .populate('recipient')
      .populate('sender');

    res.json({ success: true, chats: recipientChats });

    await Chat.updateMany(
      { recipient: senderId, sender: recipientId, recipientModel: senderModel, senderModel: recipientModel, isRead: false },
      { $set: { isRead: true, readAt: new Date() } }
    );

  } catch (error) {
    console.error('Error retrieving recipient chats:', error);
    res.status(500).json({ success: false, message: 'Error retrieving recipient chats' });
  }
});


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
app.post('/submitAssessreadiness/:id', async (req, res) => {
  const { userId, Readiness1, Readiness2, status_name } = req.body;

  try {
    const newAssessreadiness = new Assessreadiness({
      user: userId,
      Readiness1,
      Readiness2,
      status_name,
    });
    await newAssessreadiness.save();
    res.status(201).json({ success: true, message: 'Assessreadiness saved successfully' });
  } catch (error) {
    console.error('Error saving Assessreadiness:', error);
    res.status(500).json({ success: false, message: 'Error saving Assessreadiness' });
  }
});

app.get('/getAssessreadiness/:id', async (req, res) => {
  const userId = req.params.id;

  try {
    const assessreadinesses = await Assessreadiness.find({ user: userId });

    if (!assessreadinesses || assessreadinesses.length === 0) {
      return res.status(404).json({ success: false, message: 'No assessments found' });
    }

    const assessreadinessData = assessreadinesses.map(assessreadiness => ({
      Readiness1: assessreadiness.Readiness1,
      Readiness2: assessreadiness.Readiness2,
      status_name: assessreadiness.status_name,
      readiness_status: assessreadiness.readiness_status,
    }));

    res.status(200).json({ success: true, data: assessreadinessData });
  } catch (error) {
    console.error('Error retrieving assessments:', error);
    res.status(500).json({ success: false, message: 'Error retrieving assessments' });
  }
});

app.get('/getUserAssessreadiness/:id', async (req, res) => {
  const userId = req.params.id;
  try {
    const assessreadiness = await Assessreadiness.findOne({ user: userId }).select('status_name');
    if (assessreadiness) {
      res.status(200).json({ success: true, status_name: assessreadiness.status_name });
    } else {
      res.status(404).json({ success: false, message: 'Assessreadiness not found' });
    }
  } catch (error) {
    console.error('Error fetching assessreadiness:', error);
    res.status(500).json({ success: false, message: 'Error fetching assessreadiness' });
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