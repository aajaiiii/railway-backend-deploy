app.post("/sendchat", uploadimg.single("image"), async (req, res) => {
  try {
    const { message, recipientId, senderId, recipientModel, senderModel } =
      req.body;

    let recipient, sender;

    if (recipientModel === "User") {
      recipient = await User.findById(recipientId);
    } else if (recipientModel === "MPersonnel") {
      recipient = await MPersonnel.findById(recipientId);
    }

    if (senderModel === "User") {
      sender = await User.findById(senderId);
    } else if (senderModel === "MPersonnel") {
      sender = await MPersonnel.findById(senderId);
    }

    if (!recipient) {
      return res
        .status(404)
        .json({ success: false, message: "Recipient not found" });
    }

    if (!sender) {
      return res
        .status(404)
        .json({ success: false, message: "Sender not found" });
    }

    let newChat;

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
        res
          .status(500)
          .json({ success: false, message: "Error uploading image" });
      });

      fileStream.on("finish", async () => {
        const [metadata] = await file.getMetadata();
        const fileSize = metadata.size;

        const imageUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${fileName}?alt=media`;

        newChat = new Chat({
          message,
          image: imageUrl,
          imageName: originalFileName,
          recipient: recipient._id,
          sender: sender._id,
          recipientModel,
          senderModel,
          fileSize,
        });

        await newChat.save();

        // ส่งข้อความใหม่ให้ผู้ใช้ทุกนที่เชื่อมต่อ

        res.json({
          success: true,
          message: "Chat message with image saved",
          imageUrl,
          imageName: originalFileName,
          fileSize,
        });
      });

      fileStream.end(req.file.buffer);
    } else {
      newChat = new Chat({
        message,
        recipient: recipient._id,
        sender: sender._id,
        recipientModel,
        senderModel,
      });

      await newChat.save();

      res.json({ success: true, message: "Chat message without image saved" });
    }
  } catch (error) {
    console.error("Error saving chat message:", error);
    res
      .status(500)
      .json({ success: false, message: "Error saving chat message" });
  }
});

//แชทใหม่
app.post("/sendchatnew", uploadimg.single("image"), async (req, res) => {
  try {
    const { message, recipientId, senderId, recipientModel, senderModel } =
      req.body;
    const roomId = recipientId; // ใช้ userId เป็น roomId
    let recipient, sender;

    if (recipientModel === "User") {
      recipient = await User.findById(recipientId);
    } else if (recipientModel === "MPersonnel") {
      recipient = await MPersonnel.findById(recipientId);
    }

    if (senderModel === "User") {
      sender = await User.findById(senderId);
    } else if (senderModel === "MPersonnel") {
      sender = await MPersonnel.findById(senderId);
    }

    if (!recipient || !sender) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    const newChat = new Chat({
      message,
      recipient: recipient._id,
      sender: sender._id,
      recipientModel,
      senderModel,
    });

    await newChat.save();

    // กระจายข้อความแบบเรียลไทม์
    io.to(roomId).emit("receiveMessage", newChat);

    res.json({ success: true, message: "Chat message saved", newChat });
  } catch (error) {
    console.error("Error saving chat message:", error);
    res
      .status(500)
      .json({ success: false, message: "Error saving chat message" });
  }
});

io.on("connection", (socket) => {
  console.log("A user connected:", socket.id);

  // เข้าห้องแชท
  socket.on("joinRoom", (roomId) => {
    socket.join(roomId);
    console.log(`User joined room: ${roomId}`);
  });

  // รับข้อความใหม่ที่ส่งเข้ามา (แต่ไม่บันทึกฐานข้อมูล)
  socket.on("sendMessage", (data) => {
    const { roomId, message } = data;
    console.log(`Message received in room ${roomId}:`, message);

    // กระจายข้อความไปยังสมาชิกในห้อง
    io.to(roomId).emit("receiveMessage", data);
  });

  socket.on("disconnect", () => {
    console.log("A user disconnected:", socket.id);
  });
});

app.get("/getChatHistory/:roomId", async (req, res) => {
  try {
    const { roomId } = req.params;

    // ดึงประวัติแชทที่เกี่ยวข้องกับ roomId
    const chatHistory = await Chat.find({
      $or: [{ recipient: roomId }, { sender: roomId }],
    })
      .populate("sender", "name username") // เพิ่มข้อมูลผู้ส่ง
      .populate("recipient", "name username") // เพิ่มข้อมูลผู้รับ
      .sort({ createdAt: 1 }); // เรียงลำดับตามเวลาที่สร้าง

    res.json({ success: true, chatHistory });
  } catch (error) {
    console.error("Error fetching chat history:", error);
    res
      .status(500)
      .json({ success: false, message: "Error fetching chat history" });
  }
});
app.get("/users", async (req, res) => {
  try {
    const users = await User.find({}, "name surname username"); // เลือกเฉพาะฟิลด์ที่ต้องการ
    res.json({ success: true, users });
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
// ----------------
app.get("/users", async (req, res) => {
  try {
    const users = await User.find(
      { deletedAt: null },
      "name surname username"
    ).lean();

    for (let user of users) {
      const latestChat = await Chat.findOne({
        $or: [{ sender: user._id }, { recipient: user._id }],
      })
        .sort({ createdAt: -1 })
        .populate("sender", "name surname")
        .populate("recipient", "name surname");

      if (latestChat) {
        const isSender =
          latestChat.sender._id.toString() === user._id.toString();
        user.latestChat = {
          message: latestChat.message,
          senderName: isSender
            ? "You"
            : `${latestChat.sender.name} ${latestChat.sender.surname}`,
        };
      } else {
        user.latestChat = null;
      }
    }

    res.json({ success: true, users });
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({ success: false, message: "Error fetching users" });
  }
});

//   ---------------------------------------------------------------------------------------------
//คู่กัน
const chatSchema = new mongoose.Schema(
  {
    message: String,
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: "senderModel",
    },
    image: String,
    imageName: {
      type: String,
      default: null,
    },
    recipientIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "MPersonnel" }],
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: "recipientModel",
    },
    senderModel: {
      type: String,
      required: true,
      enum: ["User", "MPersonnel"],
    },
    recipientModel: {
      type: String,
      // required: true,
      enum: ["User", "MPersonnel"],
    },
    isRead: {
      type: Boolean,
      default: false,
    },
    readAt: Date,
    readBy: [
      {
        type: mongoose.Schema.Types.ObjectId,
        refPath: "recipientModel",
      },
    ],
    fileSize: {
      type: Number,
      default: null,
    },
  },

  {
    collection: "Chat",
    timestamps: true,
  }
);

mongoose.model("Chat", chatSchema);

//แชท Ver ก่อนหน้าอันล่าง มี id ผู้รับ
io.on("connection", (socket) => {
  console.log("A user connected:", socket.id);

  // เข้าห้องแชท
  socket.on("joinRoom", (roomId) => {
    socket.join(roomId);
    console.log(`User joined room: ${roomId}`);
  });

  socket.on("sendMessage", async (data) => {
    const { roomId, message } = data;
    console.log(`Message received in room ${roomId}:`, message);

    try {
      // กระจายข้อความไปยังสมาชิกในห้อง
      io.to(roomId).emit("receiveMessage", data);

      // อัปเดตแชทล่าสุดสำหรับผู้ใช้ทุกคน
      const updatedUsers = await User.find(
        { deletedAt: null },
        "name surname username"
      ).lean();
      for (let user of updatedUsers) {
        const latestChat = await Chat.findOne({
          $or: [{ sender: user._id }, { recipient: user._id }],
        })
          .sort({ createdAt: -1 }) // เรียงลำดับเพื่อให้ได้แชทล่าสุด
          .populate("sender", "name surname") // ข้อมูลของผู้ส่ง
          .populate("recipient", "name surname"); // ข้อมูลของผู้รับ

        if (latestChat) {
          user.latestChat = {
            message: latestChat.message,
            file: latestChat.image,
            senderId: latestChat.sender._id,
            createdAt: latestChat.createdAt,
            senderName: `${latestChat.sender.name} ${latestChat.sender.surname}`,
          };
        } else {
          user.latestChat = null;
        }
      }

      // ส่งข้อมูลผู้ใช้ที่อัปเดตไปยังทุกๆ ผู้ใช้ที่เชื่อมต่อ
      io.emit("usersUpdated", updatedUsers);
    } catch (error) {
      console.error("Error updating users:", error);
    }
  });

  // อัปเดตข้อความเมื่อมีการอ่านข้อความ
  socket.on("markAsRead", async ({ roomId, messageId, userId }) => {
    try {
      // ตรวจสอบ userId ว่าเป็น ObjectId ที่ถูกต้อง
      if (!mongoose.Types.ObjectId.isValid(userId)) {
        console.error(`Invalid userId: ${userId}`);
        return;
      }
      const chatMessage = await Chat.findById(messageId);

      if (!chatMessage) {
        console.error(`Message not found: ${messageId}`);
        return;
      }

      // ตรวจสอบว่า userId ไม่ซ้ำใน readBy และไม่ใช่ผู้ส่งเอง
      const isAlreadyRead = chatMessage.readBy.some(
        (readerId) => readerId.toString() === userId
      );
      if (!isAlreadyRead && chatMessage.sender.toString() !== userId) {
        chatMessage.readBy.push(userId);
        // ลบค่าซ้ำ (หากมี)
        chatMessage.readBy = [...new Set(chatMessage.readBy.map(String))];
        await chatMessage.save();

        // ส่งข้อมูลอัปเดตให้ทุกคนในห้อง
        io.to(roomId).emit("readByUpdated", {
          messageId,
          readBy: chatMessage.readBy,
        });
        console.log(`Message ${messageId} marked as read by ${userId}`);
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
    const { message, recipientId, senderId, recipientModel, senderModel } =
      req.body;
    const roomId = recipientId; // ใช้ userId เป็น roomId
    let recipient, sender;
    if (message.length > 1000) {
      return res.status(400).json({
        success: false,
        message: "Message exceeds the maximum length of 1000 characters.",
      });
    }

    if (recipientModel === "User") {
      recipient = await User.findById(recipientId);
    } else if (recipientModel === "MPersonnel") {
      recipient = await MPersonnel.findById(recipientId);
    }

    if (senderModel === "User") {
      sender = await User.findById(senderId);
    } else if (senderModel === "MPersonnel") {
      sender = await MPersonnel.findById(senderId);
    }

    if (!recipient || !sender) {
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
          recipient: recipient._id,
          sender: sender._id,
          recipientModel,
          senderModel,
          fileSize,
        });

        await newChat.save();
        await newChat.populate("sender", "name surname");

        // กระจายข้อความแบบเรียลไทม์
        io.to(roomId).emit("receiveMessage", newChat);
        // อัปเดตแชทล่าสุดของผู้ใช้และส่งข้อมูล `usersUpdated` ไปยังทุกคน
        const updatedUsers = await User.find(
          { deletedAt: null },
          "name surname username"
        ).lean();
        for (let user of updatedUsers) {
          const latestChat = await Chat.findOne({
            $or: [{ sender: user._id }, { recipient: user._id }],
          })
            .sort({ createdAt: -1 })
            .populate("sender", "name surname")
            .populate("recipient", "name surname");

          if (latestChat) {
            user.latestChat = {
              message: latestChat.message,
              file: latestChat.image,
              senderId: latestChat.sender._id,
              createdAt: latestChat.createdAt,
              senderName: `${latestChat.sender.name} ${latestChat.sender.surname}`,
            };
          } else {
            user.latestChat = null;
          }
        }

        io.emit("usersUpdated", updatedUsers);
        res.json({
          success: true,
          message: "Chat message with image saved",
          newChat,
          imageUrl,
          imageName: originalFileName,
          fileSize,
        });
      });

      fileStream.end(req.file.buffer);
    } else {
      // กรณีไม่มีไฟล์
      newChat = new Chat({
        message,
        recipient: recipient._id,
        sender: sender._id,
        recipientModel,
        senderModel,
      });

      await newChat.save();
      await newChat.populate("sender", "name surname");

      // กระจายข้อความแบบเรียลไทม์
      io.to(roomId).emit("receiveMessage", newChat);
      // อัปเดตแชทล่าสุดของผู้ใช้และส่งข้อมูล `usersUpdated` ไปยังทุกคน
      const updatedUsers = await User.find(
        { deletedAt: null },
        "name surname username"
      ).lean();
      for (let user of updatedUsers) {
        const latestChat = await Chat.findOne({
          $or: [{ sender: user._id }, { recipient: user._id }],
        })
          .sort({ createdAt: -1 })
          .populate("sender", "name surname")
          .populate("recipient", "name surname");

        if (latestChat) {
          user.latestChat = {
            message: latestChat.message,
            file: latestChat.image,
            senderId: latestChat.sender._id,
            createdAt: latestChat.createdAt,
            senderName: `${latestChat.sender.name} ${latestChat.sender.surname}`,
          };
        } else {
          user.latestChat = null;
        }
      }

      io.emit("usersUpdated", updatedUsers);
      res.json({ success: true, message: "Chat message saved", newChat });
    }
  } catch (error) {
    console.error("Error saving chat message:", error);
    res
      .status(500)
      .json({ success: false, message: "Error saving chat message" });
  }
});

//แบบเอาไอดีแพทย์ทุกคนไปเก็บที่ผู้รับ มันแสดงผลช้า
// app.post('/sendchatnew', uploadimg.single('image'), async (req, res) => {
//   try {
//     const { message, senderId, senderModel, recipientId, recipientModel } = req.body;
//     const roomId = recipientId;
//     if (message.length > 1000) {
//       return res.status(400).json({
//         success: false,
//         message: 'Message exceeds the maximum length of 1000 characters.',
//       });
//     }

//     // หา Sender
//     const sender = await (senderModel === 'User' ? User.findById(senderId) : MPersonnel.findById(senderId));
//     if (!sender) {
//       return res.status(404).json({ success: false, message: 'Sender not found' });
//     }

//     let newChat;

//     if (senderModel === 'User') {
//       // กรณี User ส่งข้อความถึง MPersonnel ทุกคน
//       const recipients = await MPersonnel.find({}, '_id');
//       if (!recipients || recipients.length === 0) {
//         return res.status(404).json({ success: false, message: 'No recipients found' });
//       }

//       const recipientIds = recipients.map((recipient) => recipient._id);

//       if (req.file) {
//         const { imageUrl, originalFileName, fileSize } = await uploadImageToStorage(req.file); // ใช้ฟังก์ชันแยกสำหรับอัปโหลด
//         newChat = new Chat({
//           message,
//           image: imageUrl,
//           imageName: originalFileName,
//           sender: sender._id,
//           senderModel,
//           recipientIds,
//           fileSize,
//         });
//       } else {
//         newChat = new Chat({
//           message,
//           sender: sender._id,
//           senderModel,
//           recipientIds,
//         });
//       }

//       await newChat.save();
//       io.to(roomId).emit('receiveMessage', newChat);
//       // io.emit('receiveMessage', newChat); // กระจายข้อความถึงทุกคน
//     } else if (senderModel === 'MPersonnel') {
//       // กรณี MPersonnel ส่งข้อความถึง User คนเดียว
//       const recipient = await User.findById(recipientId);
//       if (!recipient) {
//         return res.status(404).json({ success: false, message: 'Recipient not found' });
//       }

//       if (req.file) {
//         const { imageUrl, originalFileName, fileSize } = await uploadImageToStorage(req.file);
//         newChat = new Chat({
//           message,
//           image: imageUrl,
//           imageName: originalFileName,
//           sender: sender._id,
//           senderModel,
//           recipient: recipient._id,
//           recipientModel,
//           fileSize,
//         });
//       } else {
//         newChat = new Chat({
//           message,
//           sender: sender._id,
//           senderModel,
//           recipient: recipient._id,
//           recipientModel,
//         });
//       }

//       await newChat.save();
//       io.to(roomId).emit('receiveMessage', newChat);
//       // io.to(recipientId).emit('receiveMessage', newChat); // ส่งข้อความถึง User คนเดียว
//     }

//     return res.json({ success: true, message: 'Chat message saved', newChat });
//   } catch (error) {
//     console.error('Error saving chat message:', error);
//     return res.status(500).json({ success: false, message: 'Error saving chat message' });
//   }
// });

// ฟังก์ชันแยกสำหรับอัปโหลดไฟล์
// const uploadImageToStorage = async (file) => {
//   const bucket = admin.storage().bucket();
//   const fileName = file.originalname;
//   const storageFile = bucket.file(fileName);
//   const originalFileName = Buffer.from(file.originalname, 'latin1').toString('utf8');

//   const fileStream = storageFile.createWriteStream({
//     metadata: { contentType: file.mimetype },
//   });

//   return new Promise((resolve, reject) => {
//     fileStream.on('error', (err) => reject(err));

//     fileStream.on('finish', async () => {
//       const [metadata] = await storageFile.getMetadata();
//       resolve({
//         imageUrl: `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(fileName)}?alt=media`,
//         originalFileName,
//         fileSize: metadata.size,
//       });
//     });

//     fileStream.end(file.buffer);
//   });
// };

app.get("/getChatHistory/:roomId", async (req, res) => {
  try {
    const { roomId } = req.params;

    // ดึงประวัติแชทที่เกี่ยวข้องกับ roomId
    const chatHistory = await Chat.find({
      $or: [{ recipient: roomId }, { sender: roomId }],
    })
      .populate("sender", "name username surname ") // เพิ่มข้อมูลผู้ส่ง
      .populate("recipient", "name username surname") // เพิ่มข้อมูลผู้รับ
      .sort({ createdAt: 1 }); // เรียงลำดับตามเวลาที่สร้าง

    res.json({ success: true, chatHistory });
  } catch (error) {
    console.error("Error fetching chat history:", error);
    res
      .status(500)
      .json({ success: false, message: "Error fetching chat history" });
  }
});
// app.get('/users', async (req, res) => {
//   try {
//     const users = await User.find({ deletedAt: null }, 'name surname username').lean();

//     for (let user of users) {
//       const latestChat = await Chat.findOne({
//         $or: [
//           { sender: user._id },
//           { recipient: user._id }
//         ]
//       })
//       .sort({ createdAt: -1 })
//       .populate('sender', 'name surname')
//       .populate('recipient', 'name surname');

//       user.latestChat = latestChat ? latestChat.message : null;
//     }

//     res.json({ success: true, users });
//   } catch (error) {
//     console.error('Error fetching users:', error);
//     res.status(500).json({ success: false, message: 'Error fetching users' });
//   }
// });
app.get("/users", async (req, res) => {
  try {
    const users = await User.find(
      { deletedAt: null },
      "name surname username"
    ).lean();

    for (let user of users) {
      const latestChat = await Chat.findOne({
        $or: [{ sender: user._id }, { recipient: user._id }],
      })
        .sort({ createdAt: -1 })
        .populate("sender", "name surname")
        .populate("recipient", "name surname");

      if (latestChat) {
        user.latestChat = {
          message: latestChat.message,
          file: latestChat.image,
          senderId: latestChat.sender._id,
          createdAt: latestChat.createdAt,
          senderName: `${latestChat.sender.name} ${latestChat.sender.surname}`,
        };
      } else {
        user.latestChat = null;
      }
    }

    res.json({ success: true, users });
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

//   ---------------------------------------------------------------------------------------------

//แชทใหม่่ โอเคแล้ว ใช้ RoomId
io.on("connection", (socket) => {
  console.log("A user connected:", socket.id);

  // เข้าห้องแชท
  socket.on("joinRoom", (roomId) => {
    socket.join(roomId);
    console.log(`User joined room: ${roomId}`);
  });

  socket.on("sendMessage", async (data) => {
    const { roomId, message } = data;
    console.log(`Message received in room ${roomId}:`, message);

    try {
      // กระจายข้อความไปยังสมาชิกในห้อง
      io.to(roomId).emit("receiveMessage", data);

      const updatedUsers = await User.find(
        { deletedAt: null },
        "name surname username"
      ).lean();

      for (let user of updatedUsers) {
        // ดึงแชทล่าสุดที่เกี่ยวข้องกับ roomId ของผู้ใช้ (ผู้ใช้เป็น roomId)
        const latestChat = await Chat.findOne({
          roomId: user._id, // ใช้ roomId เป็น id ของผู้ใช้
        })
          .sort({ createdAt: -1 }) // เรียงลำดับตามเวลาที่สร้าง
          .populate("sender", "name surname"); // ข้อมูลผู้ส่ง

        // เพิ่มแชทล่าสุดในข้อมูลผู้ใช้
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

      io.emit("usersUpdated", updatedUsers);
    } catch (error) {
      console.error("Error updating users:", error);
    }
  });

  // อัปเดตข้อความเมื่อมีการอ่านข้อความ
  socket.on("markAsRead", async ({ roomId, messageId, userId }) => {
    try {
      // ตรวจสอบ userId ว่าเป็น ObjectId ที่ถูกต้อง
      if (!mongoose.Types.ObjectId.isValid(userId)) {
        console.error(`Invalid userId: ${userId}`);
        return;
      }
      const chatMessage = await Chat.findById(messageId);

      if (!chatMessage) {
        console.error(`Message not found: ${messageId}`);
        return;
      }

      // ตรวจสอบว่า userId ไม่ซ้ำใน readBy และไม่ใช่ผู้ส่งเอง
      const isAlreadyRead = chatMessage.readBy.some(
        (readerId) => readerId.toString() === userId
      );
      if (!isAlreadyRead && chatMessage.sender.toString() !== userId) {
        chatMessage.readBy.push(userId);
        // ลบค่าซ้ำ (หากมี)
        chatMessage.readBy = [...new Set(chatMessage.readBy.map(String))];
        await chatMessage.save();

        // ส่งข้อมูลอัปเดตให้ทุกคนในห้อง
        io.to(roomId).emit("readByUpdated", {
          messageId,
          readBy: chatMessage.readBy,
        });
        console.log(`Message ${messageId} marked as read by ${userId}`);
      }
    } catch (error) {
      console.error("Error updating readBy:", error);
    }
  });

  socket.on("disconnect", () => {
    console.log("A user disconnected:", socket.id);
  });
});

//ใช้ Rommid แทนผู้รับ
app.post("/sendchatnew", uploadimg.single("image"), async (req, res) => {
  try {
    const { message, roomId, senderId, senderModel } = req.body;
    let sender;
    if (message.length > 1000) {
      return res.status(400).json({
        success: false,
        message: "Message exceeds the maximum length of 1000 characters.",
      });
    }

    // if (recipientModel === 'User') {
    //   recipient = await User.findById(recipientId);
    // } else if (recipientModel === 'MPersonnel') {
    //   recipient = await MPersonnel.findById(recipientId);
    // }

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
        });

        await newChat.save();
        await newChat.populate("sender", "name surname");

        // กระจายข้อความแบบเรียลไทม์
        io.to(roomId).emit("receiveMessage", newChat);
        const updatedUsers = await User.find(
          { deletedAt: null },
          "name surname username"
        ).lean();

        for (let user of updatedUsers) {
          // ดึงแชทล่าสุดที่เกี่ยวข้องกับ roomId ของผู้ใช้ (ผู้ใช้เป็น roomId)
          const latestChat = await Chat.findOne({
            roomId: user._id, // ใช้ roomId เป็น id ของผู้ใช้
          })
            .sort({ createdAt: -1 }) // เรียงลำดับตามเวลาที่สร้าง
            .populate("sender", "name surname"); // ข้อมูลผู้ส่ง

          // เพิ่มแชทล่าสุดในข้อมูลผู้ใช้
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

        io.emit("usersUpdated", updatedUsers);
        res.json({
          success: true,
          message: "Chat message with image saved",
          newChat,
          imageUrl,
          imageName: originalFileName,
          fileSize,
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
      });

      await newChat.save();
      await newChat.populate("sender", "name surname");

      // กระจายข้อความแบบเรียลไทม์
      io.to(roomId).emit("receiveMessage", newChat);
      const updatedUsers = await User.find(
        { deletedAt: null },
        "name surname username"
      ).lean();

      for (let user of updatedUsers) {
        // ดึงแชทล่าสุดที่เกี่ยวข้องกับ roomId ของผู้ใช้ (ผู้ใช้เป็น roomId)
        const latestChat = await Chat.findOne({
          roomId: user._id, // ใช้ roomId เป็น id ของผู้ใช้
        })
          .sort({ createdAt: -1 }) // เรียงลำดับตามเวลาที่สร้าง
          .populate("sender", "name surname"); // ข้อมูลผู้ส่ง

        // เพิ่มแชทล่าสุดในข้อมูลผู้ใช้
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

      io.emit("usersUpdated", updatedUsers);
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

    if (!chatHistory.length) {
      return res.status(404).json({
        success: false,
        message: "No chat history found for this roomId",
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
//ดึง user แบบธรรมดา
// app.get('/users', async (req, res) => {
//   try {
//     const users = await User.find({ deletedAt: null }, 'name surname username').lean();

//     for (let user of users) {
//       const latestChat = await Chat.findOne({
//         $or: [
//           { sender: user._id },
//           { recipient: user._id }
//         ]
//       })
//       .sort({ createdAt: -1 }) 
//       .populate('sender', 'name surname') 
//       .populate('recipient', 'name surname');

//       user.latestChat = latestChat ? latestChat.message : null; 
//     }

//     res.json({ success: true, users });
//   } catch (error) {
//     console.error('Error fetching users:', error);
//     res.status(500).json({ success: false, message: 'Error fetching users' });
//   }
// });
app.get("/users", async (req, res) => {
  try {
    // ดึงรายการผู้ใช้ที่ยังไม่ถูกลบ
    const users = await User.find(
      { deletedAt: null },
      "name surname username"
    ).lean();

    for (let user of users) {
      // ดึงแชทล่าสุดที่เกี่ยวข้องกับ roomId ของผู้ใช้ (ผู้ใช้เป็น roomId)
      const latestChat = await Chat.findOne({
        roomId: user._id, // ใช้ roomId เป็น id ของผู้ใช้
      })
        .sort({ createdAt: -1 }) // เรียงลำดับตามเวลาที่สร้าง
        .populate("sender", "name surname"); // ข้อมูลผู้ส่ง

      // เพิ่มแชทล่าสุดในข้อมูลผู้ใช้
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

    // ส่งข้อมูลผู้ใช้ทั้งหมดกลับไปพร้อมแชทล่าสุด
    res.json({ success: true, users });
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




io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

  // เข้าห้องแชท
  socket.on('joinRoom', (roomId) => {
    socket.join(roomId);
    console.log(`User joined room: ${roomId}`);
  });

  socket.on('sendMessage', async (data) => {
    const { roomId, message, senderId } = data;
    console.log(`Message received in room ${roomId}:`, message);
  
    try {
      
      io.to(roomId).emit('receiveMessage', data);
  
      const updatedUsers = await User.find({ deletedAt: null }, 'name surname username').lean();
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
        io.emit('usersUpdated', { updatedUsers, senderId });
    } catch (error) {
      console.error('Error updating users:', error);
    }
  });
  
    // อัปเดตข้อความเมื่อมีการอ่านข้อความ
    socket.on("markAsRead", async ({ roomId, messageId, userId }) => {
      try {
        // ตรวจสอบ userId ว่าเป็น ObjectId ที่ถูกต้อง
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
            await Chat.findByIdAndUpdate(
              messageId,
              { $addToSet: { readBy: userId } }, // ป้องกันค่าซ้ำใน readBy
              { new: true } // คืนค่าที่อัปเดตกลับมา
            );
         const chats = await Chat.find({
          roomId,
          sender: { $ne: userId },
          readBy: { $nin: [userId] },
        });
            // ส่งข้อมูลอัปเดตให้ทุกคนในห้อง
            io.to(roomId).emit("readByUpdated", {
              messageId,
              readBy: [...chatMessage.readBy, userId], // รวม userId ใหม่
              unreadCount: chats.length,
            });
            console.log(`Message ${messageId} marked as read by ${userId}`);
          }
        }
        
      } catch (error) {
        console.error("Error updating readBy:", error);
      }
    });
  
  socket.on('disconnect', () => {
    console.log('A user disconnected:', socket.id);
  });
});


//เริ่มต้นแก้ใหม่ 191267
io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

  // เข้าห้องแชท
  socket.on('joinRoom', (roomId) => {
    socket.join(roomId);
    console.log(`User joined room: ${roomId}`);
  });
//มันเอาไปแสดงที่คนเดียวแต่เป็นข้อมูลทุกคน
socket.on('sendMessage', async (data) => {
  const { roomId, message, senderId } = data;
  console.log(`Message received in room ${roomId}:`, message);

  try {
    
    io.to(roomId).emit('receiveMessage', data);

  // ดึงรายชื่อผู้ใช้ที่เกี่ยวข้องในระบบ
  const users = await User.find({ deletedAt: null }, '_id name surname').lean();
  const personnels = await MPersonnel.find({}, '_id name surname').lean();

  const allUsers = [...users, ...personnels];

  // อัปเดต unreadCount และ latestChat ของผู้ใช้แต่ละคน
  const updatedUsers = await Promise.all(
    allUsers.map(async (user) => {
      const unreadCount = await Chat.countDocuments({
        roomId,
        sender: { $ne: user._id }, // ไม่ใช่ข้อความที่ส่งโดยผู้ใช้เอง
        readBy: { $nin: [user._id] }, // ผู้ใช้ยังไม่ได้อ่าน
      });
      console.log("roomId:", roomId);
      console.log("userId:", user._id);
      console.log("Unread Query:", {
        roomId,
        sender: { $ne: user._id },
        readBy: { $nin: [user._id] },
      });
      
      console.log("ยังไม่อ่าน",unreadCount)
      const latestChat = await Chat.findOne({ roomId })
        .sort({ createdAt: -1 })
        .populate('sender', 'name surname');

      return {
        userId: user._id,
        name: user.name,
        surname: user.surname,
        unreadCount,
        latestChat: latestChat
          ? {
              message: latestChat.message,
              senderName: `${latestChat.sender.name} ${latestChat.sender.surname}`,
              createdAt: latestChat.createdAt,
            }
          : null,
      };
    })
  );

  // ส่งข้อมูลการอัปเดตไปยังทุกคน
  io.emit('usersUpdated', updatedUsers);
  } catch (error) {
    console.error('Error updating users:', error);
  }
});

  // อัปเดตข้อความเมื่อมีการอ่านข้อความ
  socket.on("markAsRead", async ({ roomId, messageId, userId }) => {
    try {
      // ตรวจสอบ userId ว่าเป็น ObjectId ที่ถูกต้อง
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
          await Chat.findByIdAndUpdate(
            messageId,
            { $addToSet: { readBy: userId } }, // ป้องกันค่าซ้ำใน readBy
            { new: true } // คืนค่าที่อัปเดตกลับมา
          );
       const chats = await Chat.find({
        roomId,
        sender: { $ne: userId },
        readBy: { $nin: [userId] },
      });
          // ส่งข้อมูลอัปเดตให้ทุกคนในห้อง
          io.to(roomId).emit("readByUpdated", {
            messageId,
            readBy: [...chatMessage.readBy, userId], // รวม userId ใหม่
            unreadCount: chats.length,
          });
          console.log(`Message ${messageId} marked as read by ${userId}`);
        }
      }
      
    } catch (error) {
      console.error("Error updating readBy:", error);
    }
  });

socket.on('disconnect', () => {
  console.log('A user disconnected:', socket.id);
});
});


//เอาจำนวน+แชทล่าสุด ของคนส่งไปแสดงทุกที่
socket.on('sendMessage', async (data) => {
  const { roomId, message, senderId } = data;

  try {
    io.to(roomId).emit('receiveMessage', data);

    // ดึงข้อมูลผู้ใช้ทั้งหมด
    const allUsers = await Promise.all([
      User.find({ deletedAt: null }, 'name surname username').lean(),
      MPersonnel.find({ deletedAt: null }, 'name surname username').lean(),
    ]);
    const combinedUsers = [...allUsers[0], ...allUsers[1]];

    // คำนวณข้อความที่ยังไม่ได้อ่านและแชทล่าสุด
    const userUnreadPromises = combinedUsers.map(async (user) => {
      const unreadChats = await Chat.find({
        roomId: user._id,
        sender: { $ne: senderId },
        readBy: { $nin: [senderId] },
      });

      const latestChat = await Chat.findOne({
        roomId: user._id,
      })
        .sort({ createdAt: -1 })
        .populate("sender", "name surname");

      return {
        ...user,
        unreadCount: unreadChats.length,
        latestChat: latestChat
          ? {
              message: latestChat.message,
              file: latestChat.image,
              senderId: latestChat.sender._id,
              createdAt: latestChat.createdAt,
              senderName: `${latestChat.sender.name} ${latestChat.sender.surname}`,
            }
          : null,
      };
    });

    const updatedUsers = await Promise.all(userUnreadPromises);

    // ส่งข้อมูลอัปเดตให้ผู้ใช้ทั้งหมด
    io.emit('usersUpdated', updatedUsers);
  } catch (error) {
    console.error('Error updating users:', error);
  }
});









app.get("/users", async (req, res) => {
  try {
    const userId = req.query.senderId;
    // ดึงผู้ใช้ทั้งหมด
    const users = await User.find(
      { deletedAt: null },
      "name surname username"
    ).lean();

    // ดึง Room ที่ผู้ใช้ล็อกอินเป็นสมาชิก
    const rooms = await Room.find({
      "participants.id": userId,
    }).lean();

    const usersWithChats = await Promise.all(
      users.map(async (user) => {
        // ตรวจสอบว่า User คนนี้อยู่ใน Room ที่เกี่ยวข้องกับ Current User หรือไม่
        const userRooms = rooms.filter((room) =>
          room.participants.some((p) => String(p.id) === String(user._id))
        );

        // ถ้าผู้ใช้ไม่ได้อยู่ใน Room เดียวกันกับ Current User ให้ข้าม
        if (userRooms.length === 0) {
          return null;
        }

        let latestChat = null;
        let totalUnreadCount = 0;

        // คำนวณแชทล่าสุดและจำนวนที่ยังไม่ได้อ่านในแต่ละ Room
        for (const room of userRooms) {
          // แชทล่าสุดใน Room นี้
          const roomLatestChat = await Chat.findOne({ roomId: room.roomId })
            .sort({ createdAt: -1 })
            .populate("sender", "name surname")
            .lean();

          if (roomLatestChat) {
            // อัปเดตแชทล่าสุด
            if (
              !latestChat ||
              new Date(roomLatestChat.createdAt) > new Date(latestChat.createdAt)
            ) {
              latestChat = {
                message: roomLatestChat.message,
                file: roomLatestChat.image,
                senderId: roomLatestChat.sender._id,
                senderName: `${roomLatestChat.sender.name} ${roomLatestChat.sender.surname}`,
                createdAt: roomLatestChat.createdAt,
              };
            }

            // นับจำนวนข้อความที่ Current User ยังไม่ได้อ่านใน Room นี้
            const unreadCount = await Chat.countDocuments({
              roomId: room.roomId,
              readBy: { $ne: userId },
            });

            totalUnreadCount += unreadCount;
          }
        }

        return {
          _id: user._id,
          name: user.name,
          surname: user.surname,
          username: user.username,
          latestChat,
          unreadCount: totalUnreadCount,
        };
      })
    );

    // กรองผลลัพธ์ที่เป็น `null` (ผู้ใช้ที่ไม่ได้อยู่ใน Room เดียวกับ Current User)
    const filteredUsers = usersWithChats.filter((user) => user !== null);

    res.json({ success: true, users: filteredUsers });
  } catch (error) {
    console.error("Error fetching users with chats:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching users with chats",
    });
  }
});


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

        // กระจายข้อความแบบเรียลไทม์
        io.to(roomId).emit("receiveMessage", newChat);
        // คำนวณ unreadCount สำหรับแต่ละผู้ใช้
        // คำนวณ unreadCount สำหรับแต่ละผู้ใช้
        const updatedUsers = await User.find(
          { deletedAt: null },
          "name surname username"
        ).lean();

        const rooms = await Room.find({
          "participants.id": { $in: updatedUsers.map((user) => user._id) },
        }).lean();

        const usersWithChats = await Promise.all(
          updatedUsers.map(async (user) => {
            const userRooms = rooms.filter((room) =>
              room.participants.some((p) => String(p.id) === String(user._id))
            );

            if (userRooms.length === 0) {
              return null;
            }

            let latestChat = null;
            let unreadCount = {};

            for (const room of userRooms) {
              // ดึงแชทล่าสุดในห้อง
              const roomLatestChat = await Chat.findOne({ roomId: room.roomId })
                .sort({ createdAt: -1 })
                .populate("sender", "name surname")
                .lean();

              if (roomLatestChat) {
                if (
                  !latestChat ||
                  new Date(roomLatestChat.createdAt) >
                    new Date(latestChat.createdAt)
                ) {
                  latestChat = {
                    message: roomLatestChat.message,
                    file: roomLatestChat.image,
                    senderId: roomLatestChat.sender._id,
                    senderName: `${roomLatestChat.sender.name} ${roomLatestChat.sender.surname}`,
                    createdAt: roomLatestChat.createdAt,
                  };
                }
              }

              // ดึงจำนวนข้อความที่ยังไม่ได้อ่านสำหรับทุก participants ในห้องนี้
              for (const participant of room.participants) {
                const unreadCounts = await Chat.countDocuments({
                  roomId: room.roomId,
                  readBy: { $ne: participant.id }, // ตรวจสอบว่าใครยังไม่ได้อ่าน
                });

                unreadCount[participant.id] = unreadCounts;
              }
            }

            return {
              _id: user._id,
              name: user.name,
              surname: user.surname,
              username: user.username,
              latestChat,
              unreadCount,
            };
          })
        );
        const filteredUsers = usersWithChats.filter((user) => user !== null);
        console.log("📦 Filtered Users with Chats:", filteredUsers);

        // Broadcast ข้อมูลที่มี unreadCount ที่ถูกต้อง
        io.emit("usersUpdated", filteredUsers);
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
      io.to(roomId).emit("receiveMessage", newChat);
      // คำนวณ unreadCount สำหรับแต่ละผู้ใช้
      // คำนวณ unreadCount สำหรับแต่ละผู้ใช้
      const updatedUsers = await User.find(
        { deletedAt: null },
        "name surname username"
      ).lean();

      const rooms = await Room.find({
        "participants.id": { $in: updatedUsers.map((user) => user._id) },
      }).lean();

      const usersWithChats = await Promise.all(
        updatedUsers.map(async (user) => {
          const userRooms = rooms.filter((room) =>
            room.participants.some((p) => String(p.id) === String(user._id))
          );

          if (userRooms.length === 0) {
            return null;
          }

          let latestChat = null;
          let unreadCount = {};

          for (const room of userRooms) {
            // ดึงแชทล่าสุดในห้อง
            const roomLatestChat = await Chat.findOne({ roomId: room.roomId })
              .sort({ createdAt: -1 })
              .populate("sender", "name surname")
              .lean();

            if (roomLatestChat) {
              if (
                !latestChat ||
                new Date(roomLatestChat.createdAt) >
                  new Date(latestChat.createdAt)
              ) {
                latestChat = {
                  message: roomLatestChat.message,
                  file: roomLatestChat.image,
                  senderId: roomLatestChat.sender._id,
                  senderName: `${roomLatestChat.sender.name} ${roomLatestChat.sender.surname}`,
                  createdAt: roomLatestChat.createdAt,
                };
              }
            }

            // ดึงจำนวนข้อความที่ยังไม่ได้อ่านสำหรับทุก participants ในห้องนี้
            for (const participant of room.participants) {
              const unreadCounts = await Chat.countDocuments({
                roomId: room.roomId,
                readBy: { $ne: participant.id }, // ตรวจสอบว่าใครยังไม่ได้อ่าน
              });

              unreadCount[participant.id] = unreadCounts;
            }
          }

          return {
            _id: user._id,
            name: user.name,
            surname: user.surname,
            username: user.username,
            latestChat,
            unreadCount,
          };
        })
      );
      const filteredUsers = usersWithChats.filter((user) => user !== null);
      console.log("📦 Filtered Users with Chats:", filteredUsers);

      // Broadcast ข้อมูลที่มี unreadCount ที่ถูกต้อง
      io.emit("usersUpdated", filteredUsers);

      res.json({ success: true, message: "Chat message saved", newChat });
    }
  } catch (error) {
    console.error("Error saving chat message:", error);
    res
      .status(500)
      .json({ success: false, message: "Error saving chat message" });
  }
});

app.get("/update-unread-count", async (req, res) => {
  try {

    // ดึงข้อมูลผู้ใช้ที่ไม่ถูกลบ
    const updatedUsers = await User.find(
      { deletedAt: null },
      "name surname username"
    ).lean();

    // ดึงข้อมูล MPersonnel
    const updatedMPersonnel = await MPersonnel.find(
      { deletedAt: null },
      "name surname username"
    ).lean();

    // รวม User และ MPersonnel
    const allParticipants = [...updatedUsers, ...updatedMPersonnel];

    // ดึงข้อมูลห้องทั้งหมดที่ผู้ใช้และ MPersonnel เป็นสมาชิก
    const rooms = await Room.find({
      "participants.id": { $in: allParticipants.map((participant) => participant._id) },
    }).lean();

    // คำนวณ unread count สำหรับแต่ละผู้ใช้ในห้องนี้
    const usersWithUnreadCounts = await Promise.all(
      allParticipants.map(async (participant) => {
        // หาห้องที่ผู้ใช้อยู่
        const userRooms = rooms.filter((room) =>
          room.participants.some((p) => String(p.id) === String(participant._id))
        );

        if (userRooms.length === 0) {
          return null;  // ถ้าผู้ใช้ไม่ได้อยู่ในห้องใดๆ ให้ข้ามไป
        }

        let unreadCount = {};

        // คำนวณ unread count สำหรับแต่ละห้องที่ผู้ใช้เป็นสมาชิก
        for (const room of userRooms) {
          const roomUnreadCount = await Chat.countDocuments({
            roomId: room.roomId,
            readBy: { $ne: participant._id }, // ตรวจสอบว่าแชทที่ยังไม่ได้อ่าน
          });

          unreadCount[room.roomId] = roomUnreadCount;
        }

        // คำนวณ total unread count สำหรับผู้ใช้
        const totalUnreadCount = Object.values(unreadCount).reduce(
          (acc, count) => acc + count,
          0
        );

        console.log(`📦 Total Unread Count for ${participant._id}:`, totalUnreadCount);

        return {
          userId: participant._id,
          unreadCount,
          totalUnreadCount,
        };
      })
    );

    // กรองเฉพาะผู้ใช้ที่มีข้อมูล (ไม่เป็น null)
    const totalfilteredUsers = usersWithUnreadCounts.filter((user) => user !== null);
    console.log('📦 Users with Unread Counts:', totalfilteredUsers);

    res.status(200).send({ success: true, users: filteredUsers });

  } catch (error) {
    console.error("Error updating unread count:", error);
    res.status(500).json({ success: false, message: "Error updating unread count" });
  }
});
app.get("/users", async (req, res) => {
  try {
    const userId = req.query.senderId;
    const updatedUsers = await User.find(
      { deletedAt: null },
      "name surname username"
    ).lean();

    const rooms = await Room.find({
      "participants.id": { $in: updatedUsers.map((user) => user._id) },
    }).lean();

    const usersWithChats = await Promise.all(
      updatedUsers.map(async (user) => {
        const userRooms = rooms.filter((room) =>
          room.participants.some((p) => String(p.id) === String(user._id))
        );

        if (userRooms.length === 0) {
          return null;
        }

        let latestChat = null;
        let unreadCount = {};

        for (const room of userRooms) {
          // ดึงแชทล่าสุดในห้อง
          const roomLatestChat = await Chat.findOne({ roomId: room.roomId })
            .sort({ createdAt: -1 })
            .populate("sender", "name surname")
            .lean();

          if (roomLatestChat) {
            if (
              !latestChat ||
              new Date(roomLatestChat.createdAt) >
                new Date(latestChat.createdAt)
            ) {
              latestChat = {
                message: roomLatestChat.message,
                file: roomLatestChat.image,
                senderId: roomLatestChat.sender._id,
                senderName: `${roomLatestChat.sender.name} ${roomLatestChat.sender.surname}`,
                createdAt: roomLatestChat.createdAt,
              };
            }
          }

          // ดึงจำนวนข้อความที่ยังไม่ได้อ่านสำหรับทุก participants ในห้องนี้
          for (const participant of room.participants) {
            const unreadCounts = await Chat.countDocuments({
              roomId: room.roomId,
              readBy: { $ne: participant.id }, // ตรวจสอบว่าใครยังไม่ได้อ่าน
            });

            unreadCount[participant.id] = unreadCounts;
          }
        }

        return {
          _id: user._id,
          name: user.name,
          surname: user.surname,
          username: user.username,
          latestChat,
          unreadCount,
        };
      })
    );
    const filteredUsers = usersWithChats.filter((user) => user !== null);
    console.log("📦 Filtered Users with Chats777:", filteredUsers);
    res.json({ success: true, users: filteredUsers });
  } catch (error) {
    console.error("Error fetching users with chats:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching users with chats",
    });
  }
});

app.delete("/deleteUser/:id", async (req, res) => {
  const UserId = req.params.id;
  const { adminPassword, adminId } = req.body; // adminId ต้องถูกส่งมาจากฝั่ง frontend
  try {
    // ตรวจสอบว่ามี Admin ที่ส่งคำขอหรือไม่
    const admin = await Admins.findById(adminId);

    if (!admin) {
      return res.status(401).json({
        status: "Unauthorized",
        data: "ไม่พบข้อมูลผู้ดูแลระบบหรือไม่ได้เข้าสู่ระบบ",
      });
    }

    // ตรวจสอบรหัสผ่าน Admin
    const isPasswordCorrect = await bcrypt.compare(adminPassword, admin.password); // Assuming passwords are hashed
    if (!isPasswordCorrect) {
      return res.status(401).json({
        status: "Unauthorized",
        data: "รหัสผ่านผู้ดูแลระบบไม่ถูกต้อง",
      });
    }

    // Mark user as deleted
    const result = await User.findByIdAndUpdate(
      UserId,
      {
        $set: {
          deletedAt: new Date(),
          deleteExpiry: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // +30 วัน
        },
      },
      { new: true }
    );


    if (result) {
      res.json({ status: "OK", data: "ลบข้อมูลผู้ป่วยสำเร็จ" });
    } else {
      res.status(404).json({
        status: "Not Found",
        data: "ไม่พบข้อมูลผู้ป่วยนี้หรือข้อมูลถูกลบไปแล้ว",
      });
    }
  } catch (error) {
    console.error("Error during deletion:", error);
    res.status(500).json({ status: "Error", data: "Internal Server Error" });
  }
});