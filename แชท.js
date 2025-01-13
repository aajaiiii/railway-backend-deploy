//แบบสร้าง room เพิาม user สร้างแชทให้ ถ้าแพทย์เพิ่มใหม่แอดเข้า room อัตโนมัติ
// เอายังไม่อ่าน/แชทล่าสุดไว้ในฐานข้อมูล
//ตอนส่งมันแสดงจำนวนคนยังไม่อ่านเด๋อ

const RoomSchema = new mongoose.Schema({
  roomId: mongoose.Schema.Types.ObjectId, // ID ของผู้ป่วยที่ใช้เป็น Room ID
  participants: [
    {
      id: mongoose.Schema.Types.ObjectId, // ID ของผู้ใช้หรือแพทย์
      model: { type: String, enum: ["User", "MPersonnel"] }, // ระบุว่าเป็น User หรือ MPersonnel
      unreadCount: { type: Number, default: 0 },
    },
  ],
  lastMessage: {
    message: { type: String, default: "" },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: "participants.model",
      default: null,
    },
    createdAt: { type: Date, default: null },
  },
  // Model: {
  //   type: String,
  //   required: true,
  //   enum: ['User', 'MPersonnel'],
  // },
});
mongoose.model("Room", RoomSchema);
const Room = mongoose.model("Room");

//ไปอัปเดตอันที่เคยลบไป
app.post("/adduser", async (req, res) => {
  const { username, name, surname, tel, email, physicalTherapy } = req.body;

  if (!username || !tel || !name || !surname) {
    return res.json({
      error: "กรุณากรอกเลขประจำตัวประชาชน เบอร์โทรศัพท์ ชื่อและนามสกุล",
    });
  }

  if (username.length !== 13) {
    return res.json({
      error: "ชื่อผู้ใช้ต้องมีความยาว 13 ตัวอักษร",
    });
  }

  const encryptedPassword = await bcrypt.hash(tel, 10);

  try {
    let user;
    const oldUser = await User.findOne({ username });

    if (oldUser && !oldUser.deletedAt) {
      return res.json({ error: "มีชื่อผู้ใช้นี้อยู่ในระบบแล้ว" });
    }

    if (oldUser && oldUser.deletedAt) {
      oldUser.name = name;
      oldUser.surname = surname;
      oldUser.password = encryptedPassword;
      oldUser.tel = tel;
      oldUser.deletedAt = null;
      oldUser.email = email || null;
      oldUser.physicalTherapy = physicalTherapy || false;
      user = await oldUser.save();
    } else {
      user = await User.create({
        username,
        name,
        surname,
        password: encryptedPassword,
        tel,
        ID_card_number: username,
        email: email || null,
        physicalTherapy: physicalTherapy || false,
      });
    }
    // ดึงค่า DefaultThreshold จากฐานข้อมูล
    const defaultThreshold = await DefaultThreshold.findOne();

    if (!defaultThreshold) {
      return res.status(500).json({
        status: "error",
        message: "Default threshold not set. Please configure it first.",
      });
    }

    // สร้าง threshold ค่าเริ่มต้นสำหรับผู้ใช้ใหม่
    const userThreshold = {
      user: user._id,
      SBP: defaultThreshold.SBP,
      DBP: defaultThreshold.DBP,
      PulseRate: defaultThreshold.PulseRate,
      Temperature: defaultThreshold.Temperature,
      DTX: defaultThreshold.DTX,
      Respiration: defaultThreshold.Respiration,
      Painscore: defaultThreshold.Painscore,
    };
    await UserThreshold.create(userThreshold);

    // ดึงรายชื่อแพทย์ทั้งหมด
    const allPersonnel = await MPersonnel.find({ deletedAt: null });

    // สร้าง Room ใหม่
    const room = {
      roomId: user._id, // ใช้ _id ของผู้ป่วยเป็น Room ID
      participants: [
        { id: user._id, model: "User" }, // เพิ่มผู้ป่วยเข้า Room
        ...allPersonnel.map((personnel) => ({
          id: personnel._id,
          model: "MPersonnel",
        })), // เพิ่มแพทย์ทุกคนเข้า Room
      ],
    };

    await Room.create(room); // บันทึก Room ลงฐานข้อมูล

    res.send({ status: "ok", user }); // ส่งข้อมูลผู้ใช้กลับไปด้วย
  } catch (error) {
    console.error("Error creating user:", error);
    res.send({ status: "error", error: error.message });
  }
});

