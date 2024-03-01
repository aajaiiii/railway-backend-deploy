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
        admin:[{type: mongoose.Schema.Types.ObjectId,ref:'Admin'}]

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