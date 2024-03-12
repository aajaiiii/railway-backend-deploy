// create colletion กับ Document
const mongoose = require("mongoose");


const UserDetailsScehma = new mongoose.Schema(
    {
        username:{type:String, unique:true},
        name:String,
        email: { type: String, unique: true },
        password:String
    },
    {
        collection: "Admin",
    }
);

mongoose.model("Admin",UserDetailsScehma);



const equipmentScehma = new mongoose.Schema(
    {
        equipment_name:String,
        equipment_type:String,
        // admin:[{type: mongoose.Schema.Types.ObjectId,ref:'Admin'}]

    },
    {
        collection: "Equipment",
    }
);

mongoose.model("Equipment",equipmentScehma);

const MPersonnelScehma = new mongoose.Schema(
    {
        username:{ type: String, unique: true } ,
        password:String,
        email: { type: String, unique: true },
        tel:String,
        nametitle:String,
        name:String,
        

    },
    {
        collection: "MPersonnel",
        timestamps: true,
    }
);

mongoose.model("MPersonnel", MPersonnelScehma);


const CaremanualScehma = new mongoose.Schema(
    {
        caremanual_name:String,
        image:String,
        file:String,
        detail:String,
        
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
        username:{ type: String, unique: true } ,
        password:String,
        email: { type: String, unique: true }, 
        tel:String,
        name:String,
        gender:String,
        birthday:Date,
        ID_card_number:String,
        nationality:String,
        Address:String,
         
     // caregiver:[{type: mongoose.Schema.Types.ObjectId,ref:'Caregiver'}]
    
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
        name:String,
        Relationship:String,
        tel:String,
    },
    {
        collection: "Caregiver",
        timestamps: true,
    }
);

mongoose.model("Caregiver", CaregiverScehma);

//ข้อมูลการเจ็บป่วย
const MedicalInformationSchema = new mongoose.Schema(
    {
        HN: String,
        AN: String,
        Date_Admit: Date,
        Date_DC: Date,
        Diagnosis: Date,
        Chief_complaint: String,
        Present_illness: String,
        // filePresent_illness: String,
        Phychosocial_assessment: String,
        // filePhychosocial_assessment: String,
        Management_plan: String,
        // fileManagement_plan: String,
        fileM:String,
        fileP:String,
        filePhy:String,
        
        user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        // equipment: { type: mongoose.Schema.Types.ObjectId, ref: "Equipment" },
        // personnel: { type: mongoose.Schema.Types.ObjectId, ref: "MPersonnel" },
    },
    {
        collection: "MedicalInformation",
        timestamps: true,
    }
);
mongoose.model("MedicalInformation", MedicalInformationSchema);