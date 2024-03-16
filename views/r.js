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
  