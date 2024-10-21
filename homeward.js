// create colletion กับ Document
const mongoose = require("mongoose");

const UserDetailsScehma = new mongoose.Schema(
  {
    username: { type: String, unique: true },
    name: String,
    surname: String,
    email: { type: String, unique: true },
    password: String,
    isEmailVerified: { type: Boolean, default: false } 
  },
  {
    collection: "Admin",
    timestamps: true,
  }
);

mongoose.model("Admin", UserDetailsScehma);

const otpSchema = new mongoose.Schema({
  username: String,
  otp: String,
  createdAt: { type: Date, default: Date.now, expires: '10m' }
}, {
  collection: 'OTPModel'
});

mongoose.model("OTPModel", otpSchema);

const otpuserSchema = new mongoose.Schema({
  email:  String,
  otp: String,
  createdAt: { type: Date, default: Date.now, expires: '10m' }
}, {
  collection: 'OTPModelUser'
});

mongoose.model("OTPModelUser", otpuserSchema);

const equipmentScehma = new mongoose.Schema(
  {
    equipment_name: String,
    equipment_type: String,
    // admin:[{type: mongoose.Schema.Types.ObjectId,ref:'Admin'}]
  },
  {
    collection: "Equipment",
    timestamps: true,
  }
);

mongoose.model("Equipment", equipmentScehma);

const equipmentuserScehma = new mongoose.Schema(
  {
    equipmentname_forUser: String,
    equipmenttype_forUser: String,
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'

    }
  },
  {
    collection: "EquipmentUser",
    timestamps: true,
  }
);

mongoose.model("EquipmentUser", equipmentuserScehma);

const MPersonnelScehma = new mongoose.Schema(
  {
    username: { type: String, unique: true },
    password: String,
    email: { type: String, unique: true },
    tel: String,
    nametitle: String,
    name: String,
    surname: String,
    isEmailVerified: { type: Boolean, default: false } 
  },
  {
    collection: "MPersonnel",
    timestamps: true,
  }
);

mongoose.model("MPersonnel", MPersonnelScehma);

const CaremanualScehma = new mongoose.Schema(
  {
    caremanual_name: String,
    image: String,
    file: String,
    detail: String,
    views: { type: Number, default: 0 }, 
  },
  {
    collection: "Caremanual",
    timestamps: true,
  }
);

mongoose.model("Caremanual", CaremanualScehma);

//ผู้ป่วย
const UserScehma = new mongoose.Schema(
  {
    username: { type: String, unique: true },
    password: String,
    email: { type: String, sparse: true },
    tel: String,
    name: String,
    surname: String,
    gender: String,
    birthday: Date,
    ID_card_number: String,
    nationality: String,
    Address: String,
    deletedAt: { type: Date, default: null },
    // otp: String,
    // otpExpiration: { type: Date, default: Date.now, expires: '10m' },
    AdddataFirst: { type: Boolean, default: false },
    physicalTherapy: { type: Boolean, default: false },
    isEmailVerified: { type: Boolean, default: false } 
  },
  {
    collection: "User",
    timestamps: true,
  }
);

mongoose.model("User", UserScehma);

//ผู้ดูแล
const CaregiverScehma = new mongoose.Schema(
  {
    name: String,
    surname: String,
    Relationship: String,
    tel: String,
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  {
    collection: "Caregiver",
    timestamps: true,
  }
);

mongoose.model("Caregiver", CaregiverScehma);

//อาการ
const SymptomScehma = new mongoose.Schema(
  {
    name: String,
  },
  {
    collection: "Symptom",
    timestamps: true,
  }
);

mongoose.model("Symptom", SymptomScehma);

//ข้อมูลการเจ็บป่วย
const MedicalInformationSchema = new mongoose.Schema(
  {
    HN: String,
    AN: String,
    Date_Admit: Date,
    Date_DC: Date,
    Diagnosis: String,
    Chief_complaint: String,
    Present_illness: String,
    selectedPersonnel: String,
    Phychosocial_assessment: String,
    Management_plan: String,
    fileM: String,
    fileP: String,
    filePhy: String,
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // แก้เป็น ref: "User"
    // equipment: { type: mongoose.Schema.Types.ObjectId, ref: "Equipment" },
    // personnel: { type: mongoose.Schema.Types.ObjectId, ref: "MPersonnel" },
  },
  {
    collection: "MedicalInformation",
    timestamps: true,
  }
);
mongoose.model("MedicalInformation", MedicalInformationSchema);

//ฟอร์มบันทึกอาการ
const PatientFormSchema = new mongoose.Schema(
  {
    Symptoms: [String],
    SBP: Number,
    DBP: Number,
    PulseRate: Number,
    Temperature: Number,
    DTX: Number,
    Respiration: Number,
    LevelSymptom: String,
    Painscore: Number,
    request_detail: String,
    Recorder: String,
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },

  },
  {
    collection: "PatientForm",
    timestamps: true,
  }
);