app.post("/addmpersonnel", async (req, res) => {
  const { username, email, tel, nametitle, name, surname } = req.body;

  // ใช้เบอร์โทรเป็นรหัสผ่าน
  const encryptedPassword = await bcrypt.hash(tel, 10);

  if (!username || !email || !tel || !name || !surname || !nametitle) {
    return res.json({
      error:
        "กรุณากรอกเลขใบประกอบวิชาชีพ อีเมล คำนำหน้าชื่อ เบอร์โทร และชื่อ-นามสกุล",
    });
  }

  try {
    const oldUser = await MPersonnel.findOne({ username });

    // ตรวจสอบว่าชื่อผู้ใช้นี้มีอยู่ในระบบแล้วหรือยัง
    if (oldUser) {
      return res.json({ error: "มีชื่อผู้ใช้นี้อยู่ในระบบแล้ว" });
    }

    // สร้างผู้ใช้ใหม่
    await MPersonnel.create({
      username,
      password: encryptedPassword, // ใช้เบอร์โทรเป็นรหัสผ่านที่เข้ารหัสแล้ว
      email,
      tel, // เก็บเบอร์โทรไว้ในฐานข้อมูล
      nametitle,
      name,
      surname,
    });

    // ดึงผู้ป่วยทั้งหมดจากระบบ
    const allUsers = await User.find({ deletedAt: null });

    for (const user of allUsers) {
      const room = await Room.findOne({ roomId: user._id });

      if (room) {
        room.participants.push({ id: MPersonnel._id, model: "MPersonnel" }); // เพิ่มแพทย์เข้าไปใน Room
        await room.save(); // บันทึกการเปลี่ยนแปลง Room
      }
    }

    res.send({ status: "ok" });
  } catch (error) {
    res.send({ status: "error", error: error.message });
  }
});
io.on("connection", (socket) => {
  console.log("A user connected:", socket.id);

  // เข้าห้องแชท
  socket.on("joinRoom", (roomId) => {
    socket.join(roomId);
    console.log(`User joined room: ${roomId}`);
  });

  socket.on("sendMessage", async (data) => {
    const { roomId, message, senderId } = data;
    console.log(`Message received in room ${roomId}:`, message);

    try {
      io.to(roomId).emit("receiveMessage", data);

      const updatedUsers = await User.find(
        { deletedAt: null },
        "name surname username"
      ).lean();
      for (let user of updatedUsers) {
        const chats = await Chat.find({
          roomId: user._id,
          sender: { $ne: senderId }, // ตรวจสอบว่าผู้ส่งไม่ใช่ senderId
          readBy: { $nin: [senderId] }, // และยังไม่ได้อ่านโดย senderId
        });

        user.unreadCount = chats.length;

        const latestChat = await Chat.findOne({
          roomId: user._id,
        })
          .sort({ createdAt: -1 })
          .populate("sender", "name surname");

        if (latestChat) {
          user.latestChat = {
            message: latestChat.message,
            file: latestChat.image,
            senderId: latestChat.sender._id,
            createdAt: latestChat.createdAt,
            senderName: `${latestChat.sender.name} ${latestChat.sender.surname}`,
          };
        } else {
          user.latestChat = null; // กรณีไม่มีแชทล่าสุด
        }
      }

      // ส่งข้อมูลผู้ใช้ที่อัปเดตไปยังทุกๆ ผู้ใช้ที่เชื่อมต่อ
      io.emit("usersUpdated", updatedUsers);
    } catch (error) {
      console.error("Error updating users:", error);
    }
  });

  socket.on("markAsRead", async ({ roomId, messageId, userId }) => {
    try {
      if (!mongoose.Types.ObjectId.isValid(userId)) {
        console.error(`Invalid userId: ${userId}`);
        return;
      }

      const chatMessage = await Chat.findById(messageId);
      if (chatMessage) {
        const isAlreadyRead = chatMessage.readBy.some(
          (readerId) => readerId.toString() === userId
        );
        if (!isAlreadyRead && chatMessage.sender.toString() !== userId) {
          // เพิ่ม userId ใน readBy
          await Chat.findByIdAndUpdate(
            messageId,
            { $addToSet: { readBy: userId } },
            { new: true }
          );

          // คำนวณ unreadCount ใหม่สำหรับ roomId และ userId
          const unreadCount = await Chat.countDocuments({
            roomId,
            sender: { $ne: userId },
            readBy: { $nin: [userId] },
          });

          // อัปเดต unreadCount ใน Room collection
          await Room.findOneAndUpdate(
            { roomId },
            {
              $set: { "participants.$[elem].unreadCount": unreadCount },
            },
            {
              arrayFilters: [{ "elem.id": userId }],
            }
          );

          // ส่งข้อมูลใหม่ไปยังห้องแชท
          io.to(roomId).emit("readByUpdated", {
            messageId,
            readBy: [...chatMessage.readBy, userId],
            unreadCount,
          });
        }
      }
    } catch (error) {
      console.error("Error updating readBy:", error);
    }
  });

  socket.on("disconnect", () => {
    console.log("A user disconnected:", socket.id);
  });
});

