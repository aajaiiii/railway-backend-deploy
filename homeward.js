// create colletion กับ Document
const mongoose = require("mongoose");


const UserDetailsScehma = new mongoose.Schema(
    {
        username:{type:String, unique:true},
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

// const equipmentScehma = new mongoose.Schema(
//     {
//         equipment_name:String,
//         equipment_type:String,
//         admin:[{type: mongoose.Schema.Types.ObjectId,ref:'Admin'}]

//     },
//     {
//         collection: "Equipment",
//     }
// );

// mongoose.model("Equipment",equipmentScehma);