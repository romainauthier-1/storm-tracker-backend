const mongoose = require("mongoose");

const connectionString =
	"mongodb+srv://dankysten:l41pPY3U9tfCccRI@cluster0.d0p7dam.mongodb.net/storm-tracker";
mongoose
	.connect(connectionString, { connectTimeoutMS: 2000 })
	.then(() => console.log("✅ [MongoDB] Database Connected"))
	.catch((error) => console.error(error));