//แบบกำหนดผู้รับที่ User
app.post("/sendchatnew", uploadimg.single("image"), async (req, res) => {
  try {
    const { message, roomId, senderId, senderModel, readBy } = req.body;
    let sender;
    if (message.length > 1000) {
      return res.status(400).json({
        success: false,
        message: "Message exceeds the maximum length of 1000 characters.",
      });
    }

    if (senderModel === "User") {
      sender = await User.findById(senderId);
    } else if (senderModel === "MPersonnel") {
      sender = await MPersonnel.findById(senderId);
    }

    if (!sender) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    let newChat;

    // ตรวจสอบว่ามีการอัปโหลดไฟล์มาหรือไม่
    if (req.file) {
      const bucket = admin.storage().bucket();
      const fileName = req.file.originalname;
      const file = bucket.file(fileName);
      const originalFileName = Buffer.from(
        req.file.originalname,
        "latin1"
      ).toString("utf8");

      const fileStream = file.createWriteStream({
        metadata: {
          contentType: req.file.mimetype,
        },
      });

      fileStream.on("error", (err) => {
        console.error("Error uploading image:", err);
        return res
          .status(500)
          .json({ success: false, message: "Error uploading image" });
      });

      fileStream.on("finish", async () => {
        const [metadata] = await file.getMetadata();
        const fileSize = metadata.size;

        const imageUrl = `https://firebasestorage.googleapis.com/v0/b/${
          bucket.name
        }/o/${encodeURIComponent(fileName)}?alt=media`;

        newChat = new Chat({
          message,
          image: imageUrl,
          imageName: originalFileName,
          sender: sender._id,
          senderModel,
          roomId,
          fileSize,
          readBy: [senderId],
        });

        await newChat.save();
        await newChat.populate("sender", "name surname");
        await Room.findOneAndUpdate(
          { roomId: roomId },
          {
            $set: {
              "lastMessage.message": message,
              "lastMessage.sender": senderId,
              "lastMessage.createdAt": new Date(),
            },
            $inc: { "participants.$[elem].unreadCount": 1 }, // เพิ่ม unreadCount ให้กับผู้ใช้อื่น
          },
          {
            arrayFilters: [{ "elem.id": { $ne: senderId } }], // ยกเว้นผู้ส่ง
          }
        );

        // กระจายข้อความแบบเรียลไทม์
        io.to(roomId).emit("receiveMessage", newChat);
        const room = await Room.aggregate([
          {
            $match: { roomId: roomId }, // ค้นหา Room ตาม roomId
          },
          {
            $lookup: {
              from: "chats", // เชื่อมต่อกับ collection "chats"
              localField: "roomId",
              foreignField: "roomId",
              as: "chats",
            },
          },
          {
            $addFields: {
              participants: { $ifNull: ["$participants", []] },
              lastMessage: { $arrayElemAt: [{ $slice: ["$chats", -1] }, 0] }, // แชทล่าสุด
              participantsWithUnread: {
                $map: {
                  input: "$participants",
                  as: "participant",
                  in: {
                    $mergeObjects: [
                      "$$participant",
                      {
                        unreadCount: {
                          $cond: [
                            { $eq: ["$$participant.id", senderId] },
                            0, // ผู้ส่งข้อความ unreadCount = 0
                            { $add: ["$$participant.unreadCount", 1] }, // เพิ่ม unreadCount คนอื่น ๆ
                          ],
                        },
                      },
                    ],
                  },
                },
              },
            },
          },
          {
            $project: {
              roomId: 1,
              lastMessage: {
                message: 1,
                sender: 1,
                createdAt: 1,
              },
              participants: "$participantsWithUnread", // ใช้ค่า unreadCount ที่คำนวณใหม่
            },
          },
        ]);

        if (room.length > 0) {
          const updatedRoom = room[0]; // Room ที่อัปเดตข้อมูล
          io.emit("updateUserList", {
            roomId: updatedRoom.roomId,
            lastMessage: updatedRoom.lastMessage,
            participants: updatedRoom.participants,
          });

          console.log("updateUserList emitted:", {
            roomId: updatedRoom.roomId,
            lastMessage: updatedRoom.lastMessage,
            participants: updatedRoom.participants,
          });
        }

        res.json({
          success: true,
          message: "Chat message with image saved",
          newChat,
          imageUrl,
          imageName: originalFileName,
          fileSize,
          roomId,
          readBy: [senderId],
        });
      });

      fileStream.end(req.file.buffer);
    } else {
      // กรณีไม่มีไฟล์
      newChat = new Chat({
        message,
        sender: sender._id,
        senderModel,
        roomId,
        readBy: [senderId],
      });

      await newChat.save();
      await newChat.populate("sender", "name surname");

      // กระจายข้อความแบบเรียลไทม์
      await Room.findOneAndUpdate(
        { roomId: roomId },
        {
          $set: {
            "lastMessage.message": message,
            "lastMessage.sender": senderId,
            "lastMessage.createdAt": new Date(),
          },
          $inc: { "participants.$[elem].unreadCount": 1 }, // เพิ่ม unreadCount ให้กับผู้ใช้อื่น
        },
        {
          arrayFilters: [{ "elem.id": { $ne: senderId } }], // ยกเว้นผู้ส่ง
        }
      );
      io.to(roomId).emit("receiveMessage", newChat);
      const room = await Room.findOne({ roomId: roomId });
      if (room) {
        // คำนวณ unreadCount สำหรับทุก participant
        const updatedParticipants = room.participants.map((participant) => {
          return {
            ...participant,
            unreadCount:
              participant.id.toString() === senderId.toString()
                ? 0 // ถ้าเป็นผู้ส่งข้อความ unreadCount = 0
                : (participant.unreadCount || 0) + 1, // เพิ่ม unreadCount คนอื่น
          };
        });

        // อัปเดตข้อมูลห้อง
        room.participants = updatedParticipants;
        room.lastMessage = {
          message: message,
          sender: senderId,
          createdAt: new Date(),
        };
        await room.save();

        // ส่งข้อมูลไปยังไคลเอนต์
        io.emit("updateUserList", {
          roomId: room.roomId,
          lastMessage: room.lastMessage,
          participants: room.participants,
        });

        console.log("updateUserList emitted:", {
          roomId: room.roomId,
          lastMessage: room.lastMessage,
          participants: room.participants,
        });
      }

      res.json({ success: true, message: "Chat message saved", newChat });
    }
  } catch (error) {
    console.error("Error saving chat message:", error);
    res
      .status(500)
      .json({ success: false, message: "Error saving chat message" });
  }
});

