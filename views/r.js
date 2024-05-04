app.post("/adduser", async (req, res) => {
    const { username, name, email, password, confirmPassword,tel,gender,birthday,ID_card_number, nationality,Address } = req.body;
    if (!username || !password || !email || !name) {
      return res.json({ error: "กรุณากรอกชื่อผู้ใช้ รหัสผ่าน อีเมล และชื่อ-นามสกุล" });
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