const express = require("express");
const app = express();
app.use(express.json());
const mongoose = require("mongoose");

const bcrypt = require("bcryptjs");
const jwt = require('jsonwebtoken');

// อย่าลืมใส่อันนี้
const cors = require("cors");
app.use(cors());


const JWT_SECRET ="hvdvay6ert72839289()aiyg8t87qt72393293883uhefiuh78ttq3ifi78272jbkj?[]]pou89ywe";
app.listen(5000, () => {
    console.log("Server Started");
    
});


const mongoUrl = "mongodb+srv://sasithornsorn:Sasi12345678@cluster0.faewtst.mongodb.net/?retryWrites=true&w=majority"

mongoose.connect(mongoUrl,{
    dbName: 'Homeward',
    useNewUrlParser:true,
    useUnifiedTopology: true
}).then(()=>{console.log("Connect to database");})
.catch((e) => console.log(e));


// เชื่อม mongo
require("./homeward");


const Admins = mongoose.model("Admin");

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
      // รหัสตรงกันไหน
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




app.post("/login", async (req,res) => {
    const { username,password } = req.body;
  
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
// const equipment = mongoose.model("Equipment");
// app.post("/addequipment", async (req, res) => {
//   // const { username, password } = req.body;
//   const { equipment_name, equipment_type } = req.body;
  
//   try {
//     const oldequipment = await equipment.findOne({ equipment_name });
//     //มีอุปกรณ์ในระบบไหม
//     if (oldequipment) {
//       return res.json({ error: "Equipment Exists" });
//     }
//     await equipment.create({
//       equipment_name,
//       equipment_type,
//     });
//     res.send({ status: "ok" });
//   } catch (error) {
//     res.send({ status: "error" });
//   }
// });




// // ดึงข้อมูลมาโชว์
app.get("/alladmin", async ( req, res ) => {
  try {
    const allAdmin = await Admins.find({});
    res.send({ status: "ok", data: allAdmin });
  } catch (error) {
    console.log(error);
  }
});



//  ลบข้อมุล
// app.post("/deleteadmin", async (req, res) => {
//   const { adminid } = req.body;
//   try {
//     const deletedAdmin = await Admins.findOneAndDelete({ _id: adminid });
//     if(deletedAdmin){
//       console.log(`ลบ ${adminid} แล้ว`);
//       res.send({ status: "Ok", data: "Deleted" });
//     }else{
//       console.log(`หา ${adminid} ไม่เจอ`);
//       res.status(404).send({ status: "Error", data: "Admin not found" });

//     }
//     // Admins.deleteOne({ _id: adminid }, function (error, res) {
//     //   console.log(error);
//     // });
//     res.send({ status: "Ok", data: "Deleted" });
//   } catch (error) {
//     console.log(error);
//   }
// });



// app.post("/deleteadmin", async (req, res) => {
//   const { adminid } = req.body;
//   try {
//     const deletedAdmin = await Admins.findOneAndDelete({ _id: adminid });

//     if (deletedAdmin) {
//       console.log(`Admin with ID ${adminid} deleted successfully`);
//       res.send({ status: "Ok", data: "Deleted" });
//     } else {
//       console.log(`Admin with ID ${adminid} not found`);
//       res.status(404).send({ status: "Error", data: "Admin not found" });
//     }
//   } catch (error) {
//     console.error(error);
//     res.status(500).send({ status: "Error", data: "Internal Server Error" });
//   }
// });


