async function saveDataToMongoDB() {
  try {
    const data = await getDataFromGoogleSheet();
    const latestSavedData = await User.find().sort({ createdAt: -1 }).limit(1);
    const lastSavedUsername =
      latestSavedData.length > 0 ? latestSavedData[0].username : "";

    // Exclude the first row if it's a header
    const newData = data.slice(1).filter((row) => row[1] !== lastSavedUsername);

    for (const row of newData) {
      const existingUser = await User.findOne({ $or: [{ username: row[1] }, { email: row[4] }] });
      if (existingUser) {
        console.log(`User with username ${row[1]} or email ${row[4]} already exists. Skipping...`);
        continue;
      }

      const encryptedPassword = await bcrypt.hash(row[5], 10);
      const newUser = new User({
        username: row[1],
        password: encryptedPassword,
        email: row[4],
        tel: row[5],
        name: row[2],
        surname: row[3],
        gender: row[6],
        birthday: row[7],
        ID_card_number: row[1],
        nationality: row[8],
        Address: row[9],
      });
      await newUser.save();
      console.log(`User with username ${row[1]} saved to MongoDB.`);

      // Save caregiver data
      const caregiverData = {
        user: newUser._id,
        name: row[11],
        surname: row[14],
        Relationship: row[12],
        tel: row[13],
      };
      const newCaregiver = new Caregiver(caregiverData);
      await newCaregiver.save();
      console.log(`Caregiver ${row[11]} saved to MongoDB.`);
    }
    console.log(
      "Data fetched from Google Sheets and saved to MongoDB successfully"
    );
  } catch (error) {
    console.error("Error fetching data from Google Sheets:", error);
  }
}
