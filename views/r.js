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