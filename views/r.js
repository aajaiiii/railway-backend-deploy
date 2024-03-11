//addคู่มือ รูป+ไฟล์
app.post("/addcaremanual", upload, async (req, res) => {
  const { caremanual_name, detail } = req.body;

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