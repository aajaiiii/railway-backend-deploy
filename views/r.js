//แก้ไขผู้ป่วย
app.post("/updateuser/:id", async (req, res) => {
  // const { username, name, email,tel,gender,birthday,ID_card_number, nationality,Address  } = req.body;
  const { username, name, email, password,tel,gender,birthday,ID_card_number, nationality,Address  } = req.body;
  const { id } = req.params;

  try {
    const updatedUser = await User.findByIdAndUpdate
    (id, {
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
    }, { new: true });

    // await Admins.findByIdAndUpdate(id, { password: encryptedNewPassword });
    if (!updatedUser) {
      return res.status(404).json({ status: "User not found" });
    }

    res.json({ status: "ok", updatedUser });
  } catch (error) {
    res.json({ status: error });
  }
});
