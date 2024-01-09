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



const UserDetailsScehma1 = new mongoose.Schema(
    {
        equipment_name:String,
        equipment_type:String
    },
    {
        collection: "Equipment",
    }
);

mongoose.model("Equipment",UserDetailsScehma1);