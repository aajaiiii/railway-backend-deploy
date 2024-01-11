const express = require("express");
const app = express();
app.use(express.json());
const mongoose = require("mongoose");

const bcrypt = require("bcryptjs");
const jwt = require('jsonwebtoken');

// อย่าลืมใส่อันนี้
const cors = require("cors");
app.use(cors());


const JWT_SECRET = "hvdvay6ert72839289()aiyg8t87qt72393293883uhefiuh78ttq3ifi78272jbkj?[]]pou89ywe";
app.listen(5000, () => {
  console.log("Server Started");

});


const mongoUrl = "mongodb+srv://sasithornsorn:Sasi12345678@cluster0.faewtst.mongodb.net/?retryWrites=true&w=majority"

mongoose.connect(mongoUrl, {
  dbName: 'Homeward',
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => { console.log("Connect to database"); })
  .catch((e) => console.log(e));


// เชื่อม mongo
require("./homeward");


const Admins = mongoose.model("Admin");
const Equipment = mongoose.model("Equipment");

//เพิ่มข้อมูลแอดมิน
app.post("/addadmin", async (req, res) => {
  // const { username, password } = req.body;
  const { username, password, confirmPassword } = req.body;
  const encryptedPassword = await bcrypt.hash(password, 10);
  try {
    const oldUser = await Admins.findOne({ username });
    //ชื่อมีในระบบไหม
    if (oldUser) {
      return res.json({ error: "User Exists" });
    }

    if (password !== confirmPassword) {
      return res.json({ error: "Passwords do not match" });
    }
    await Admins.create({
      username,
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


// // อัปเดตแอดมิน
// app.get("/updateadmin", async ( req, res ) => {
//   const {password, newpassword, confirmnewPassword } = req.body;
//   try {
//     await Admins.updateOne({_id: id},{
//       $set: {
//         password: newpassword
//       }
//     })

//   } catch (error) {
//     console.log(error);
//   }
// });


//เปลี่ยนรหัสผ่าน
// app.post("/updateadmin/:id", async ( req, res ) => {
//   const {password, newPassword, confirmNewPassword } = req.body;
//   const id = req.params.id;

//   try {
//     if (newPassword !== confirmNewPassword) {
//       return res.status(400).json({ error: 'รหัสผ่านไม่ตรงกัน' });
//     }

//     const admin = await Admins.findById(id);


//     if (admin.password !== password) {
//       return res.status(401).json({ error: 'รหัสผ่านเก่าไม่ถูก' });
//     }

//      // Update the password
//      admin.password = newPassword;
//      res.status(200).json({ message: 'Password updated successfully' });

//   } catch (error) {
//     console.log(error);
//   }
// });

app.post("/updateadmin/:id", async (req, res) => {
  const { password, newPassword, confirmNewPassword } = req.body;
  const id = req.params.id;

  try {
    // if (newPassword !== confirmNewPassword) {
    //   return res.status(400).json({ error: 'รหัสผ่านไม่ตรงกัน' });
    // }

    // if(password, newPassword, confirmNewPassword === null){
    //   return res.status(400).json({ error: 'กรูณากรอกรหัส' });
    //   }
    if (newPassword.trim() !== confirmNewPassword.trim()) {
      return res.status(400).json({ error: 'รหัสผ่านไม่ตรงกัน' });
    }
    const admin = await Admins.findById(id);

    //รหัสตรงกับในฐานข้อมูลไหม
    const isPasswordValid = await bcrypt.compare(password, admin.password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'รหัสผ่านเก่าไม่ถูกต้อง' });
    }

    //
    const encryptedNewPassword = await bcrypt.hash(newPassword, 10);
    // อัปเดตรหัสผ่าน
    await Admins.findByIdAndUpdate(id, { password: encryptedNewPassword });

    res.status(200).json({status: "ok", message: 'รหัสผ่านถูกอัปเดตเรียบร้อยแล้ว' });

  } catch (error) {
    console.error('Error during password update:', error);
    res.status(500).json({ error: 'มีข้อผิดพลาดในการอัปเดตรหัสผ่าน' });
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
  } catch (error) { }
});


//add equipment
// app.post("/addequipment", async (req, res) => {
//   const { equipment_name, equipment_type } = req.body;

//   try {
//     const oldequipment = await Equipment.findOne({ equipment_name });
//     //มีอุปกรณ์ในระบบไหม
//     if (oldequipment) {
//       return res.json({ error: "Equipment Exists" });
//     }
//     await Equipment.create({
//       equipment_name,
//       equipment_type,
//     });
//     res.send({ status: "ok" });
//   } catch (error) {
//     res.send({ status: "error" });
//   }
// });


app.post("/addequip", async (req, res) => {
  const { equipment_name, equipment_type, adminId } = req.body;

  try {
    const oldequipment = await Equipment.findOne({ equipment_name });

    // ตรวจสอบว่าอุปกรณ์มีอยู่ในระบบหรือไม่
    if (oldequipment) {
      return res.json({ error: "Equipment Exists" });
    }

    // ตรวจสอบว่า Admin ID ที่ส่งมาถูกต้องหรือไม่
    const existingAdmin = await Admins.findById(adminId);
    if (!existingAdmin) {
      return res.json({ error: "Invalid Admin ID" });
    }

    // สร้าง document ใหม่ของ Equipment โดยรวม Admin ID
    // const newEquipment = await Equipment.create({
    //   equipment_name,
    //   equipment_type,
    //   admin: [adminId], // อ้างอิงไปยัง Admin ID
    // });
  await Equipment.create({
      equipment_name,
      equipment_type,
      admin: [adminId], // อ้างอิงไปยัง Admin ID
    });

    // เพิ่ม ID ของ Equipment ใหม่ลงใน field admin ของ Admin Collection
    // existingAdmin.equipment.push(newEquipment._id);
    // await existingAdmin.save();

    res.send({ status: "ok" });
  } catch (error) {
    console.error(error);
    res.send({ status: "error" });
  }
});

// // ดึงข้อมูลอุปกรณ์มาโชว์
app.get("/allequip", async ( req, res ) => {
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

app.delete("/deleteAdmin/:id", async (req, res) => {
  
  const adminId= req.params.id;
  try {
    const result = await Admins.deleteOne({ _id: adminId });
    
    if (result.deletedCount === 1) {
      res.json({ status: 'OK', data: 'Deleted successfully' });
    } else {
      res.json({ status: 'Not Found', data: 'Admin not found or already deleted' });
    }
  } catch (error) {
    console.error('Error during deletion:', error);
    res.status(500).json({ status: 'Error', data: 'Internal Server Error' });
  }
});