app.put("/alerts/:id/viewed", async (req, res) => {
  try {
    const alertId = req.params.id;
    const alert = await Alert.findByIdAndUpdate(alertId, { viewed: true }, { new: true });
    res.json({ alert });
  } catch (error) {
    console.error("Error updating alert viewed status:", error);
    res.status(500).send({ status: "error", message: error.message });
  }
});