mongoose.model("PatientForm", PatientFormSchema);


const AssessmentScehma = new mongoose.Schema(
  {
    suggestion: String,
    detail: String,
    status_name: String,
    PPS: Number,
    MPersonnel: { type: mongoose.Schema.Types.ObjectId, ref: "MPersonnel" },
    PatientForm: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PatientForm",
      unique: true,
    },
  },
  {
    collection: "Assessment",
    timestamps: true,
  }
);

mongoose.model("Assessment", AssessmentScehma);


const chatSchema = new mongoose.Schema(
  {
    message: String,
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: 'senderModel',
    },
    image: String,
    imageName: {
      type: String,
      default: null,
    },
    
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: 'recipientModel',
    },
    senderModel: {
      type: String,
      required: true,
      enum: ['User', 'MPersonnel'],
    },
    recipientModel: {
      type: String,
      required: true,
      enum: ['User', 'MPersonnel'],
    },
    isRead: {
      type: Boolean,
      default: false
    },
    readAt: Date,
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



const AlertSchema = new mongoose.Schema(
  {
    patientFormId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PatientForm",
      required: true
    },
    alertMessage: {
      type: String,
      required: true
    },
    createdAt: {
      type: Date,
      default: Date.now
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    viewedBy: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    }]
  },
  {
    collection: "Alert",
    timestamps: true,
  }
);

mongoose.model("Alert", AlertSchema);



const UserThresholdSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  SBP: { min: Number, max: Number },
  DBP: { min: Number, max: Number },
  PulseRate: { min: Number, max: Number },
  Temperature: { min: Number, max: Number },
  DTX: { min: Number, max: Number },
  Respiration: { min: Number, max: Number },
}, {
  collection: 'UserThresholds',
  timestamps: true,
});

mongoose.model('UserThreshold', UserThresholdSchema);

const ReadinessFormSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  MPersonnel: { type: mongoose.Schema.Types.ObjectId, ref: "MPersonnel" },
  Readiness1: {
    question1_1: { type: String, required: true },
    question1_2: { type: String, required: true },
    question1_3: { type: String, required: true },
    question1_4: { type: String, required: true },
  },
  Readiness2: {
    Disease: { type: String, required: true },
    Medication: { type: String, required: true },
    Environment: { type: String, required: true },
    Treatment: { type: String, required: true },
    Health: { type: String, required: true },
    Out_patient: { type: String, required: true },
    Diet: { type: String, required: true },
  },
  status_name: String,
}, {
  collection: 'ReadinessForm',
  timestamps: true,
});

mongoose.model('ReadinessForm', ReadinessFormSchema);

const ReadinessAssessmentSchema = new mongoose.Schema({
  ReadinessForm: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "ReadinessForm",
    required: true
  },
  MPersonnel: { type: mongoose.Schema.Types.ObjectId, ref: "MPersonnel" },
  readiness_status: String,
  detail: String,
}, {
  collection: 'ReadinessAssessment',
  timestamps: true,
});

mongoose.model('ReadinessAssessment', ReadinessAssessmentSchema);


// const AssessinhomesssSchema = new mongoose.Schema({
//   user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
//   Immobility: {
//     pickUpFood: { type: Number, required: true },
//     cleanUp: { type: Number, required: true },
//     putOnClothes: { type: Number, required: true },
//     shower: { type: Number, required: true },
//     usingToilet: { type: Number, required: true },
//     getUp: { type: Number, required: true },
//     walkInside: { type: Number, required: true },
//     upDownStairs: { type: Number, required: true },
//     continenceUrine: { type: Number, required: true },
//     continenceStool: { type: Number, required: true },
//     walkOutside: { type: Number, required: true },
//     cooking: { type: Number, required: true },
//     householdChores: { type: Number, required: true },
//     shopping: { type: Number, required: true },
//     takingPublicTransportation: { type: Number, required: true },
//     takingMedicine: { type: Number, required: true },
//     totalScore: { type: Number, required: true }
//   },
//   Nutrition: {

//   },
//   inhome_status: String,
// }, {
//   collection: 'Assessinhomesss',
//   timestamps: true,
// });

// mongoose.model('Assessinhomesss', AssessinhomesssSchema);