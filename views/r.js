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
        text: `คุณได้ทำการแจ้งลืมรหัสผ่าน Homeward\n\nรุณาคลิกลิงก์ด้านล่างเพื่อตั้งรหัสผ่านใหม่:\n\n${link}`,
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
      return res.json({ error: "Passwords do not match" });
    }
    const oldUser = await Admins.findOne({ _id: id });
    if (!oldUser) {
      return res.json({ status: "User Not Exists!!" });
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
      res.send({ status: "Somthing went wrong" });
    }
  });