app.get("/getChatHistory/:roomId", async (req, res) => {
  try {
    const { roomId } = req.params;

    // ดึงประวัติแชทที่เกี่ยวข้องกับ roomId โดยตรง
    const chatHistory = await Chat.find({ roomId: roomId }) // ดึงเฉพาะแชทที่ roomId ตรงกัน
      .populate("sender", "name username surname") // เพิ่มข้อมูลผู้ส่ง
      .sort({ createdAt: 1 }); // เรียงลำดับตามเวลาที่สร้าง
    // หากยังไม่มีประวัติแชทในห้องนั้น
    if (!chatHistory || chatHistory.length === 0) {
      return res.json({
        success: true,
        message: "No chat history found for this roomId",
        chatHistory: [], // ส่ง array ว่างกลับ
      });
    }

    res.json({ success: true, chatHistory });
  } catch (error) {
    console.error("Error fetching chat history:", error);
    res
      .status(500)
      .json({ success: false, message: "Error fetching chat history" });
  }
});

// app.get("/users", async (req, res) => {
//   try {
//     // ดึงรายการผู้ใช้ที่ยังไม่ถูกลบ
//     const users = await User.find(
//       { deletedAt: null },
//       "name surname username"
//     ).lean();
//     const senderId = req.query.senderId;
//     for (let user of users) {
//       // ดึงแชททั้งหมดของผู้ใช้
//       const chats = await Chat.find({
//         roomId: user._id,
//         sender: { $ne: senderId }, // ผู้ส่งไม่ใช่ตัวเอง
//         readBy: { $nin: [senderId] }, // ยังไม่มีใน readBy
//       });

//       // นับจำนวนแชทที่ยังไม่ได้อ่าน
//       user.unreadCount = chats.length;

