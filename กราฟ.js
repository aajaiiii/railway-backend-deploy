app.get("/getDTXData/:userId", async (req, res) => {
  const userId = req.params.userId;

  try {
    const patientForms = await PatientForm.find({ user: userId })
      .populate('user')
      .sort({ createdAt: -1 }) // เรียงลำดับตาม createdAt จากใหม่สุดไปเก่าสุด
      // .limit(7);

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



app.get("/getDTXData/:userId/:formId", async (req, res) => {
  const { userId, formId } = req.params;

  try {
    const patientForms = await PatientForm.find({ user: userId })
      .populate('user')
      .sort({ createdAt: -1 }); // เรียงลำดับตาม createdAt จากใหม่สุดไปเก่าสุด

    // หยุดที่ formId
    const dtxData = [];
    for (const form of patientForms) {
      dtxData.push({
        name: form.user.name,
        DTX: form.DTX,
        createdAt: form.createdAt
      });
      if (form._id.toString() === formId) break;
    }

    res.send({ status: "ok", data: dtxData.reverse() });
  } catch (error) {
    console.error("Error fetching DTX data:", error);
    res.send({ status: "error" });
  }
});


app.get("/getPainscoreData/:userId", async (req, res) => {
  const userId = req.params.userId;

  try {
    const patientForms = await PatientForm.find({ user: userId })
      .populate('user')
      .sort({ createdAt: -1 }) // เรียงลำดับตาม createdAt จากใหม่สุดไปเก่าสุด
      // .limit(7); 

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

app.get("/getBloodPressureData/:userId", async (req, res) => {
  const userId = req.params.userId;

  try {
    const patientForms = await PatientForm.find({ user: userId })
      .populate('user')
      .sort({ createdAt: -1 })

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


app.get("/getPulseRateData/:userId", async (req, res) => {
  const userId = req.params.userId;

  try {
    const patientForms = await PatientForm.find({ user: userId })
      .populate('user')
      .sort({ createdAt: -1 })
      // .limit(7); 

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


app.get("/getRespirationData/:userId", async (req, res) => {
  const userId = req.params.userId;

  try {
    const patientForms = await PatientForm.find({ user: userId })
      .populate('user')
      .sort({ createdAt: -1 }) // เรียงลำดับตาม createdAt จากใหม่สุดไปเก่าสุด
      // .limit(7); 

    const  RespirationData = patientForms.map(form => ({ 
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