//       // ดึงแชทล่าสุดที่เกี่ยวข้องกับ roomId ของผู้ใช้ (ผู้ใช้เป็น roomId)
//       const latestChat = await Chat.findOne({
//         roomId: user._id, // ใช้ roomId เป็น id ของผู้ใช้
//       })
//         .sort({ createdAt: -1 }) // เรียงลำดับตามเวลาที่สร้าง
//         .populate("sender", "name surname"); // ข้อมูลผู้ส่ง

//       // เพิ่มแชทล่าสุดในข้อมูลผู้ใช้
//       if (latestChat) {
//         user.latestChat = {
//           message: latestChat.message,
//           file: latestChat.image,
//           senderId: latestChat.sender._id,
//           createdAt: latestChat.createdAt,
//           senderName: `${latestChat.sender.name} ${latestChat.sender.surname}`,
//         };
//       } else {
//         user.latestChat = null; // กรณีไม่มีแชทล่าสุด
//       }
//     }

//     // ส่งข้อมูลผู้ใช้ทั้งหมดกลับไปพร้อมแชทล่าสุด
//     res.json({ success: true, users });
//   } catch (error) {
//     console.error("Error fetching users:", error);
//     res.status(500).json({ success: false, message: "Error fetching users" });
//   }
// });
app.get("/users", async (req, res) => {
  try {
    // User ที่ล็อกอิน
    const userId = req.query.senderId; // สมมติว่ามี `userId` จาก middleware ของ auth

    // ดึงรายการผู้ใช้ที่ยังไม่ถูกลบ
    const users = await User.find(
      { deletedAt: null },
      "name surname username"
    ).lean();

    // ดึงข้อมูล Room และรวมข้อมูล unreadCount และ lastMessage
    const rooms = await Room.aggregate([
      {
        $lookup: {
          from: "Chat", // เชื่อมกับ collection ชื่อ 'chats'
          localField: "roomId",
          foreignField: "roomId",
          as: "chats",
        },
      },
      {
        $addFields: {
          participants: { $ifNull: ["$participants", []] },
          lastMessage: { $arrayElemAt: [{ $slice: ["$chats", -1] }, 0] }, // แชทล่าสุด
          unreadCount: {
            $sum: {
              $map: {
                input: "$participants",
                as: "participant",
                in: {
                  $cond: [
                    { $eq: ["$$participant.unreadCount", null] },
                    0,
                    "$$participant.unreadCount",
                  ],
                },
              },
            },
          },
        },
      },
      {
        $project: {
          roomId: 1,
          participants: 1,
          lastMessage: {
            message: 1,
            sender: 1,
            createdAt: 1,
          },
          unreadCount: 1,
        },
      },
    ]);

    // รวมข้อมูล users กับข้อมูล rooms
    const userData = users.map((user) => {
      const userRooms = rooms.filter(
        (room) =>
          Array.isArray(room.participants) &&
          room.participants.some(
            (participant) =>
              participant.id && participant.id.toString() === userId.toString()
          )
      );

      return {
        ...user,
        rooms: userRooms.map((room) => {
          // ค้นหา unreadCount ของ user ที่ตรงกับ userId
          const userParticipant = room.participants.find(
            (participant) =>
              participant.id && participant.id.toString() === userId.toString()
          );
          return {
            roomId: room.roomId,
            participants: room.participants,
            lastMessage: room.lastMessage,
            unreadCount: userParticipant ? userParticipant.unreadCount : 0, // แสดงเฉพาะ unreadCount ของผู้ใช้
          };
        }),
      };
    });

    res.json({ success: true, users: userData });
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({ success: false, message: "Error fetching users" });
  }
});

app.get("/getUserById/:id", async (req, res) => {
  const { id } = req.params; // ดึง ID จาก URL

  try {
    const user = await User.findById(id); // ค้นหาผู้ใช้จาก ID
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    res.json({ user }); // ส่งข้อมูลของผู้ใช้กลับไป
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

// API สำหรับดึงข้อมูล MPersonnel ทั้งหมด
app.get("/getMPersonnelList", async (req, res) => {
  try {
    const personnelList = await MPersonnel.find({ deletedAt: null }); // สามารถเพิ่มเงื่อนไขที่ต้องการ
    res.json(personnelList);
  } catch (error) {
    console.error("Error fetching MPersonnel list:", error);
    res
      .status(500)
      .json({ success: false, message: "Error fetching MPersonnel list" });
  }
});
